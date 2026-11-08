import type { FastifyPluginAsync } from "fastify";
import { SolanaAdminService } from "../../../../packages/core/src/solana/admin.service.ts";
import {
  sentinelInitializeSchema,
  sentinelRotateSchema,
} from "../../../../packages/schemas/src/index.ts";
import { parseInput, sendSuccess } from "../middleware/error-handler.ts";

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
