export type ApiEnvelope<T> = {
  ok?: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
};

export type ApiRequestOptions = RequestInit & {
  token?: string;
  authRedirect?: boolean;
};

export type ApiErrorOptions = {
  status?: number;
  code?: string;
  payload?: unknown;
  kind?: "auth" | "credits" | "network" | "server" | "unknown";
};

export class ApiError extends Error {
  status?: number;
  code?: string;
  payload?: unknown;
  kind?: "auth" | "credits" | "network" | "server" | "unknown";

  constructor(message: string, options: ApiErrorOptions = {}) {
    super(message || "ShadowEdge API request failed");
    this.name = "ApiError";
    this.status = options.status;
    this.code = options.code;
    this.payload = options.payload;
    this.kind = options.kind;
  }
}
