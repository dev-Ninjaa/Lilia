import type { FastifyPluginAsync } from "fastify";
import { AgentService } from "../../../../packages/core/src/agent/agent.service.ts";
import {
  agentIdParams,
  agentListQuery,
  createAgentSchema,
  updateAgentSchema,
} from "../../../../packages/schemas/src/index.ts";
import { parseInput, sendPage, sendSuccess } from "../middleware/error-handler.ts";

const routes: FastifyPluginAsync = async (app) => {
  const service = new AgentService(app.db);

  app.post("/api/agents/register", async (request, reply) => {
    const body = parseInput(createAgentSchema, request.body);
    const agent = await service.create(request.ownerId, body);
    return sendSuccess(reply, request, agent, 201);
  });

  app.get("/api/agents", async (request, reply) => {
    const query = parseInput(agentListQuery, request.query);
    const result = await service.list(request.ownerId, query.page, query.limit, query.status);
    return sendPage(reply, request, result, query.page, query.limit);
  });

  app.get("/api/agents/:agentId", async (request, reply) => {
    const { agentId } = parseInput(agentIdParams, request.params);
    return sendSuccess(reply, request, await service.get(request.ownerId, agentId));
  });

  app.post("/api/agents/:agentId/disable", async (request, reply) => {
    const { agentId } = parseInput(agentIdParams, request.params);
    const agent = await service.disable(request.ownerId, agentId);
    return sendSuccess(reply, request, { id: agent.id, status: agent.status });
  });

  app.patch("/api/agents/:agentId", async (request, reply) => {
    const { agentId } = parseInput(agentIdParams, request.params);
    const body = parseInput(updateAgentSchema, request.body);
    return sendSuccess(reply, request, await service.update(request.ownerId, agentId, body));
  });
};

export default routes;
