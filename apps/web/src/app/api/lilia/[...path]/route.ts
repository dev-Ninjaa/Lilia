import { NextResponse } from "next/server";

const API_BASE = process.env.LILIA_API_BASE_URL ?? "http://127.0.0.1:4000";

type ProxyContext = { params: Promise<{ path: string[] }> };

async function handle(request: Request, ctx: ProxyContext): Promise<Response> {
  const apiKey = process.env.LILIA_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "API_NOT_CONFIGURED",
          message: "LILIA_API_KEY is not configured for the Next.js server.",
        },
      },
      { status: 503 },
    );
  }

  const { path } = await ctx.params;
  const incoming = new URL(request.url);
  const upstream = new URL(`/api/${path.join("/")}${incoming.search}`, API_BASE);

  const method = request.method.toUpperCase();
  const headers: Record<string, string> = {
    authorization: `Bearer ${apiKey}`,
    "content-type": "application/json",
  };

  const init: RequestInit = {
    method,
    headers,
    cache: "no-store",
  };

  if (method !== "GET" && method !== "HEAD") {
    const body = await request.text();
    if (body.length > 0) init.body = body;
  }

  try {
    const response = await fetch(upstream, init);
    return response;
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UPSTREAM_UNREACHABLE",
          message: `Lilia API is not reachable at ${API_BASE}.`,
        },
      },
      { status: 502 },
    );
  }
}

export { handle as GET, handle as POST, handle as PATCH, handle as PUT, handle as DELETE };
