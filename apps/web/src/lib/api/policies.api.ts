import { request } from "@/lib/api/client.api";
import type { BackendPolicy } from "@/lib/api/types.api";

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

export const publishPolicyOnChain = (policyId: string, mintDecimals: number) =>
  request<BackendPolicy>("POST", `/policies/${policyId}/publish-on-chain`, { mintDecimals });
