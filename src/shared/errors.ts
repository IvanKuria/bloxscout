/**
 * Domain error type for Bloxscout. Carries a stable string `code` that
 * callers (CLI formatter, MCP error mapper) can switch on without parsing
 * the message.
 */
export class BloxscoutError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "BloxscoutError";
    this.code = code;
  }
}

/**
 * Map a thrown value to an MCP-friendly error payload.
 *
 * TODO(Phase 2): once tools are registered, return a typed McpError using
 * the SDK's error helpers and translate `BloxscoutError.code` into the
 * appropriate JSON-RPC error code.
 */
export function mapToMcpError(err: unknown): { code: string; message: string } {
  if (err instanceof BloxscoutError) {
    return { code: err.code, message: err.message };
  }
  if (err instanceof Error) {
    return { code: "INTERNAL_ERROR", message: err.message };
  }
  return { code: "INTERNAL_ERROR", message: String(err) };
}
