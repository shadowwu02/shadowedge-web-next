export type ApiEnvelope<T> = {
  ok?: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
  correlationId?: string;
};

export type ApiRequestOptions = RequestInit & {
  token?: string;
  authRedirect?: boolean;
  authReplay?: boolean;
};

export type ApiErrorOptions = {
  status?: number;
  code?: string;
  correlationId?: string;
  payload?: unknown;
  kind?: "auth" | "credits" | "membership" | "maintenance" | "network" | "server" | "unknown";
};

export class ApiError extends Error {
  status?: number;
  code?: string;
  correlationId?: string;
  payload?: unknown;
  kind?: "auth" | "credits" | "membership" | "maintenance" | "network" | "server" | "unknown";

  constructor(message: string, options: ApiErrorOptions = {}) {
    super(message || "ShadowEdge API request failed");
    this.name = "ApiError";
    this.status = options.status;
    this.code = options.code;
    this.correlationId = options.correlationId;
    this.payload = options.payload;
    this.kind = options.kind;
  }
}
