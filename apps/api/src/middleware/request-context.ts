import type { FastifyInstance } from "fastify";

export function installRequestContext(app: FastifyInstance) {
  app.addHook("onRequest", async (request, reply) => {
    reply.header("x-request-id", request.id);
  });
}
