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
import {
  type ChatStreamEvent,
  citationSource,
  encodeEvent,
  type MessagePart,
} from "@/lib/agent/protocol";
import { CLAUDE_TOOL_DEFS, TOOL_BY_NAME } from "@/lib/agent/tools";
import {
  appendAssistantMessage,
  appendUserMessage,
  ensureConversation,
} from "@/lib/agent/store";
import { FREE_DAILY_RUNS } from "@/lib/limits";
import {
  captureServer,
  captureServerException,
  distinctIdFrom,
  flushPostHog,
} from "@/lib/posthog/server";
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
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;
  try {
    supabase = await createClient();
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
    supabase = null;
  }

  // Distinct id for analytics: prefer the browser's forwarded PostHog id so
  // server events stitch to the same person, else the authenticated user id.
  const distinctId = distinctIdFrom(request, userId);

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

  // Free-tier daily quota. Paid users are never metered (we skip the RPC). The
  // RPC atomically checks + increments and only counts allowed runs, so doing
  // it here — before any model tokens are spent — both enforces the cap and
  // saves spend on the rejected turn. Failures fail OPEN (a metering hiccup
  // must never hard-block the agent); the cap is re-checked on the next turn.
  let runsRemaining: number | null = null;
  if (!isPaid && userId !== "anonymous" && supabase) {
    try {
      const { data, error } = await supabase.rpc("consume_agent_run", {
        p_limit: FREE_DAILY_RUNS,
      });
      // SECURITY DEFINER fn returns TABLE(...) => supabase-js yields an array.
      const row = Array.isArray(data) ? data[0] : data;
      if (!error && row) {
        runsRemaining = Math.max(0, FREE_DAILY_RUNS - (row.used ?? 0));
        if (row.allowed === false) {
          captureServer(distinctId, "copilot_quota_hit", {
            used: row.used ?? FREE_DAILY_RUNS,
            limit: FREE_DAILY_RUNS,
          });
          await flushPostHog();
          return NextResponse.json(
            {
              error: `You've used all ${FREE_DAILY_RUNS} free runs for today. Upgrade to Pro for unlimited copilot access.`,
              code: "quota_exceeded",
              limit: FREE_DAILY_RUNS,
              used: row.used ?? FREE_DAILY_RUNS,
            },
            { status: 429 },
          );
        }
      } else if (error) {
        console.error("[chat] consume_agent_run failed", error);
      }
    } catch (err) {
      console.error("[chat] quota check threw", err);
    }
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

  captureServer(distinctId, "copilot_run_started", { conversationId, isPaid });

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Ordered parts for persistence — text and widgets in production order so
      // a reloaded thread replays exactly as it streamed (interleaved).
      const parts: MessagePart[] = [];
      const appendTextDelta = (delta: string) => {
        const last = parts[parts.length - 1];
        if (last && last.kind === "text") {
          last.text += delta;
        } else {
          parts.push({ kind: "text", text: delta });
        }
      };

      const send = (ev: ChatStreamEvent) => {
        controller.enqueue(encoder.encode(encodeEvent(ev)));
      };

      // Track agent activity for the run_completed analytics event.
      let toolsCalled = 0;
      let turnsTaken = 0;

      try {
        for (let turn = 0; turn < MAX_TURNS; turn++) {
          turnsTaken = turn + 1;
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
            appendTextDelta(delta);
            send({ type: "text-delta", text: delta });
          });

          // Surface the model's reasoning as a live thought block (not persisted).
          mstream.on("thinking", (delta: string) => {
            if (delta) send({ type: "thinking-delta", text: delta });
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
            toolsCalled += 1;
            captureServer(distinctId, "copilot_tool_invoked", {
              toolName: tu.name,
              conversationId,
            });
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

            const fetchedAt = new Date().toISOString();
            send({
              type: "tool-result",
              toolCallId: tu.id,
              toolName: tu.name,
              args,
              result,
              isError,
              fetchedAt,
            });
            // Push as an ordered widget part (after any preamble text part),
            // carrying citation provenance for the "Data cited" footer.
            parts.push({
              kind: "widget",
              toolCallId: tu.id,
              toolName: tu.name,
              args,
              result,
              isError,
              source: citationSource(tu.name),
              fetchedAt,
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

        captureServer(distinctId, "copilot_run_completed", {
          conversationId,
          turns: turnsTaken,
          toolsCalled,
        });

        // Persist the assistant turn as ordered parts for faithful replay.
        await appendAssistantMessage(conversationId, parts);
      } catch (err) {
        captureServerException(distinctId, err, { route: "chat" });
        send({
          type: "error",
          message:
            err instanceof Error ? err.message : "The agent hit an error.",
        });
      } finally {
        // Flush analytics before the stream closes — serverless teardown can
        // otherwise drop in-flight events. Never block stream start on this.
        await flushPostHog();
        controller.close();
      }
    },
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Cache-Control": "no-store, no-transform",
    "X-Conversation-Id": conversationId,
  };
  // Let the client surface "N of 3 free runs left today" without a round-trip.
  if (runsRemaining !== null) {
    headers["X-Runs-Remaining"] = String(runsRemaining);
  }

  return new Response(stream, { headers });
}
