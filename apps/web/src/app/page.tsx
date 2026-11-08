"use client";

import { AgentsView } from "@/components/AgentsView";
import { DashboardView } from "@/components/DashboardView";
import { Footer } from "@/components/Footer";
import { IntegrationsView } from "@/components/IntegrationsView";
import { LandingPage } from "@/components/LandingPage";
import { Navbar } from "@/components/Navbar";
import { PoliciesView } from "@/components/PoliciesView";
import { type AppTabId, Sidebar } from "@/components/Sidebar";
import { SimulationLab } from "@/components/SimulationLab";
import { ThreatsView } from "@/components/ThreatsView";
import { TransactionsView } from "@/components/TransactionsView";
import { TransferConsole } from "@/components/TransferConsole";
import {
  ApiError,
  createPolicy,
  disableAgent,
  listAgents,
  listPolicies,
  listSecurityEvents,
  listTransactions,
  publishPolicyOnChain,
  registerAgent,
  registerAgentOnChain,
  setAgentStatusOnChain,
  solanaStatus,
} from "@/lib/api";
import { mapAgent, mapPolicy, mapSecurityEvent, mapTransaction } from "@/lib/mappers";
import type { Agent, Policy, SecurityEvent, Transaction } from "@/lib/types";
import { Menu } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return `${error.code}: ${error.message}`;
  return error instanceof Error ? error.message : "Unexpected error.";
}

export default function Home() {
  const [currentView, setCurrentView] = useState<"landing" | "app">("landing");
  const [activeAppTab, setActiveAppTab] = useState<AppTabId>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);

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
      setApiConnected(status?.configured ?? false);
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
        publicKey: agentData.agentPublicKey?.trim() || `web-agent-${Date.now()}`,
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
    <div
      className="min-h-screen selection:bg-[#ff6b4a] selection:text-black"
      style={{ background: "#07080a", color: "#ffffff" }}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-[#FF5533] focus:px-4 focus:py-2 focus:text-xs focus:font-semibold focus:text-black"
      >
        Skip to content
      </a>

      {currentView === "landing" ? (
        <>
          <Navbar onLaunchApp={() => setCurrentView("app")} />
          <main id="main" className="flex-1">
            <LandingPage onLaunchApp={() => setCurrentView("app")} />
          </main>
        </>
      ) : (
        <>
          <Sidebar
            open={sidebarOpen}
            activeTab={activeAppTab}
            onNavigate={setActiveAppTab}
            onClose={() => setSidebarOpen(false)}
            onBackToLanding={() => setCurrentView("landing")}
            apiConnected={apiConnected}
          />

          {/* Mobile header (desktop uses fixed sidebar) */}
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/[0.07] bg-[#0b0c10]/95 px-4 py-3 backdrop-blur lg:hidden">
            <button
              type="button"
              aria-label="Open navigation"
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-neutral-300 hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-[#FF5533]"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <span className="font-bold tracking-wider text-sm">LILIA</span>
            <span
              className={`flex items-center gap-1.5 font-mono text-[11px] ${apiConnected ? "text-[#14F195]" : "text-neutral-500"}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${apiConnected ? "bg-[#14F195]" : "bg-neutral-600"}`}
                aria-hidden="true"
              />
              API
            </span>
          </header>

          <main id="main" className="lg:pl-64">
            <div className="mx-auto w-full max-w-6xl px-3 py-5 sm:px-5 sm:py-7 lg:px-8">
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
                    type="button"
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
                      onNavigateTab={(tab) => setActiveAppTab(tab as AppTabId)}
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
                    <TransferConsole
                      agents={agents}
                      policies={policies}
                      onSubmitted={() => void load()}
                    />
                  )}

                  {activeAppTab === "threats" && <ThreatsView events={events} />}

                  {activeAppTab === "simulation" && (
                    <SimulationLab agents={agents} policies={policies} />
                  )}

                  {activeAppTab === "integrations" && <IntegrationsView />}
                </>
              )}
            </div>
          </main>
        </>
      )}

      {/* High-Taste Professional Footer */}
      <Footer />
    </div>
  );
}
