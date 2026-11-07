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
  executionStatus: "EXECUTED" | "REJECTED_ON_CHAIN" | "REJECTED_BY_SENTINEL";
  txSignature?: string;
  createdAt: string;
  hookErrorCode?: string;
}

export interface SecurityEvent {
  id: string;
  eventType: 
    | "AGENT_REGISTERED" 
    | "AGENT_DISABLED" 
    | "POLICY_VIOLATED" 
    | "PERMIT_ISSUED" 
    | "HOOK_VALIDATION_PASSED" 
    | "HOOK_VALIDATION_FAILED" 
    | "DRAIN_ATTEMPT_BLOCKED";
  severity: "critical" | "high" | "medium" | "low";
  agentId: string;
  agentName: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
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
