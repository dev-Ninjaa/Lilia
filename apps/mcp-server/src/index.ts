import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { ApiError } from "./client.ts";
import { config } from "./config.ts";
import {
  evaluateTransaction,
  getAgent,
  getPolicy,
  getTransactionStatus,
  prepareTransfer,
  requestAuthorization,
  simulateTransfer,
} from "./tools.ts";

const server = new McpServer({
  name: "lilia",
  version: "0.1.0",
});

function textResult(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

function errorResult(error: unknown) {
  const message =
    error instanceof ApiError
      ? `${error.code} (${error.status}): ${error.message}`
      : error instanceof Error
        ? error.message
        : "Unexpected error.";
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  };
}

server.registerTool(
  "evaluate_transaction",
  {
    description:
      "Evaluate a proposed token transfer against owner policy rules and risk heuristics. Returns an assessment with decision (approved/rejected), risk score, and rule reasons. Off-chain only; no permit is issued.",
    inputSchema: {
      agentId: z.string().uuid().describe("Lilia agent UUID"),
      policyId: z
        .string()
        .uuid()
        .optional()
        .describe("Policy UUID; defaults to the agent's active policy"),
      recipient: z.string().describe("Destination address"),
      mint: z.string().describe("Token-2022 mint address"),
      amount: z.string().describe('Decimal amount, e.g. "100"'),
    },
  },
  async (args) => {
    try {
      return textResult(await evaluateTransaction(args));
    } catch (error) {
      return errorResult(error);
    }
  },
);

server.registerTool(
  "request_authorization",
  {
    description:
      'Request a cryptographically signed Ed25519 authorization permit for an approved assessment. Version "1" returns the legacy JSON permit; version "2" returns a canonical Permit v2 with sequence and expiry slot.',
    inputSchema: {
      assessmentId: z.string().uuid().describe("Assessment UUID returned by evaluate_transaction"),
      version: z.enum(["1", "2"]).default("1").describe("Permit version"),
      expiresInSlots: z
        .number()
        .int()
        .min(1)
        .max(10000)
        .optional()
        .describe("Permit v2 TTL in slots"),
    },
  },
  async (args) => {
    try {
      return textResult(await requestAuthorization(args));
    } catch (error) {
      return errorResult(error);
    }
  },
);

server.registerTool(
  "prepare_transfer",
  {
    description:
      'Construct the transaction intent for an issued permit. Version "1" returns a backend intent; version "2" builds the unsigned Token-2022 wire transaction (base64) ready for the transfer authority to sign.',
    inputSchema: {
      permitId: z.string().uuid().describe("Permit UUID"),
      sender: z.string().describe("Sender / transfer authority address"),
      recipient: z.string().describe("Recipient address"),
      mint: z.string().describe("Token-2022 mint address"),
      amount: z.string().describe('Decimal amount, e.g. "100"'),
      version: z.enum(["1", "2"]).default("1").describe("Permit flow version"),
    },
  },
  async (args) => {
    try {
      return textResult(await prepareTransfer(args));
    } catch (error) {
      return errorResult(error);
    }
  },
);

server.registerTool(
  "simulate_transfer",
  {
    description:
      "Run a hypothetical (off-chain) simulation of a transfer against the agent's policy. Returns the sentinel decision and reasons. No on-chain execution is performed.",
    inputSchema: {
      agentId: z.string().uuid().describe("Lilia agent UUID"),
      policyId: z.string().uuid().describe("Policy UUID (required for simulation)"),
      recipient: z.string().describe("Destination address"),
      mint: z.string().describe("Token-2022 mint address"),
      amount: z.string().describe('Decimal amount, e.g. "100"'),
    },
  },
  async (args) => {
    try {
      return textResult(await simulateTransfer(args));
    } catch (error) {
      return errorResult(error);
    }
  },
);

server.registerTool(
  "get_transaction_status",
  {
    description:
      "Retrieve the recorded status of a transaction by its Solana signature, including slot and confirmation state.",
    inputSchema: {
      signature: z.string().min(32).max(100).describe("Solana transaction signature (base58)"),
    },
  },
  async (args) => {
    try {
      return textResult(await getTransactionStatus(args.signature));
    } catch (error) {
      return errorResult(error);
    }
  },
);

server.registerTool(
  "get_agent",
  {
    description: "Retrieve a registered agent's identity, status, keys, and assigned policies.",
    inputSchema: {
      agentId: z.string().uuid().describe("Lilia agent UUID"),
    },
  },
  async (args) => {
    try {
      return textResult(await getAgent(args.agentId));
    } catch (error) {
      return errorResult(error);
    }
  },
);

server.registerTool(
  "get_policy",
  {
    description:
      "Inspect a policy's spending limits, allow/block recipient lists, mint allowlist, and on-chain state.",
    inputSchema: {
      policyId: z.string().uuid().describe("Policy UUID"),
    },
  },
  async (args) => {
    try {
      return textResult(await getPolicy(args.policyId));
    } catch (error) {
      return errorResult(error);
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`[lilia-mcp] ready · api ${config.apiBaseUrl} · network ${config.solanaNetwork}`);
