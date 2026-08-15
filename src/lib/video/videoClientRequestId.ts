const PREFIX = "VIDEO_";
const SAFE_ID = /^[A-Za-z0-9:_-]{8,240}$/;

export function createVideoClientRequestId() {
  const uuid = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  return `${PREFIX}${uuid.replace(/[^A-Za-z0-9:_-]/g, "_")}`;
}

export function normalizeVideoClientRequestId(value: unknown) {
  const id = String(value || "").trim();
  return SAFE_ID.test(id) ? id : "";
}
