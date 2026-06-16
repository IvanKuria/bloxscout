/**
 * Stable error codes used across the package. Switch on these in the CLI
 * formatter and the MCP error mapper instead of parsing `Error.message`.
 */
export type BloxscoutErrorCode =
  | "INTERNAL_ERROR"
  | "ROBLOX_API_ERROR"
  | "ROBLOX_NOT_FOUND"
  | "ROBLOX_RATE_LIMITED"
  | "ROBLOX_BAD_REQUEST"
  | "STEAM_API_ERROR"
  | "VALIDATION_ERROR"
  | "NOT_IMPLEMENTED";

/**
 * Base domain error for Bloxscout. Carries a stable string `code` that
 * callers (CLI formatter, MCP error mapper) can switch on without parsing
 * the message.
 */
export class BloxscoutError extends Error {
  public readonly code: BloxscoutErrorCode;

  constructor(message: string, code: BloxscoutErrorCode = "INTERNAL_ERROR") {
    super(message);
    this.name = "BloxscoutError";
    this.code = code;
  }
}

/**
 * Generic non-2xx response from a Roblox public endpoint. Use the more
 * specific subclasses (`RobloxNotFoundError`, `RobloxRateLimitError`) when
 * applicable so callers can handle them with `instanceof`.
 */
export class RobloxApiError extends BloxscoutError {
  public readonly statusCode: number;
  public readonly endpoint: string;
  public readonly body: string | undefined;

  constructor(
    message: string,
    init: { statusCode: number; endpoint: string; body?: string; code?: BloxscoutErrorCode },
  ) {
    super(message, init.code ?? "ROBLOX_API_ERROR");
    this.name = "RobloxApiError";
    this.statusCode = init.statusCode;
    this.endpoint = init.endpoint;
    this.body = init.body;
  }
}

/** Generic non-2xx (or network) failure from a Steam public endpoint. */
export class SteamApiError extends BloxscoutError {
  public readonly statusCode: number;
  public readonly endpoint: string;
  public readonly body: string | undefined;

  constructor(message: string, init: { statusCode: number; endpoint: string; body?: string }) {
    super(message, "STEAM_API_ERROR");
    this.name = "SteamApiError";
    this.statusCode = init.statusCode;
    this.endpoint = init.endpoint;
    this.body = init.body;
  }
}

/** Roblox returned 429. `retryAfterSeconds` is parsed from the `Retry-After` header when present. */
export class RobloxRateLimitError extends RobloxApiError {
  public readonly retryAfterSeconds: number | undefined;

  constructor(
    message: string,
    init: { endpoint: string; body?: string; retryAfterSeconds?: number },
  ) {
    super(message, {
      statusCode: 429,
      endpoint: init.endpoint,
      body: init.body,
      code: "ROBLOX_RATE_LIMITED",
    });
    this.name = "RobloxRateLimitError";
    this.retryAfterSeconds = init.retryAfterSeconds;
  }
}

/** Roblox returned 404 (or a 4xx that semantically means "no such resource"). */
export class RobloxNotFoundError extends RobloxApiError {
  constructor(message: string, init: { endpoint: string; body?: string; statusCode?: number }) {
    super(message, {
      statusCode: init.statusCode ?? 404,
      endpoint: init.endpoint,
      body: init.body,
      code: "ROBLOX_NOT_FOUND",
    });
    this.name = "RobloxNotFoundError";
  }
}

/**
 * MCP-friendly error payload. Phase 2 will wrap this in the SDK's `McpError`
 * type and map `code` onto a JSON-RPC error code; for now we keep the shape
 * minimal and stable so the rest of the codebase can already produce it.
 */
export interface McpErrorPayload {
  code: BloxscoutErrorCode;
  message: string;
  data?: Record<string, unknown>;
}

/** Convert any thrown value into an MCP-friendly error payload. */
export function mapToMcpError(err: unknown): McpErrorPayload {
  if (err instanceof RobloxApiError) {
    return {
      code: err.code,
      message: err.message,
      data: {
        statusCode: err.statusCode,
        endpoint: err.endpoint,
        ...(err instanceof RobloxRateLimitError && err.retryAfterSeconds !== undefined
          ? { retryAfterSeconds: err.retryAfterSeconds }
          : {}),
      },
    };
  }
  if (err instanceof BloxscoutError) {
    return { code: err.code, message: err.message };
  }
  if (err instanceof Error) {
    return { code: "INTERNAL_ERROR", message: err.message };
  }
  return { code: "INTERNAL_ERROR", message: String(err) };
}
