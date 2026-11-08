import { config } from "@lilia/mcp/config.ts";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

type Envelope<T> =
  | { success: true; data: T }
  | { success: false; error?: { code?: string; message?: string } };

export async function request<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(`${config.apiBaseUrl}/api${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const envelope = (await response.json()) as Envelope<T>;
  if (!response.ok || envelope.success === false) {
    const error = envelope.success === false ? envelope.error : undefined;
    throw new ApiError(
      response.status,
      error?.code ?? "API_ERROR",
      error?.message ?? `Request failed with status ${response.status}.`,
    );
  }
  return (envelope as { data: T }).data;
}
