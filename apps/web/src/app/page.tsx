"use client";

import React, { useState } from "react";
import { Navbar } from "../components/Navbar";
import { LandingPage } from "../components/LandingPage";
import { DashboardView } from "../components/DashboardView";
import { AgentsView } from "../components/AgentsView";
import { PoliciesView } from "../components/PoliciesView";
import { TransactionsView } from "../components/TransactionsView";
import { ThreatsView } from "../components/ThreatsView";
import { SimulationLab } from "../components/SimulationLab";
import { IntegrationsView } from "../components/IntegrationsView";
import { Footer } from "../components/Footer";
import {
  INITIAL_AGENTS,
  INITIAL_POLICIES,
  INITIAL_TRANSACTIONS,
  INITIAL_SECURITY_EVENTS,
} from "../lib/mockData";
import { Agent, Policy } from "../lib/types";

export default function Home() {
  const [currentView, setCurrentView] = useState<"landing" | "app">("landing");
  const [activeAppTab, setActiveAppTab] = useState("overview");
  const [walletConnected, setWalletConnected] = useState(true);

  // State
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [policies, setPolicies] = useState<Policy[]>(INITIAL_POLICIES);
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);
  const [events, setEvents] = useState(INITIAL_SECURITY_EVENTS);

  // Handlers
  const handleToggleAgent = (agentId: string) => {
    setAgents((prev) =>
      prev.map((a) => {
        if (a.id === agentId) {
          const newStatus = a.status === "active" ? "disabled" : "active";
          return { ...a, status: newStatus };
        }
        return a;
      })
    );
  };

  const handleRegisterAgent = (agentData: Partial<Agent>) => {
    const newAgent: Agent = {
      id: `ag-${Date.now()}`,
      agentId: agentData.agentId || `agent-${Date.now()}`,
      name: agentData.name || "Unnamed Agent",
      ownerPublicKey: "9xQ2dJ8vK...4a1M",
      agentPublicKey: agentData.agentPublicKey || "AgentPubkey...Devnet",
      policyId: agentData.policyId || policies[0].id,
      status: "active",
      createdAt: new Date().toISOString(),
      totalTransferred: 0,
      dailySpent: 0,
      dailyCap: agentData.dailyCap || 1000,
    };
    setAgents((prev) => [newAgent, ...prev]);
  };

  const handleCreatePolicy = (policyData: Partial<Policy>) => {
    const newPolicy: Policy = {
      id: `pol-${Date.now()}`,
      name: policyData.name || "Custom Spending Cap",
      ownerPublicKey: "9xQ2dJ8vK...4a1M",
      maxTransferAmount: policyData.maxTransferAmount || 500,
      dailyLimit: policyData.dailyLimit || 2500,
      allowedRecipients: policyData.allowedRecipients || [],
      blockedRecipients: policyData.blockedRecipients || [],
      supportedMint: policyData.supportedMint || "Token22zP...M1ntUsdc92x4",
      mintSymbol: "USDC-2022",
      status: "active",
      replayProtection: true,
      ttlSeconds: policyData.ttlSeconds || 60,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setPolicies((prev) => [newPolicy, ...prev]);
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
                onToggleAgent={handleToggleAgent}
                onRegisterAgent={handleRegisterAgent}
              />
            )}

            {activeAppTab === "policies" && (
              <PoliciesView
                policies={policies}
                onCreatePolicy={handleCreatePolicy}
              />
            )}

            {activeAppTab === "transactions" && (
              <TransactionsView transactions={transactions} />
            )}

            {activeAppTab === "threats" && <ThreatsView events={events} />}

            {activeAppTab === "simulation" && <SimulationLab />}

            {activeAppTab === "integrations" && <IntegrationsView />}
          </div>
        )}
      </main>

      {/* High-Taste Professional Footer */}
      <Footer />
    </div>
  );
}
