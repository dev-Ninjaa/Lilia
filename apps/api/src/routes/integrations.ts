import { APP_VERSION } from "@lilia/api/config/constants.ts";
import { env } from "@lilia/api/config/env.ts";
import { sendSuccess } from "@lilia/api/middleware/error-handler.ts";
import type { FastifyPluginAsync } from "fastify";

const MCP_TOOLS = [
  "evaluate_transaction",
  "request_authorization",
  "prepare_transfer",
  "simulate_transfer",
  "get_transaction_status",
  "get_agent",
  "get_policy",
];

const routes: FastifyPluginAsync = async (app) => {
  app.get("/api/integrations", async (request, reply) =>
    sendSuccess(reply, request, {
      solanaRpc: {
        status: env.SOLANA_RPC_URL ? "configured" : "not_configured",
        endpointConfigured: Boolean(env.SOLANA_RPC_URL),
        note: "Permit v2 and transfer submission are available when configured.",
      },
      gemini: { status: env.GEMINI_API_KEY ? "configured_but_unused" : "not_configured" },
      mcp: { status: "available", server: "@lilia/mcp", tools: MCP_TOOLS },
      database: { status: "connected" },
    }),
  );
  app.get("/api/integrations/solana/status", async (request, reply) =>
    sendSuccess(reply, request, {
      status: env.SOLANA_RPC_URL ? "configured" : "not_configured",
      endpointConfigured: Boolean(env.SOLANA_RPC_URL),
      programId: env.LILIA_PROGRAM_ID,
      commitment: env.SOLANA_RPC_COMMITMENT,
      rpcHealthChecked: false,
    }),
  );
  app.get("/api/integrations/mcp/status", async (request, reply) =>
    sendSuccess(reply, request, {
      status: "available",
      server: "@lilia/mcp",
      transport: "stdio",
      tools: MCP_TOOLS,
    }),
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
