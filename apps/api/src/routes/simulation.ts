import { parseInput, sendPage, sendSuccess } from "@lilia/api/middleware/error-handler.ts";
import { SimulationService } from "@lilia/core/simulation/simulation.service.ts";
import { simulationSchema } from "@lilia/schemas/index.ts";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  agentId: z.string().uuid().optional(),
});

const routes: FastifyPluginAsync = async (app) => {
  const service = new SimulationService(app.db);
  app.post("/api/simulation/run", async (request, reply) => {
    const body = parseInput(simulationSchema, request.body);
    return sendSuccess(reply, request, await service.run(request.ownerId, body), 201);
  });

  app.get("/api/simulation/events", async (request, reply) => {
    const query = parseInput(querySchema, request.query);
    const result = await service.list(request.ownerId, query.page, query.limit, query.agentId);
    return sendPage(reply, request, result, query.page, query.limit);
  });
};

export default routes;
