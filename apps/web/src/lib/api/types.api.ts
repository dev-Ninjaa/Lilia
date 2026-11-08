/**
 * Backend row and result shapes consumed by the UI.
 * Only the fields the dashboard uses are typed.
 */

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

export type RiskReason = { ruleId: string; message: string; severity: string };

export type EvaluateResult = {
  id: string;
  agentId: string;
  policyId: string;
  decision: "approved" | "rejected";
  approved: boolean;
  riskScore: number;
  riskLevel: string;
  reasons: RiskReason[];
  createdAt: string;
};

export type PermitV2 = {
  id: string;
  permitVersion: number;
  transactionId: string;
  agentId: string;
  policyId: string;
  assessmentId: string;
  sequence: string;
  nonce: string;
  agentRegistryPda: string;
  agentPublicKey: string;
  policyPda: string;
  policyVersion: number;
  transferAuthority: string;
  sourceTokenAccount: string;
  destinationTokenAccount: string;
  mint: string;
  mintDecimals: number;
  amount: string;
  expiresAtSlot: string;
  canonicalMessage: string;
  signature: string;
  signerPublicKey: string;
};

export type PrepareV2Result = {
  transactionId: string;
  status: string;
  blockchainTransactionBuilt: boolean;
  blockhash: string;
  lastValidBlockHeight: string;
  transaction: string;
  permit: {
    id: string;
    sequence: string;
    expiresAtSlot: string;
    transferAuthority: string;
    sourceTokenAccount: string;
    destinationTokenAccount: string;
    mint: string;
    mintDecimals: number;
    amountRaw: string;
  };
};

export type SubmitResult = {
  transactionId: string;
  status: string;
  signature: string | null;
  slot: string | null;
  failureReason: string | null;
  errorCode: string | null;
  errorMessage: string | null;
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
    reasons: RiskReason[];
    decision: "approved" | "rejected";
    blockchainExecution: string;
  };
  status: string;
  createdAt: string;
};
