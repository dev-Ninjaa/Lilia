"use client";

import React, { useState } from "react";
import { Policy } from "../lib/types";
import { Shield, Plus, Lock, CheckCircle2, XCircle, Sliders, Clock, Key } from "lucide-react";

interface PoliciesViewProps {
  policies: Policy[];
  onCreatePolicy: (policy: Partial<Policy>) => void;
}

export const PoliciesView: React.FC<PoliciesViewProps> = ({
  policies,
  onCreatePolicy,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [maxAmount, setMaxAmount] = useState(500);
  const [dailyCap, setDailyCap] = useState(2500);
  const [allowedRecipients, setAllowedRecipients] = useState("");
  const [blockedRecipients, setBlockedRecipients] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    const allowed = allowedRecipients
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const blocked = blockedRecipients
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    onCreatePolicy({
      name,
      maxTransferAmount: maxAmount,
      dailyLimit: dailyCap,
      allowedRecipients: allowed,
      blockedRecipients: blocked,
      supportedMint: "Token22zP...M1ntUsdc92x4",
      mintSymbol: "USDC-2022",
      status: "active",
      replayProtection: true,
      ttlSeconds: 60,
    });

    setName("");
    setAllowedRecipients("");
    setBlockedRecipients("");
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-semibold uppercase text-neutral-400">
              Policy & Rules Specification
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            On-Chain Security Policies
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Enforced by Sentinel off-chain and verified by Token-2022 Transfer Hook on-chain
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#FF5533] text-black font-semibold text-xs active:scale-[0.98] transition-all hover:bg-[#ff6847] shadow-[0_0_16px_rgba(255,85,51,0.2)]"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Create New Policy</span>
        </button>
      </div>

      {/* Policies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {policies.map((policy) => (
          <div
            key={policy.id}
            className="rounded-2xl bg-[#111317] border border-white/[0.08] p-6 flex flex-col justify-between hover:border-white/[0.18] transition-all relative overflow-hidden"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FF5533]/10 text-[#FF5533] border border-[#FF5533]/20 font-bold">
                  {policy.mintSymbol}
                </span>
                <span className="text-xs font-mono text-[#14F195] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#14F195]"></span>
                  Active
                </span>
              </div>

              <h3 className="text-lg font-bold text-white tracking-tight mb-2">
                {policy.name}
              </h3>

              <div className="space-y-3 font-mono text-xs my-4 bg-black/40 p-3.5 rounded-xl border border-white/[0.05]">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">Max / Transaction:</span>
                  <span className="text-white font-bold">{policy.maxTransferAmount} USDC</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">Daily Velocity Cap:</span>
                  <span className="text-white font-bold">{policy.dailyLimit} USDC</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">Permit TTL:</span>
                  <span className="text-neutral-300">{policy.ttlSeconds}s (Replay Protected)</span>
                </div>
              </div>

              {/* Recipient Constraints */}
              <div className="space-y-2 mt-4 text-xs font-mono">
                <div className="text-neutral-400 text-[11px] font-semibold">
                  Allowed Destinations ({policy.allowedRecipients.length}):
                </div>
                {policy.allowedRecipients.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                    {policy.allowedRecipients.map((rec, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-emerald-500/10 text-[#14F195] border border-emerald-500/20 text-[10px]"
                      >
                        {rec.substring(0, 12)}...
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-neutral-600 italic text-[11px]">No allowlist restrictions</span>
                )}

                {policy.blockedRecipients.length > 0 && (
                  <div className="mt-2">
                    <div className="text-red-400 text-[11px] font-semibold">
                      Blocked Targets ({policy.blockedRecipients.length}):
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {policy.blockedRecipients.map((rec, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-[10px]"
                        >
                          {rec.substring(0, 14)}...
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-neutral-500">
              <span>Token-2022 Transfer Hook</span>
              <span className="text-neutral-400">Sync: PDA Verified</span>
            </div>
          </div>
        ))}
      </div>

      {/* Create Policy Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-[#111317] border border-white/[0.15] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#FF5533]" />
                Create On-Chain Policy
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
                <label className="block text-xs font-mono text-neutral-400 mb-1">Policy Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Micro-payments & Gas Allowance"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-white focus:outline-none focus:border-[#FF5533]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-neutral-400 mb-1">Max per Tx (USDC)</label>
                  <input
                    type="number"
                    required
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-white font-mono focus:outline-none focus:border-[#FF5533]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-neutral-400 mb-1">Daily Cap (USDC)</label>
                  <input
                    type="number"
                    required
                    value={dailyCap}
                    onChange={(e) => setDailyCap(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-white font-mono focus:outline-none focus:border-[#FF5533]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-neutral-400 mb-1">
                  Allowed Recipient Public Keys (One per line)
                </label>
                <textarea
                  rows={2}
                  placeholder="Paste allowed destination addresses..."
                  value={allowedRecipients}
                  onChange={(e) => setAllowedRecipients(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-white font-mono focus:outline-none focus:border-[#FF5533]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-neutral-400 mb-1">
                  Blocked Recipient Public Keys (One per line)
                </label>
                <textarea
                  rows={2}
                  placeholder="Paste blacklisted hacker addresses..."
                  value={blockedRecipients}
                  onChange={(e) => setBlockedRecipients(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-white font-mono focus:outline-none focus:border-[#FF5533]"
                />
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
                  Save & Commit Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
