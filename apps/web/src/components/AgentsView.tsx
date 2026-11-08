"use client";

import React, { useState } from "react";
import { Agent, Policy } from "../lib/types";
import { Plus, Search, ShieldAlert, Power, UserPlus, Copy, Check } from "lucide-react";

interface AgentsViewProps {
  agents: Agent[];
  policies: Policy[];
  onToggleAgent: (agentId: string) => void;
  onRegisterAgent: (agent: Partial<Agent>) => void;
  onRegisterOnChain: (
    agentId: string,
    input: { transferAuthority: string; agentIdentityKey: string },
  ) => void;
}

export const AgentsView: React.FC<AgentsViewProps> = ({
  agents,
  policies,
  onToggleAgent,
  onRegisterAgent,
  onRegisterOnChain,
}) => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "disabled">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // On-chain registration form state
  const [onChainAgent, setOnChainAgent] = useState<Agent | null>(null);
  const [transferAuthority, setTransferAuthority] = useState("");
  const [agentIdentityKey, setAgentIdentityKey] = useState("");

  // New Agent Form State
  const [name, setName] = useState("");
  const [agentId, setAgentId] = useState("");
  const [agentPubkey, setAgentPubkey] = useState("");
  const [selectedPolicy, setSelectedPolicy] = useState(policies[0]?.id || "");

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openOnChain = (agent: Agent) => {
    setOnChainAgent(agent);
    setTransferAuthority(agent.transferAuthority ?? "");
    setAgentIdentityKey(agent.agentIdentityKey ?? "");
  };

  const submitOnChain = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onChainAgent) return;
    onRegisterOnChain(onChainAgent.id, { transferAuthority, agentIdentityKey });
    setOnChainAgent(null);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !agentId) return;
    onRegisterAgent({
      name,
      agentId,
      agentPublicKey: agentPubkey || `web-agent-${Date.now()}`,
      policyId: selectedPolicy,
      dailyCap: 1000,
      dailySpent: 0,
      totalTransferred: 0,
      status: "active",
    });
    setName("");
    setAgentId("");
    setAgentPubkey("");
    setIsModalOpen(false);
  };

  const filteredAgents = agents.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.agentId.toLowerCase().includes(search.toLowerCase()) ||
      a.agentPublicKey.toLowerCase().includes(search.toLowerCase());
    if (filter === "active") return matchesSearch && a.status === "active";
    if (filter === "disabled") return matchesSearch && a.status === "disabled";
    return matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-semibold uppercase text-neutral-400">
              Identity & Access Layer
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Agent Registry & Permissions
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Autonomous agent wallets bound to Lilia Token-2022 Transfer Hook PDAs
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#FF5533] text-black font-semibold text-xs active:scale-[0.98] transition-all hover:bg-[#ff6847] shadow-[0_0_16px_rgba(255,85,51,0.2)]"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Register New Agent</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#111317] p-3 rounded-2xl border border-white/[0.08]">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by agent name, ID, or public key..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#FF5533]"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto text-xs font-mono">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1 rounded-lg transition-all ${
              filter === "all" ? "bg-white text-black font-bold" : "text-neutral-400 hover:text-white"
            }`}
          >
            All ({agents.length})
          </button>
          <button
            onClick={() => setFilter("active")}
            className={`px-3 py-1 rounded-lg transition-all ${
              filter === "active" ? "bg-[#14F195] text-black font-bold" : "text-neutral-400 hover:text-white"
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter("disabled")}
            className={`px-3 py-1 rounded-lg transition-all ${
              filter === "disabled" ? "bg-red-500 text-white font-bold" : "text-neutral-400 hover:text-white"
            }`}
          >
            Disabled
          </button>
        </div>
      </div>

      {/* Agents Table Surface */}
      <div className="rounded-2xl bg-[#111317] border border-white/[0.08] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-black/40 text-neutral-400 border-b border-white/[0.08]">
              <tr>
                <th className="py-3 px-4 font-semibold">Agent Name & Identity</th>
                <th className="py-3 px-4 font-semibold">Public Key</th>
                <th className="py-3 px-4 font-semibold">Assigned Policy</th>
                <th className="py-3 px-4 font-semibold">Daily Cap Velocity</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Emergency Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05] text-neutral-300">
              {filteredAgents.map((agent) => {
                const policy = policies.find((p) => p.id === agent.policyId);
                return (
                  <tr key={agent.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-sans">
                      <div className="font-semibold text-white text-sm">{agent.name}</div>
                      <div className="text-neutral-500 font-mono text-[11px]">{agent.agentId}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-neutral-400">
                        <span>{agent.agentPublicKey}</span>
                        <button
                          onClick={() => handleCopy(agent.id, agent.agentPublicKey)}
                          className="hover:text-white"
                        >
                          {copiedId === agent.id ? (
                            <Check className="w-3.5 h-3.5 text-[#14F195]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-white font-medium">{policy?.name || "Default Cap"}</span>
                      <div className="text-[10px] text-neutral-500">Max {policy?.maxTransferAmount || 500} USDC / tx</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{agent.dailySpent}</span>
                        <span className="text-neutral-500">/ {agent.dailyCap} USDC</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          agent.status === "active"
                            ? "bg-emerald-500/10 text-[#14F195] border border-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            agent.status === "active" ? "bg-[#14F195]" : "bg-red-500"
                          }`}
                        ></span>
                        {agent.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openOnChain(agent)}
                          disabled={Boolean(agent.onChainRegistryPda)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold active:scale-[0.98] transition-all bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/[0.15] disabled:opacity-40"
                          title={agent.onChainRegistryPda ? `Registry ${agent.onChainRegistryPda}` : "Register AgentRegistry on-chain"}
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>{agent.onChainRegistryPda ? "On-chain ✓" : "On-chain"}</span>
                        </button>
                        <button
                          onClick={() => onToggleAgent(agent.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold active:scale-[0.98] transition-all ${
                            agent.status === "active"
                              ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30"
                              : "bg-emerald-500/10 hover:bg-emerald-500/20 text-[#14F195] border border-emerald-500/30"
                          }`}
                          title={agent.status === "active" ? "Emergency Kill Switch" : "Re-activate Agent"}
                        >
                          <Power className="w-3.5 h-3.5" />
                          <span>{agent.status === "active" ? "Disable Agent" : "Enable Agent"}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Agent Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[#111317] border border-white/[0.15] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#FF5533]" />
                Register Agent Identity
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-white text-lg font-mono"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-neutral-400 mb-1">Agent Friendly Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Yield Arbitrage Bot"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-white focus:outline-none focus:border-[#FF5533]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-neutral-400 mb-1">Unique Agent Identifier</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. agent-arbitrage-01"
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-white font-mono focus:outline-none focus:border-[#FF5533]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-neutral-400 mb-1">Agent Public Key (Solana Wallet)</label>
                <input
                  type="text"
                  placeholder="Base58 public key (required for on-chain registration)"
                  value={agentPubkey}
                  onChange={(e) => setAgentPubkey(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-white font-mono focus:outline-none focus:border-[#FF5533]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-neutral-400 mb-1">Assign Security Policy</label>
                <select
                  value={selectedPolicy}
                  onChange={(e) => setSelectedPolicy(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-white font-mono focus:outline-none focus:border-[#FF5533]"
                >
                  {policies.map((p) => (
                    <option key={p.id} value={p.id} className="bg-[#111317]">
                      {p.name} (Max {p.maxTransferAmount} USDC)
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#FF5533] text-black font-semibold text-xs hover:bg-[#ff6847] active:scale-[0.98] transition-all"
                >
                  Register agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Register On-Chain Modal */}
      {onChainAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[#111317] border border-white/[0.15] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#FF5533]" />
                Register AgentRegistry on-chain
              </h3>
              <button
                onClick={() => setOnChainAgent(null)}
                className="text-neutral-400 hover:text-white text-lg font-mono"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitOnChain} className="space-y-4">
              <p className="text-xs font-mono text-neutral-400">
                Agent: {onChainAgent.name} · Creates the AgentRegistry PDA signed by the configured admin keypair.
              </p>
              <div>
                <label className="block text-xs font-mono text-neutral-400 mb-1">Transfer authority (base58)</label>
                <input
                  type="text"
                  required
                  value={transferAuthority}
                  onChange={(e) => setTransferAuthority(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-white font-mono focus:outline-none focus:border-[#FF5533]"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-neutral-400 mb-1">Agent identity key (base58)</label>
                <input
                  type="text"
                  required
                  value={agentIdentityKey}
                  onChange={(e) => setAgentIdentityKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-white font-mono focus:outline-none focus:border-[#FF5533]"
                />
              </div>
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOnChainAgent(null)}
                  className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#FF5533] text-black font-semibold text-xs hover:bg-[#ff6847] active:scale-[0.98] transition-all"
                >
                  Register on-chain
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
