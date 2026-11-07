import fp from "fastify-plugin";

export default fp(async (app) => {
  app.addHook("onSend", async (_request, reply, payload) => {
    reply.header("x-content-type-options", "nosniff");
    reply.header("cache-control", "no-store");
    return payload;
  });
});
