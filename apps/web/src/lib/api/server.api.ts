import "server-only";

import type {
  BackendAgent,
  BackendEvent,
  BackendPolicy,
  BackendTransaction,
  SolanaStatus,
} from "@/lib/api";
import { mapAgent, mapPolicy, mapSecurityEvent, mapTransaction } from "@/lib/mappers";
import type { Agent, Policy, SecurityEvent, Transaction } from "@/lib/types";

/**
 * Server-only data layer. The API key is read from the server environment and
 * never shipped to the browser. Reads are uncached so every request reflects
 * live backend state.
 */

const API_BASE = process.env.LILIA_API_BASE_URL ?? "http://127.0.0.1:4000";
const API_KEY = process.env.LILIA_API_KEY ?? "";

async function serverRequest<T>(path: string): Promise<T> {
  if (!API_KEY) {
    throw new Error("LILIA_API_KEY is not configured for the Next.js server.");
  }
  const response = await fetch(`${API_BASE}/api${path}`, {
    headers: { authorization: `Bearer ${API_KEY}` },
    cache: "no-store",
  });
  const envelope = (await response.json()) as
    | { success: true; data: T }
    | { success: false; error?: { code?: string; message?: string } };
  if (!response.ok || envelope.success === false) {
    const error = envelope.success === false ? envelope.error : undefined;
    throw new Error(
      `${error?.code ?? "API_ERROR"}: ${error?.message ?? `Request failed (${response.status})`}`,
    );
  }
  return (envelope as { data: T }).data;
}

export type DashboardData = {
  agents: Agent[];
  policies: Policy[];
  transactions: Transaction[];
  events: SecurityEvent[];
  apiConnected: boolean;
};

export const fetchAgents = () => serverRequest<BackendAgent[]>("/agents");
export const fetchPolicies = () => serverRequest<BackendPolicy[]>("/policies");
export const fetchTransactions = () =>
  serverRequest<BackendTransaction[]>("/transactions?limit=100");
export const fetchEvents = () => serverRequest<BackendEvent[]>("/security/events?limit=100");
export const fetchSolanaStatus = () => serverRequest<SolanaStatus>("/solana/status");

export async function fetchDashboardData(): Promise<DashboardData> {
  const [agentRows, policyRows, txRows, eventRows, status] = await Promise.all([
    serverRequest<BackendAgent[]>("/agents"),
    serverRequest<BackendPolicy[]>("/policies"),
    serverRequest<BackendTransaction[]>("/transactions?limit=100"),
    serverRequest<BackendEvent[]>("/security/events?limit=100"),
    serverRequest<SolanaStatus>("/solana/status").catch(() => null),
  ]);

  const policies = policyRows.map(mapPolicy);
  const policyByAgent = new Map<string, string>();
  for (const policy of policies) {
    if (policy.agentId) policyByAgent.set(policy.agentId, policy.id);
  }
  const agents = agentRows.map((row) =>
    mapAgent(
      row,
      policyByAgent.get(row.id) ?? "",
      policies.find((p) => p.agentId === row.id)?.maxTransferAmount ?? 1000,
    ),
  );
  const nameByAgent = new Map(agents.map((a) => [a.id, a.name]));
  const transactions = txRows.map((row) =>
    mapTransaction(row, nameByAgent.get(row.agentId) ?? row.agentId),
  );
  const events = eventRows.map((row) =>
    mapSecurityEvent(row, nameByAgent.get(row.agentId ?? "") ?? "System"),
  );

  return {
    agents,
    policies,
    transactions,
    events,
    apiConnected: status?.configured ?? false,
  };
}
