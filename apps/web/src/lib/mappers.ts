import type {
  BackendAgent,
  BackendEvent,
  BackendPolicy,
  BackendTransaction,
} from "./api";
import type { Agent, Policy, SecurityEvent, Transaction } from "./types";

/**
 * Map backend rows to the view models the dashboard components already render.
 *
 * The backend has no daily-spend or velocity model, so `dailySpent` and
 * `totalTransferred` are derived from the transaction feed where possible and
 * fall back to 0. `dailyCap` mirrors the agent's first policy maximum.
 */

function shortId(id: string): string {
  return id.length > 13 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}

export function mapAgent(
  row: BackendAgent,
  policyId = "",
  dailyCap = 1000,
): Agent {
  const metadata = row.metadata ?? {};
  const agentId =
    typeof metadata.agentId === "string" && metadata.agentId.length > 0
      ? (metadata.agentId as string)
      : shortId(row.id);
  const publicKey = row.transferAuthority ?? row.publicKey ?? "";
  return {
    id: row.id,
    agentId,
    name: row.name,
    ownerPublicKey: row.ownerId ?? "single-owner",
    agentPublicKey: publicKey,
    policyId,
    status: row.status === "disabled" ? "disabled" : "active",
    createdAt: row.createdAt ?? "",
    totalTransferred: 0,
    dailySpent: 0,
    dailyCap,
    description: row.description ?? "",
    transferAuthority: row.transferAuthority ?? null,
    agentIdentityKey: row.agentIdentityKey ?? null,
    onChainRegistryPda: row.onChainRegistryPda ?? null,
    authorizationSequence: row.authorizationSequence,
  };
}

export function mapPolicy(row: BackendPolicy): Policy {
  const max = Number(row.maxTransferAmount);
  return {
    id: row.id,
    name: row.name,
    ownerPublicKey: "",
    agentId: row.agentId,
    maxTransferAmount: Number.isFinite(max) ? max : 0,
    dailyLimit: Number.isFinite(max) ? max : 0,
    allowedRecipients: row.allowedRecipients ?? [],
    blockedRecipients: row.blockedRecipients ?? [],
    supportedMint: row.allowedMint ?? "Any Token-2022 mint",
    mintSymbol: "Token-2022",
    status: row.isActive === false ? "inactive" : "active",
    replayProtection: true,
    ttlSeconds: 300,
    createdAt: row.createdAt ?? "",
    updatedAt: row.updatedAt ?? "",
    policyVersion: row.policyVersion,
    onChainPolicyPda: row.onChainPolicyPda ?? null,
    onChainPolicyVersion: row.onChainPolicyVersion,
  };
}

function toExecutionStatus(
  status: string,
): Transaction["executionStatus"] {
  switch (status) {
    case "confirmed":
      return "EXECUTED";
    case "failed":
      return "REJECTED_ON_CHAIN";
    case "rejected":
      return "REJECTED_BY_SENTINEL";
    default:
      return "PENDING";
  }
}

export function mapTransaction(
  row: BackendTransaction,
  agentName: string,
): Transaction {
  const status = row.status ?? "";
  const failure = row.failureReason ?? row.errorMessage ?? undefined;
  return {
    id: row.id,
    agentId: row.agentId,
    agentName,
    sender: row.sender,
    recipient: row.recipient,
    mint: row.mint,
    mintSymbol: "Token-2022",
    amount: Number(row.amount) || 0,
    sentinelDecision: status === "rejected" || status === "failed" ? "REJECTED" : "APPROVED",
    riskScore: status === "rejected" || status === "failed" ? 100 : 0,
    riskReason: failure,
    permitStatus: row.permitId ? "ISSUED" : "NOT_ISSUED",
    executionStatus: toExecutionStatus(status),
    txSignature: row.transactionSignature ?? undefined,
    createdAt: row.createdAt ?? "",
    hookErrorCode: row.errorCode ?? undefined,
    backendStatus: status,
    flowVersion: row.flowVersion,
    permitId: row.permitId ?? null,
    slot: row.slot ?? null,
    blockhash: row.blockhash ?? null,
    failureReason: failure ?? null,
  };
}

export function mapSecurityEvent(
  row: BackendEvent,
  agentName: string,
): SecurityEvent {
  const severity = row.severity;
  const safeSeverity: SecurityEvent["severity"] =
    severity === "critical" ||
    severity === "high" ||
    severity === "medium" ||
    severity === "low" ||
    severity === "info"
      ? severity
      : "info";
  return {
    id: row.id,
    eventType: row.eventType,
    severity: safeSeverity,
    agentId: row.agentId ?? "",
    agentName,
    description: row.description,
    timestamp: row.createdAt ?? "",
    metadata: row.metadata,
  };
}
