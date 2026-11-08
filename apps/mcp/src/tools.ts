import { request } from "./client.js";

export function evaluateTransaction(input: {
  agentId: string;
  policyId?: string;
  recipient: string;
  mint: string;
  amount: string;
}) {
  return request("POST", "/sentinel/evaluate", input);
}

export function requestAuthorization(input: {
  assessmentId: string;
  version?: "1" | "2";
  expiresInSlots?: number;
}) {
  if (input.version === "2") {
    return request("POST", "/v2/sentinel/authorize", {
      assessmentId: input.assessmentId,
      expiresInSlots: input.expiresInSlots,
    });
  }
  return request("POST", "/sentinel/authorize", { assessmentId: input.assessmentId });
}

export function prepareTransfer(input: {
  permitId: string;
  sender: string;
  recipient: string;
  mint: string;
  amount: string;
  version?: "1" | "2";
}) {
  const path = input.version === "2" ? "/transactions/prepare-v2" : "/transactions/prepare";
  return request("POST", path, {
    permitId: input.permitId,
    sender: input.sender,
    recipient: input.recipient,
    mint: input.mint,
    amount: input.amount,
  });
}

export function simulateTransfer(input: {
  agentId: string;
  policyId: string;
  recipient: string;
  mint: string;
  amount: string;
}) {
  return request("POST", "/simulation/run", input);
}

export function getTransactionStatus(signature: string) {
  return request("GET", `/transactions/${signature}`);
}

export function getAgent(agentId: string) {
  return request("GET", `/agents/${agentId}`);
}

export function getPolicy(policyId: string) {
  return request("GET", `/policies/${policyId}`);
}
