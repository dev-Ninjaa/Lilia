/**
 * Typed client for the Lilia Fastify API.
 *
 * All requests go through the server-side proxy at `/api/lilia/*`, which
 * injects the `LILIA_API_KEY` Bearer token. The key is never exposed to the
 * browser. The backend envelope is `{ success, data, meta }` on success and
 * `{ success: false, error: { code, message, details } }` on failure.
 */

export type ApiErrorBody = {
  code?: string;
  message?: string;
  details?: unknown;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

type Envelope<T> =
  | { success: true; data: T; meta?: Record<string, unknown> }
  | { success: false; error?: ApiErrorBody };

export async function request<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/lilia${path}`, {
      method,
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Could not reach the Lilia API proxy.");
  }

  const envelope = (await response.json()) as Envelope<T>;
  if (!response.ok || envelope.success === false) {
    const error = envelope.success === false ? envelope.error : undefined;
    throw new ApiError(
      response.status,
      error?.code ?? "API_ERROR",
      error?.message ?? `Request failed with status ${response.status}.`,
    );
  }
  return (envelope as { data: T }).data;
}

// Backend row shapes (only the fields the UI consumes).

export type BackendAgent = {
  id: string;
  name: string;
  description?: string;
  ownerId?: string;
  publicKey?: string;
  status?: "active" | "disabled";
  metadata?: Record<string, unknown>;
  transferAuthority?: string | null;
  agentIdentityKey?: string | null;
  onChainRegistryPda?: string | null;
  onChainRegisteredAt?: string | null;
  registrationTxSignature?: string | null;
  authorizationSequence?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type BackendPolicy = {
  id: string;
  agentId: string;
  name: string;
  maxTransferAmount: string;
  allowedRecipients?: string[];
  blockedRecipients?: string[];
  allowedMint?: string | null;
  isActive?: boolean;
  expiresAt?: string | null;
  policyVersion?: number;
  onChainPolicyPda?: string | null;
  onChainPolicyVersion?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type BackendTransaction = {
  id: string;
  agentId: string;
  policyId?: string;
  permitId?: string | null;
  sender: string;
  recipient: string;
  mint: string;
  amount: string;
  status: string;
  transactionSignature?: string | null;
  failureReason?: string | null;
  flowVersion?: number;
  blockhash?: string | null;
  slot?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type BackendEvent = {
  id: string;
  agentId?: string | null;
  transactionId?: string | null;
  eventType: string;
  severity: string;
  description: string;
  metadata?: Record<string, unknown>;
  source?: string;
  createdAt?: string;
};

export type SecurityOverview = {
  totalAgents: number;
  activeAgents: number;
  disabledAgents: number;
  totalPolicies: number;
  activePolicies: number;
  totalTransactionIntents: number;
  authorizedTransactionIntents: number;
  rejectedEvaluations: number;
  confirmedTransactions: number;
  securityEventsBySeverity: Record<string, number>;
};

export type SolanaStatus = {
  configured: boolean;
  programId: string;
  rpcUrl: string | null;
  commitment: string;
  sentinelPublicKey: string | null;
  adminConfigured: boolean;
  latestSlot: number | null;
};

export type IntegrationsStatus = {
  solanaRpc: { status: string; endpointConfigured: boolean; note: string };
  gemini: { status: string };
  mcp: { status: string };
  database: { status: string };
};

export type SimulationResult = {
  id: string;
  agentId: string;
  policyId: string;
  input: Record<string, unknown>;
  result: {
    approved: boolean;
    riskScore: number;
    riskLevel: string;
    reasons: Array<{ ruleId: string; message: string; severity: string }>;
    decision: "approved" | "rejected";
    blockchainExecution: string;
  };
  status: string;
  createdAt: string;
};

export const listAgents = () => request<BackendAgent[]>("GET", "/agents");

export const registerAgent = (input: {
  name: string;
  description: string;
  publicKey: string;
  metadata: Record<string, unknown>;
}) => request<BackendAgent>("POST", "/agents/register", input);

export const disableAgent = (agentId: string) =>
  request<{ id: string; status: string }>("POST", `/agents/${agentId}/disable`);

export const setAgentStatusOnChain = (agentId: string, isActive: boolean) =>
  request<BackendAgent>("POST", `/agents/${agentId}/status-on-chain`, { isActive });

export const listPolicies = () => request<BackendPolicy[]>("GET", "/policies");

export const createPolicy = (input: {
  agentId: string;
  name: string;
  maxTransferAmount: string;
  allowedRecipients: string[];
  blockedRecipients: string[];
  allowedMint: string | null;
  expiresAt: string | null;
}) => request<BackendPolicy>("POST", "/policies", input);

export const listTransactions = (limit = 100) =>
  request<BackendTransaction[]>("GET", `/transactions?limit=${limit}`);

export const listSecurityEvents = (limit = 100) =>
  request<BackendEvent[]>("GET", `/security/events?limit=${limit}`);

export const securityOverview = () => request<SecurityOverview>("GET", "/security/overview");

export const solanaStatus = () => request<SolanaStatus>("GET", "/solana/status");

export const integrationsStatus = () =>
  request<IntegrationsStatus>("GET", "/integrations");

export const runSimulation = (input: {
  agentId: string;
  policyId: string;
  recipient: string;
  mint: string;
  amount: string;
}) => request<SimulationResult>("POST", "/simulation/run", input);
