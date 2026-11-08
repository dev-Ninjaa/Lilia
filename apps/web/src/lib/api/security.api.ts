import { request } from "@/lib/api/client.api";
import type { BackendEvent, SecurityOverview, SimulationResult } from "@/lib/api/types.api";

export const listSecurityEvents = (limit = 100) =>
  request<BackendEvent[]>("GET", `/security/events?limit=${limit}`);

export const securityOverview = () => request<SecurityOverview>("GET", "/security/overview");

export const runSimulation = (input: {
  agentId: string;
  policyId: string;
  recipient: string;
  mint: string;
  amount: string;
}) => request<SimulationResult>("POST", "/simulation/run", input);
