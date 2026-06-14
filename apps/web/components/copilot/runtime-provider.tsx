"use client";

/**
 * Wires the copilot LocalRuntime: a `ChatModelAdapter` that talks to
 * `/api/chat`, wrapped in `AssistantRuntimeProvider`. The adapter owns its own
 * conversation-id state internally (seeded from `initialConversationId`, then
 * synced from the route's `X-Conversation-Id` header), so resuming a persisted
 * thread is just a different seed. Created once via a `useState` initializer.
 */
import { AssistantRuntimeProvider, useLocalRuntime } from "@assistant-ui/react";
import * as React from "react";
import { createCopilotAdapter } from "@/lib/agent/runtime";

export function CopilotRuntimeProvider({
  children,
  initialConversationId = null,
}: {
  children: React.ReactNode;
  initialConversationId?: string | null;
}) {
  const [adapter] = React.useState(() =>
    createCopilotAdapter(initialConversationId),
  );
  const runtime = useLocalRuntime(adapter);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
