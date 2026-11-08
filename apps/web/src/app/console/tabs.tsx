"use client";

import { AgentsView } from "@/components/AgentsView";
import { DashboardView } from "@/components/DashboardView";
import { IntegrationsView } from "@/components/IntegrationsView";
import { PoliciesView } from "@/components/PoliciesView";
import { SimulationLab } from "@/components/SimulationLab";
import { ThreatsView } from "@/components/ThreatsView";
import { TransactionsView } from "@/components/TransactionsView";
import { TransferConsole } from "@/components/TransferConsole";
import {
  ApiError,
  createPolicy,
  disableAgent,
  publishPolicyOnChain,
  registerAgent,
  registerAgentOnChain,
  setAgentStatusOnChain,
} from "@/lib/api";
import type { Agent, Policy, SecurityEvent, Transaction } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return `${error.code}: ${error.message}`;
  return error instanceof Error ? error.message : "Unexpected error.";
}

function ActionError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs font-mono text-red-300">
      {message}
    </div>
  );
}

export const OverviewTab: React.FC<{
  agents: Agent[];
  policies: Policy[];
  transactions: Transaction[];
  events: SecurityEvent[];
}> = ({ agents, policies, transactions, events }) => {
  const router = useRouter();
  return (
    <DashboardView
      agents={agents}
      policies={policies}
      transactions={transactions}
      events={events}
      onNavigateTab={(tab) => router.push(`/console/${tab}`)}
    />
  );
};

export const AgentsTab: React.FC<{ agents: Agent[]; policies: Policy[] }> = ({
  agents,
  policies,
}) => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const toggle = async (agentId: string) => {
    setError(null);
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) return;
    try {
      if (agent.status === "active") await disableAgent(agentId);
      else if (agent.transferAuthority) await setAgentStatusOnChain(agentId, true);
      else throw new Error("This agent cannot be re-enabled until registered on-chain.");
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  const register = async (agentData: Partial<Agent>) => {
    setError(null);
    try {
      await registerAgent({
        name: agentData.name ?? "Unnamed Agent",
        description: "",
        publicKey: agentData.agentPublicKey?.trim() || `web-agent-${Date.now()}`,
        metadata: agentData.agentId ? { agentId: agentData.agentId } : {},
      });
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  const registerOnChain = async (
    agentId: string,
    input: { transferAuthority: string; agentIdentityKey: string },
  ) => {
    setError(null);
    try {
      await registerAgentOnChain(agentId, input);
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  return (
    <>
      <ActionError message={error} />
      <AgentsView
        agents={agents}
        policies={policies}
        onToggleAgent={(id) => void toggle(id)}
        onRegisterAgent={(data) => void register(data)}
        onRegisterOnChain={(id, input) => void registerOnChain(id, input)}
      />
    </>
  );
};

export const PoliciesTab: React.FC<{ policies: Policy[]; agents: Agent[] }> = ({
  policies,
  agents,
}) => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const create = async (policyData: Partial<Policy>) => {
    setError(null);
    try {
      const agentId = policyData.agentId ?? agents[0]?.id;
      if (!agentId) throw new Error("Register an agent before creating a policy.");
      await createPolicy({
        agentId,
        name: policyData.name ?? "Custom Spending Cap",
        maxTransferAmount: String(policyData.maxTransferAmount ?? 500),
        allowedRecipients: policyData.allowedRecipients ?? [],
        blockedRecipients: policyData.blockedRecipients ?? [],
        allowedMint: null,
        expiresAt: null,
      });
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  const publish = async (policyId: string, mintDecimals: number) => {
    setError(null);
    try {
      await publishPolicyOnChain(policyId, mintDecimals);
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  return (
    <>
      <ActionError message={error} />
      <PoliciesView
        policies={policies}
        onCreatePolicy={(data) => void create(data)}
        onPublishPolicy={(id, decimals) => void publish(id, decimals)}
      />
    </>
  );
};

export const FeedTab: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => (
  <TransactionsView transactions={transactions} />
);

export const TransfersTab: React.FC<{ agents: Agent[]; policies: Policy[] }> = ({
  agents,
  policies,
}) => {
  const router = useRouter();
  return (
    <TransferConsole agents={agents} policies={policies} onSubmitted={() => router.refresh()} />
  );
};

export const ThreatsTab: React.FC<{ events: SecurityEvent[] }> = ({ events }) => (
  <ThreatsView events={events} />
);

export const SimulateTab: React.FC<{ agents: Agent[]; policies: Policy[] }> = ({
  agents,
  policies,
}) => <SimulationLab agents={agents} policies={policies} />;

export const IntegrationsTab: React.FC = () => <IntegrationsView />;
