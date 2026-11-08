import { type NextRequest, NextResponse } from "next/server";

// shortcut: single shared Basic-auth login, upgrade to per-user auth + roles when more than one operator exists.
export function proxy(request: NextRequest) {
  const password = process.env.CONSOLE_PASSWORD;
  if (!password) {
    if (process.env.NODE_ENV !== "production") return NextResponse.next();
    return new NextResponse("Console login is not configured.", { status: 503 });
  }

  const user = process.env.CONSOLE_USER ?? "admin";
  const header = request.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    const decoded = atob(header.slice(6));
    const split = decoded.indexOf(":");
    if (split > 0 && decoded.slice(0, split) === user && decoded.slice(split + 1) === password) {
      return NextResponse.next();
    }
  }
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "www-authenticate": 'Basic realm="Lilia console", charset="UTF-8"' },
  });
}

export const config = { matcher: ["/console/:path*", "/api/lilia/:path*"] };
