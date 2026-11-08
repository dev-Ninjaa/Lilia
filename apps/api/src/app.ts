import Fastify from "fastify";
import { validateSigningConfiguration } from "../../../packages/core/src/authorization/signing.service.ts";
import { env } from "./config/env.ts";
import { authenticate } from "./middleware/authentication.ts";
import { installErrorHandler } from "./middleware/error-handler.ts";
import { installRequestContext } from "./middleware/request-context.ts";
import databasePlugin from "./plugins/database.ts";
import securityPlugin from "./plugins/security.ts";
import agentsRoutes from "./routes/agents.ts";
import integrationsRoutes from "./routes/integrations.ts";
import policiesRoutes from "./routes/policies.ts";
import securityRoutes from "./routes/security.ts";
import sentinelRoutes from "./routes/sentinel.ts";
import simulationRoutes from "./routes/simulation.ts";
import solanaRoutes from "./routes/solana.ts";
import transactionsRoutes from "./routes/transactions.ts";

export async function buildApp() {
  validateSigningConfiguration();
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "production" ? "info" : "debug",
      redact: [
        "req.headers.authorization",
        "headers.authorization",
        "LILIA_API_KEY",
        "LILIA_SIGNING_PRIVATE_KEY",
      ],
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
