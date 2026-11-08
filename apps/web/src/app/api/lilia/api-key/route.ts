import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.LILIA_API_KEY;
  const apiUrl = process.env.LILIA_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "API_KEY_NOT_CONFIGURED",
          message: "LILIA_API_KEY is not configured",
        },
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      apiKey,
      apiUrl,
    },
  });
}
