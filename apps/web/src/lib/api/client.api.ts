/**
 * Low-level HTTP client for the Lilia Fastify API.
 *
 * All requests go through the server-side proxy at `/api/lilia/*`, which
 * injects the `LILIA_API_KEY` Bearer token. The key is never exposed to the
 * browser. The backend envelope is `{ success, data, meta }` on success and
 * `{ success: false, error: { code, message, details } }` on failure.
 */

export type ApiErrorBody = {
  code?: string;
  message?: string;
  details?: unknown;
};

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
  | { success: true; data: T; meta?: Record<string, unknown> }
  | { success: false; error?: ApiErrorBody };

export async function request<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/lilia${path}`, {
      method,
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Could not reach the Lilia API proxy.");
  }

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
