import type { FastifyPluginAsync } from "fastify";
import { APP_VERSION } from "../config/constants.ts";
import { env } from "../config/env.ts";
import { sendSuccess } from "../middleware/error-handler.ts";

const routes: FastifyPluginAsync = async (app) => {
  app.get("/api/integrations", async (request, reply) =>
    sendSuccess(reply, request, {
      solanaRpc: {
        status: "not_configured",
        endpointConfigured: Boolean(env.SOLANA_RPC_URL),
        note: "No RPC adapter or transaction submission is implemented.",
      },
      gemini: { status: env.GEMINI_API_KEY ? "configured_but_unused" : "not_configured" },
      mcp: { status: "not_implemented" },
      database: { status: "connected" },
    }),
  );
  app.get("/api/integrations/solana/status", async (request, reply) =>
    sendSuccess(reply, request, {
      status: "not_configured",
      endpointConfigured: Boolean(env.SOLANA_RPC_URL),
      rpcHealthChecked: false,
    }),
  );
  app.get("/api/integrations/mcp/status", async (request, reply) =>
    sendSuccess(reply, request, { status: "not_implemented" }),
  );
  app.get("/api/health", async (request, reply) => {
    let database = "connected";
    let statusCode = 200;
    try {
      app.sqlite.query("SELECT 1").get();
    } catch {
      database = "unavailable";
      statusCode = 503;
    }
    return sendSuccess(
      reply,
      request,
      {
        status: database === "connected" ? "ok" : "degraded",
        version: APP_VERSION,
        uptimeSeconds: Math.floor(process.uptime()),
        database,
        timestamp: new Date().toISOString(),
      },
      statusCode,
    );
  });
};
export default routes;
