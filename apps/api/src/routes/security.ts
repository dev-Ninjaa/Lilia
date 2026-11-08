import { parseInput, sendPage, sendSuccess } from "@lilia/api/middleware/error-handler.ts";
import { EventService } from "@lilia/core/events/event.service.ts";
import { SecurityService } from "@lilia/core/security/security.service.ts";
import {
  agentEventsQuery,
  eventIdParams,
  securityAgentParams,
  securityQuery,
} from "@lilia/schemas/index.ts";
import type { FastifyPluginAsync } from "fastify";

const routes: FastifyPluginAsync = async (app) => {
  const events = new EventService(app.db);
  const service = new SecurityService(app.db);
  app.get("/api/security/events", async (request, reply) => {
    const query = parseInput(securityQuery, request.query);
    const result = await events.listOwned(request.ownerId, query);
    return sendPage(reply, request, result, query.page, query.limit);
  });
  app.get("/api/security/events/:eventId", async (request, reply) => {
    const { eventId } = parseInput(eventIdParams, request.params);
    return sendSuccess(reply, request, await events.getOwned(request.ownerId, eventId));
  });
  app.get("/api/security/overview", async (request, reply) =>
    sendSuccess(reply, request, await service.overview(request.ownerId)),
  );
  app.get("/api/security/agents/:agentId/events", async (request, reply) => {
    const { agentId } = parseInput(securityAgentParams, request.params);
    const query = parseInput(agentEventsQuery, request.query);
    const result = await events.agentEvents(request.ownerId, agentId, query.page, query.limit);
    return sendPage(reply, request, result, query.page, query.limit);
  });
};
export default routes;
