import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const fallbackApiBaseUrl = "https://api.shadowedgeai.com";

function getBackendApiBaseUrl() {
  const value = process.env.NEXT_PUBLIC_API_BASE_URL || fallbackApiBaseUrl;
  return value.replace(/\/$/, "");
}

function getInternalRequestOrigin() {
  return (process.env.INTERNAL_REQUEST_ORIGIN || "https://app.shadowedgeai.com").replace(/\/$/, "");
}

export async function POST(request: Request) {
  const siteKey = process.env.INTERNAL_VIDEO_SITE_KEY || "";

  if (!siteKey) {
    return NextResponse.json(
      {
        ok: false,
        code: "INTERNAL_SITE_KEY_MISSING",
        error: "Reverse analyze API is not configured.",
      },
      { status: 503 },
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

    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        code: "REVERSE_ANALYZE_PROXY_FAILED",
        error: error instanceof Error ? error.message : "Reverse analyze API is unavailable.",
      },
      { status: 502 },
    );
  }
}
