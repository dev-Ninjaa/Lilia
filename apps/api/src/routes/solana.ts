import { parseInput, sendSuccess } from "@lilia/api/middleware/error-handler.ts";
import { SolanaAdminService } from "@lilia/core/solana/admin.service.ts";
import { sentinelInitializeSchema, sentinelRotateSchema } from "@lilia/schemas/index.ts";
import type { FastifyPluginAsync } from "fastify";

const routes: FastifyPluginAsync = async (app) => {
  const service = new SolanaAdminService(app.db);

  app.get("/api/solana/status", async (request, reply) =>
    sendSuccess(reply, request, await service.status()),
  );

  app.post("/api/solana/sentinel/initialize", async (request, reply) => {
    const { publicKey } = parseInput(sentinelInitializeSchema, request.body);
    return sendSuccess(reply, request, await service.initializeSentinel(publicKey), 201);
  });

  app.post("/api/solana/sentinel/rotate", async (request, reply) => {
    const { newPublicKey } = parseInput(sentinelRotateSchema, request.body);
    return sendSuccess(reply, request, await service.rotateSentinel(newPublicKey));
  });
};

export default routes;
