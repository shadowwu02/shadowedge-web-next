import { NextResponse } from "next/server";
import { getReverseAnalyzeProxyReadinessFromEnv } from "@/lib/server/reverseAnalyzeProxyReadiness";

export const dynamic = "force-dynamic";

const fallbackApiBaseUrl = "https://api.shadowedgeai.com";

function getBackendApiBaseUrl() {
  const value = process.env.NEXT_PUBLIC_API_BASE_URL || fallbackApiBaseUrl;
  return value.replace(/\/$/, "");
}

function getInternalRequestOrigin() {
  return (process.env.INTERNAL_REQUEST_ORIGIN || "https://app.shadowedgeai.com").replace(/\/$/, "");
}

function getBearerAuthorization(request: Request) {
  const value = request.headers.get("authorization") || "";
  return /^Bearer\s+\S+/i.test(value) ? value : "";
}

function getCorrelationId(request: Request) {
  const supplied = (request.headers.get("x-correlation-id") || "").trim().slice(0, 160);
  return supplied && /^[a-zA-Z0-9._:-]+$/.test(supplied)
    ? supplied
    : globalThis.crypto.randomUUID();
}

export async function GET() {
  const readiness = getReverseAnalyzeProxyReadinessFromEnv();
  return NextResponse.json(
    { ok: readiness.ready, data: readiness, code: readiness.code || undefined },
    { status: readiness.ready ? 200 : 503 },
  );
}

async function validateUserAuthorization(authorization: string) {
  try {
    const response = await fetch(`${getBackendApiBaseUrl()}/api/auth/me`, {
      method: "GET",
      headers: {
        Authorization: authorization,
      },
      cache: "no-store",
    });

    if (!response.ok) return false;

    const payload = await response.json().catch(() => null);
    return Boolean(payload && typeof payload === "object" && (payload as { ok?: unknown }).ok === true);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const authorization = getBearerAuthorization(request);
  const correlationId = getCorrelationId(request);

  if (!authorization) {
    return NextResponse.json(
      {
        ok: false,
        code: "UNAUTHORIZED",
        error: "Authentication is required.",
      },
      { status: 401, headers: { "X-Correlation-Id": correlationId } },
    );
  }

  const isAuthorized = await validateUserAuthorization(authorization);

  if (!isAuthorized) {
    return NextResponse.json(
      {
        ok: false,
        code: "UNAUTHORIZED",
        error: "Authentication is required.",
      },
      { status: 401, headers: { "X-Correlation-Id": correlationId } },
    );
  }

  const readiness = getReverseAnalyzeProxyReadinessFromEnv();
  const siteKey = process.env.INTERNAL_VIDEO_SITE_KEY || "";

  if (!readiness.ready || !siteKey) {
    return NextResponse.json(
      {
        ok: false,
        code: "INTERNAL_SITE_KEY_MISSING",
        error: "Reverse analyze API is not configured.",
      },
      { status: 503, headers: { "X-Correlation-Id": correlationId } },
    );
  }

  const body = await request.json().catch(() => ({}));
  const origin = getInternalRequestOrigin();

  try {
    const response = await fetch(`${getBackendApiBaseUrl()}/api/internal/video/reverse-analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
        Referer: `${origin}/workspace/video`,
        "x-shadowedge-client": "shadowedge-web",
        "x-shadowedge-site": "video",
        "x-shadowedge-site-key": siteKey,
        "X-Correlation-Id": correlationId,
        Authorization: authorization,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const text = await response.text();
    let payload: unknown = null;

    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = {
        ok: false,
        error: text || "Reverse analyze API returned an invalid response.",
      };
    }

    return NextResponse.json(payload, {
      status: response.status,
      headers: { "X-Correlation-Id": response.headers.get("x-correlation-id") || correlationId },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        code: "REVERSE_ANALYZE_PROXY_FAILED",
        error: error instanceof Error ? error.message : "Reverse analyze API is unavailable.",
        correlationId,
      },
      { status: 502, headers: { "X-Correlation-Id": correlationId } },
    );
  }
}
