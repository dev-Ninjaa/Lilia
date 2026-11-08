import { timingSafeEqual } from "node:crypto";
import { env } from "@lilia/api/config/env.ts";
import { AppError } from "@lilia/api/middleware/error-handler.ts";
import type { FastifyRequest } from "fastify";

export const OWNER_ID = "lilia-single-owner";

export async function authenticate(request: FastifyRequest) {
  const authorization = request.headers.authorization;
  const provided = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  const expectedBuffer = Buffer.from(env.LILIA_API_KEY);
  const providedBuffer = Buffer.from(provided);
  const valid =
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer);
  if (!valid) throw new AppError(401, "UNAUTHORIZED", "A valid Bearer API key is required");
  request.ownerId = OWNER_ID;
}

declare module "fastify" {
  interface FastifyRequest {
    ownerId: string;
  }
}
