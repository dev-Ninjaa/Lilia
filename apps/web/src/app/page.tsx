"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Navbar } from "../components/Navbar";
import { LandingPage } from "../components/LandingPage";
import { DashboardView } from "../components/DashboardView";
import { AgentsView } from "../components/AgentsView";
import { PoliciesView } from "../components/PoliciesView";
import { TransactionsView } from "../components/TransactionsView";
import { ThreatsView } from "../components/ThreatsView";
import { SimulationLab } from "../components/SimulationLab";
import { TransferConsole } from "../components/TransferConsole";
import { IntegrationsView } from "../components/IntegrationsView";
import { Footer } from "../components/Footer";
import { Agent, Policy, Transaction, SecurityEvent } from "../lib/types";
import {
  ApiError,
  createPolicy,
  disableAgent,
  listAgents,
  listPolicies,
  listSecurityEvents,
  listTransactions,
  registerAgent,
  registerAgentOnChain,
  setAgentStatusOnChain,
  solanaStatus,
  publishPolicyOnChain,
} from "../lib/api";
import { mapAgent, mapPolicy, mapSecurityEvent, mapTransaction } from "../lib/mappers";

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return `${error.code}: ${error.message}`;
  return error instanceof Error ? error.message : "Unexpected error.";
}

export default function Home() {
  const [currentView, setCurrentView] = useState<"landing" | "app">("landing");
  const [activeAppTab, setActiveAppTab] = useState("overview");
  const [walletConnected, setWalletConnected] = useState(false);

  const [agents, setAgents] = useState<Agent[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [agentRows, policyRows, txRows, eventRows, status] = await Promise.all([
        listAgents(),
        listPolicies(),
        listTransactions(),
        listSecurityEvents(),
        solanaStatus().catch(() => null),
      ]);
      setWalletConnected(status?.configured ?? false);
      const mappedPolicies = policyRows.map(mapPolicy);
      const policyByAgent = new Map<string, string>();
      for (const policy of mappedPolicies) {
        if (policy.agentId) policyByAgent.set(policy.agentId, policy.id);
      }
      const mappedAgents = agentRows.map((row) =>
        mapAgent(
          row,
          policyByAgent.get(row.id) ?? "",
          mappedPolicies.find((p) => p.agentId === row.id)?.maxTransferAmount ?? 1000,
        ),
      );
      const nameByAgent = new Map(mappedAgents.map((a) => [a.id, a.name]));
      const mappedTransactions = txRows.map((row) =>
        mapTransaction(row, nameByAgent.get(row.agentId) ?? row.agentId),
      );
      const mappedEvents = eventRows.map((row) =>
        mapSecurityEvent(row, nameByAgent.get(row.agentId ?? "") ?? "System"),
      );
      setPolicies(mappedPolicies);
      setAgents(mappedAgents);
      setTransactions(mappedTransactions);
      setEvents(mappedEvents);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    void load();
  }, [load]);

  const handleToggleAgent = async (agentId: string) => {
    setActionError(null);
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) return;
    try {
      if (agent.status === "active") {
        await disableAgent(agentId);
      } else if (agent.transferAuthority) {
        await setAgentStatusOnChain(agentId, true);
      } else {
        throw new Error(
          "This agent cannot be re-enabled from the UI until it is registered on-chain.",
        );
      }
      await load();
    } catch (error) {
      setActionError(errorMessage(error));
    }
  };

  const handleRegisterAgent = async (agentData: Partial<Agent>) => {
    setActionError(null);
    try {
      await registerAgent({
        name: agentData.name ?? "Unnamed Agent",
        description: "",
        publicKey:
          agentData.agentPublicKey?.trim() || `web-agent-${Date.now()}`,
        metadata: agentData.agentId ? { agentId: agentData.agentId } : {},
      });
      await load();
    } catch (error) {
      setActionError(errorMessage(error));
    }
  };

  const handleRegisterOnChain = async (
    agentId: string,
    input: { transferAuthority: string; agentIdentityKey: string },
  ) => {
    setActionError(null);
    try {
      await registerAgentOnChain(agentId, input);
      await load();
    } catch (error) {
      setActionError(errorMessage(error));
    }
  };

  const handlePublishPolicy = async (policyId: string, mintDecimals: number) => {
    setActionError(null);
    try {
      await publishPolicyOnChain(policyId, mintDecimals);
      await load();
    } catch (error) {
      setActionError(errorMessage(error));
    }
  };

  const handleCreatePolicy = async (policyData: Partial<Policy>) => {
    setActionError(null);
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
      await load();
    } catch (error) {
      setActionError(errorMessage(error));
    }
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-[#ff6b4a] selection:text-black" style={{ background: "#07080a", color: "#ffffff" }}>
      {/* Top Floating Modular Glass Navbar */}
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        activeAppTab={activeAppTab}
        setActiveAppTab={setActiveAppTab}
        walletConnected={walletConnected}
        setWalletConnected={setWalletConnected}
      />

      {/* Main Body */}
      <main className="flex-1 w-full">
        {currentView === "landing" ? (
          <LandingPage onLaunchApp={() => setCurrentView("app")} />
        ) : (
          <div className="max-w-7xl mx-auto w-full px-4 md:px-8 py-8 pt-24">
            {actionError && (
              <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs font-mono text-red-300">
                {actionError}
              </div>
            )}

            {isLoading ? (
              <div className="rounded-2xl border border-white/[0.08] bg-[#111317] p-8 text-center text-sm font-mono text-neutral-400">
                Loading live data from the Lilia API…
              </div>
            ) : loadError ? (
              <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-8 text-center">
                <p className="text-sm font-mono text-red-300 mb-3">
                  Could not load live data: {loadError}
                </p>
                <p className="text-xs text-neutral-500 mb-4">
                  Start the API (`bun run dev`) and set `LILIA_API_KEY` in the Next.js server
                  environment, then retry.
                </p>
                <button
                  onClick={() => void load()}
                  className="px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200"
                >
                  Retry
                </button>
              </div>
            ) : (
              <>
                {activeAppTab === "overview" && (
                  <DashboardView
                    agents={agents}
                    policies={policies}
                    transactions={transactions}
                    events={events}
                    onNavigateTab={(tab) => setActiveAppTab(tab)}
                  />
                )}

                {activeAppTab === "agents" && (
                  <AgentsView
                    agents={agents}
                    policies={policies}
                    onToggleAgent={(id) => void handleToggleAgent(id)}
                    onRegisterAgent={(data) => void handleRegisterAgent(data)}
                    onRegisterOnChain={(id, input) => void handleRegisterOnChain(id, input)}
                  />
                )}

                {activeAppTab === "policies" && (
                  <PoliciesView
                    policies={policies}
                    onCreatePolicy={(data) => void handleCreatePolicy(data)}
                    onPublishPolicy={(id, decimals) => void handlePublishPolicy(id, decimals)}
                  />
                )}

                {activeAppTab === "transactions" && (
                  <TransactionsView transactions={transactions} />
                )}

                {activeAppTab === "transfers" && (
                  <TransferConsole agents={agents} policies={policies} onSubmitted={() => void load()} />
                )}

                {activeAppTab === "threats" && <ThreatsView events={events} />}

                {activeAppTab === "simulation" && (
                  <SimulationLab agents={agents} policies={policies} />
                )}

                {activeAppTab === "integrations" && <IntegrationsView />}
              </>
            )}
          </div>
        )}
      </main>

      {/* High-Taste Professional Footer */}
      <Footer />
    </div>
  );
}
