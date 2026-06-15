/**
 * POST /api/chat — the copilot agent loop.
 *
 * Runs the Anthropic SDK with tool-use + streaming. The tools are the copilot
 * tool registry (`lib/agent/tools.ts`), which wraps the hosted-data readers.
 * The loop: feed the conversation to Claude → stream prose deltas → when Claude
 * calls a tool, execute it server-side and stream the result → feed results
 * back → repeat until `end_turn`. The response body is the NDJSON protocol in
 * `lib/agent/protocol.ts`, which the client LocalRuntime adapter parses into
 * inline widgets.
 *
 * Guards:
 *   - No ANTHROPIC_API_KEY → 503 (so `next build` never needs it).
 *   - Auth re-checked here (defense in depth; the proxy gates /app, /api).
 *   - Persistence is best-effort: missing Supabase env never breaks the chat.
 */
import { type NextRequest, NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import {
  COPILOT_MODEL,
  getAnthropic,
  isCopilotConfigured,
  SYSTEM_PROMPT,
} from "@/lib/agent/anthropic";
import { type ChatStreamEvent, encodeEvent } from "@/lib/agent/protocol";
import { CLAUDE_TOOL_DEFS, TOOL_BY_NAME } from "@/lib/agent/tools";
import {
  appendAssistantMessage,
  appendUserMessage,
  ensureConversation,
} from "@/lib/agent/store";
import { getEntitlement } from "@/lib/supabase/account";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Max agent loop turns — bounds runaway tool-calling. */
const MAX_TURNS = 6;

/** Tools gated to paid tiers (vision spends model tokens per call). */
const PAID_TOOLS = new Set(["analyze_icon"]);

interface ChatRequestBody {
  conversationId?: string | null;
  /** The new user message (plain text). */
  message: string;
  /** Prior turns for context (the client owns thread state). */
  history?: Array<{ role: "user" | "assistant"; text: string }>;
}

export async function POST(request: NextRequest) {
  if (!isCopilotConfigured()) {
    return NextResponse.json(
      { error: "The agent is not configured (missing ANTHROPIC_API_KEY)." },
      { status: 503 },
    );
  }

  // Require an authenticated user (defense in depth).
  let userId: string;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }
    userId = user.id;
  } catch {
    // Auth not configured on this deployment — still allow chat to function so
    // the spine is demoable; persistence below will simply no-op.
    userId = "anonymous";
  }

  // Resolve the tier once so we can gate paid tools (e.g. vision). Best-effort:
  // any failure (incl. anonymous/no-Supabase) falls back to the free tier.
  let isPaid = false;
  try {
    if (userId !== "anonymous") {
      const { tier } = await getEntitlement(userId);
      isPaid = tier !== "free";
    }
  } catch {
    isPaid = false;
  }

  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const userText = (body.message ?? "").trim();
  if (!userText) {
    return NextResponse.json({ error: "Empty message." }, { status: 400 });
  }

  const client = getAnthropic();
  if (!client) {
    return NextResponse.json(
      { error: "The agent is not configured." },
      { status: 503 },
    );
  }

  // Build the Anthropic message history from the client-supplied turns + the
  // new user message. We keep it text-only on the way in; tool-call/result
  // blocks accumulate within this single loop.
  const messages: Anthropic.MessageParam[] = [];
  for (const turn of body.history ?? []) {
    const text = (turn.text ?? "").trim();
    if (!text) continue;
    messages.push({ role: turn.role, content: text });
  }
  messages.push({ role: "user", content: userText });

  // Persist: ensure a conversation row + the user message (best-effort).
  const conversationId = await ensureConversation(
    userId,
    body.conversationId ?? null,
    userText,
  );
  await appendUserMessage(conversationId, userText);

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Accumulators for persistence of the assistant turn.
      let assistantText = "";
      const widgetPayloads: Array<{
        toolCallId: string;
        toolName: string;
        args: unknown;
        result: unknown;
        isError?: boolean;
      }> = [];

      const send = (ev: ChatStreamEvent) => {
        controller.enqueue(encoder.encode(encodeEvent(ev)));
      };

      try {
        for (let turn = 0; turn < MAX_TURNS; turn++) {
          // Stream one model response. Adaptive thinking per claude-api skill.
          const mstream = client.messages.stream({
            model: COPILOT_MODEL,
            max_tokens: 8000,
            thinking: { type: "adaptive" },
            system: SYSTEM_PROMPT,
            tools: CLAUDE_TOOL_DEFS,
            messages,
          });

          mstream.on("text", (delta: string) => {
            assistantText += delta;
            send({ type: "text-delta", text: delta });
          });

          const final = await mstream.finalMessage();

          // Collect tool calls from this turn.
          const toolUses = final.content.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
          );

          if (final.stop_reason !== "tool_use" || toolUses.length === 0) {
            // Natural completion (end_turn / refusal / max_tokens).
            break;
          }

          // Append the assistant turn (with its tool_use blocks) verbatim.
          messages.push({ role: "assistant", content: final.content });

          // Execute each tool, stream call + result, feed results back.
          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const tu of toolUses) {
            const args = (tu.input ?? {}) as Record<string, unknown>;
            send({
              type: "tool-call",
              toolCallId: tu.id,
              toolName: tu.name,
              args,
            });

            const tool = TOOL_BY_NAME.get(tu.name);
            let result: unknown;
            let isError = false;
            if (!tool) {
              result = { ok: false, error: `Unknown tool: ${tu.name}` };
              isError = true;
            } else if (PAID_TOOLS.has(tu.name) && !isPaid) {
              // Paywall: don't spend model tokens for free-tier users. Return a
              // locked result the widget renders as an upsell, and which the
              // agent narrates honestly (system prompt covers this).
              result = {
                ok: false,
                locked: true,
                note: "Icon analysis uses vision and is available on the Pro plan.",
                universeId: null,
                name: null,
                iconUrl: null,
                traits: null,
                recommendations: [],
              };
            } else {
              try {
                result = await tool.execute(args);
              } catch (err) {
                result = {
                  ok: false,
                  error: err instanceof Error ? err.message : "Tool failed.",
                };
                isError = true;
              }
            }

            send({
              type: "tool-result",
              toolCallId: tu.id,
              toolName: tu.name,
              result,
              isError,
            });
            widgetPayloads.push({
              toolCallId: tu.id,
              toolName: tu.name,
              args,
              result,
              isError,
            });

            toolResults.push({
              type: "tool_result",
              tool_use_id: tu.id,
              content: JSON.stringify(result),
              is_error: isError,
            });
          }

          messages.push({ role: "user", content: toolResults });
          // Loop: Claude now narrates over the tool results.
        }

        send({ type: "done" });

        // Persist the assistant turn (text + widget payloads) for replay.
        await appendAssistantMessage(
          conversationId,
          assistantText,
          widgetPayloads,
        );
      } catch (err) {
        send({
          type: "error",
          message:
            err instanceof Error ? err.message : "The agent hit an error.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Conversation-Id": conversationId,
    },
  });
}
