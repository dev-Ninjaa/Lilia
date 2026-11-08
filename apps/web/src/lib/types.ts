export interface Agent {
  id: string;
  agentId: string;
  name: string;
  ownerPublicKey: string;
  agentPublicKey: string;
  policyId: string;
  status: "active" | "disabled" | "standby";
  createdAt: string;
  totalTransferred: number;
  dailySpent: number;
  dailyCap: number;
  description?: string;
  transferAuthority?: string | null;
  agentIdentityKey?: string | null;
  onChainRegistryPda?: string | null;
  authorizationSequence?: string;
}

export interface Policy {
  id: string;
  name: string;
  ownerPublicKey: string;
  agentId?: string;
  maxTransferAmount: number;
  dailyLimit: number;
  allowedRecipients: string[];
  blockedRecipients: string[];
  supportedMint: string;
  mintSymbol: string;
  status: "active" | "inactive";
  replayProtection: boolean;
  ttlSeconds: number;
  createdAt: string;
  updatedAt: string;
  policyVersion?: number;
  onChainPolicyPda?: string | null;
  onChainPolicyVersion?: number;
}

export interface Transaction {
  id: string;
  agentId: string;
  agentName: string;
  sender: string;
  recipient: string;
  mint: string;
  mintSymbol: string;
  amount: number;
  purpose?: string;
  sentinelDecision: "APPROVED" | "REJECTED";
  riskScore: number;
  riskReason?: string;
  permitStatus: "ISSUED" | "NOT_ISSUED" | "EXPIRED";
  permitSignature?: string;
  executionStatus: "EXECUTED" | "REJECTED_ON_CHAIN" | "REJECTED_BY_SENTINEL" | "PENDING";
  txSignature?: string;
  createdAt: string;
  hookErrorCode?: string;
  backendStatus?: string;
  flowVersion?: number;
  permitId?: string | null;
  slot?: string | null;
  blockhash?: string | null;
  failureReason?: string | null;
}

export interface SecurityEvent {
  id: string;
  eventType: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  agentId: string;
  agentName: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface SimulationScenario {
  id: string;
  name: string;
  tag: string;
  description: string;
  agentId: string;
  amount: number;
  recipient: string;
  expectedOutcome: "SUCCESS" | "REJECTED_BY_SENTINEL" | "REJECTED_BY_HOOK";
  details: string;
}
