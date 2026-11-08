import { env } from "@lilia/api/config/env.ts";
import { authenticate } from "@lilia/api/middleware/authentication.ts";
import { installErrorHandler } from "@lilia/api/middleware/error-handler.ts";
import { installRequestContext } from "@lilia/api/middleware/request-context.ts";
import databasePlugin from "@lilia/api/plugins/database.ts";
import securityPlugin from "@lilia/api/plugins/security.ts";
import agentsRoutes from "@lilia/api/routes/agents.ts";
import integrationsRoutes from "@lilia/api/routes/integrations.ts";
import policiesRoutes from "@lilia/api/routes/policies.ts";
import securityRoutes from "@lilia/api/routes/security.ts";
import sentinelRoutes from "@lilia/api/routes/sentinel.ts";
import simulationRoutes from "@lilia/api/routes/simulation.ts";
import solanaRoutes from "@lilia/api/routes/solana.ts";
import transactionsRoutes from "@lilia/api/routes/transactions.ts";
import { validateSigningConfiguration } from "@lilia/core/authorization/signing.service.ts";
import Fastify from "fastify";

export async function buildApp() {
  validateSigningConfiguration();
  const redact = [
    "req.headers.authorization",
    "headers.authorization",
    "LILIA_API_KEY",
    "LILIA_SIGNING_PRIVATE_KEY",
  ];
  const app = Fastify({
    logger:
      env.NODE_ENV === "production"
        ? { level: "info", redact }
        : {
            level: "info",
            transport: {
              target: "pino-pretty",
              options: {
                colorize: true,
                translateTime: "HH:MM:ss",
                ignore: "pid,hostname",
                singleLine: true,
              },
            },
            redact,
          },
    bodyLimit: 64 * 1024,
    trustProxy: false,
  });
  installErrorHandler(app);
  installRequestContext(app);
  await app.register(databasePlugin);
  await app.register(securityPlugin);
  app.addHook("preHandler", async (request) => {
    if (request.routeOptions.url !== "/api/health") await authenticate(request);
  });
  await app.register(agentsRoutes);
  await app.register(policiesRoutes);
  await app.register(sentinelRoutes);
  await app.register(transactionsRoutes);
  await app.register(simulationRoutes);
  await app.register(securityRoutes);
  await app.register(integrationsRoutes);
  await app.register(solanaRoutes);
  return app;
}
