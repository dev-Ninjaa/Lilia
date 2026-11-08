import { request } from "@/lib/api/client.api";
import type { BackendAgent } from "@/lib/api/types.api";

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

export const registerAgentOnChain = (
  agentId: string,
  input: { transferAuthority: string; agentIdentityKey: string },
) => request<BackendAgent>("POST", `/agents/${agentId}/register-on-chain`, input);
