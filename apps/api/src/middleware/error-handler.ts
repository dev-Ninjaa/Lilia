import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details: unknown = [],
  ) {
    super(message);
  }
}

export function parseInput<T>(schema: { parse: (value: unknown) => T }, value: unknown): T {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid request", error.issues);
    }
    throw error;
  }
}

export function sendSuccess(
  reply: FastifyReply,
  request: FastifyRequest,
  data: unknown,
  statusCode = 200,
  extraMeta: Record<string, unknown> = {},
) {
  return reply.code(statusCode).send({
    success: true,
    data,
    meta: { requestId: request.id, timestamp: new Date().toISOString(), ...extraMeta },
  });
}

export function sendPage(
  reply: FastifyReply,
  request: FastifyRequest,
  result: { items: unknown[]; total: number },
  page: number,
  limit: number,
) {
  return sendSuccess(reply, request, result.items, 200, {
    pagination: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) },
  });
}

export function installErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, request, reply) => {
    const known = error instanceof AppError ? error : undefined;
    const fastifyStatusCode =
      error instanceof Error && "statusCode" in error && typeof error.statusCode === "number"
        ? error.statusCode
        : undefined;
    const clientError =
      !known &&
      fastifyStatusCode !== undefined &&
      fastifyStatusCode >= 400 &&
      fastifyStatusCode < 500;
    const statusCode = known?.statusCode ?? (clientError ? fastifyStatusCode : 500);
    if (!known && !clientError) request.log.error({ err: error }, "Unhandled request error");
    const code = known?.code ?? (clientError ? "VALIDATION_ERROR" : "INTERNAL_SERVER_ERROR");
    return reply.code(statusCode).send({
      success: false,
      error: {
        code,
        message:
          known?.message ?? (clientError ? "Invalid request" : "An unexpected error occurred"),
        details: known?.details ?? [],
      },
      meta: { requestId: request.id, timestamp: new Date().toISOString() },
    });
  });
}
