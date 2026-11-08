"use client";

import type { Agent, Policy, SecurityEvent, Transaction } from "@/lib/types";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Cpu,
  Lock,
  Shield,
  XCircle,
} from "lucide-react";
import type React from "react";

interface DashboardViewProps {
  agents: Agent[];
  policies: Policy[];
  transactions: Transaction[];
  events: SecurityEvent[];
  onNavigateTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  agents,
  policies,
  transactions,
  events,
  onNavigateTab,
}) => {
  const activeCount = agents.filter((a) => a.status === "active").length;
  const executedCount = transactions.filter((t) => t.executionStatus === "EXECUTED").length;
  const rejectedCount = transactions.filter(
    (t) =>
      t.executionStatus === "REJECTED_ON_CHAIN" || t.executionStatus === "REJECTED_BY_SENTINEL",
  ).length;
  const protectedVolume = transactions
    .filter((t) => t.executionStatus === "EXECUTED")
    .reduce((sum, t) => sum + t.amount, 0);
  const mintLabel = transactions[0]?.mint
    ? transactions[0].mint.length > 16
      ? `${transactions[0].mint.slice(0, 8)}…${transactions[0].mint.slice(-4)}`
      : transactions[0].mint
    : "No transfers yet";

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner / Headline */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#14F195] animate-pulse" />
            <span className="text-xs font-mono font-semibold uppercase text-neutral-400">
              Control Center • System Overview
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Sentinel Telemetry & Active Guards
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigateTab("simulation")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#FF5533] text-black font-semibold text-xs active:scale-[0.98] transition-all hover:bg-[#ff6847] shadow-[0_0_16px_rgba(255,85,51,0.25)]"
          >
            <span>Launch Hackathon Lab</span>
            <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* 4-Card Bento Stat Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Agents */}
        <div className="rounded-2xl bg-[#111317] border border-white/[0.08] p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Registered Agents</span>
            <Cpu className="w-4 h-4 text-[#FF5533]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono">{activeCount}</span>
            <span className="text-xs text-neutral-500 font-mono">/ {agents.length} Total</span>
          </div>
          <div className="mt-3 flex items-center gap-1 text-[11px] text-[#14F195] font-mono">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>All active identities verified</span>
          </div>
        </div>

        {/* Card 2: Protected Volume */}
        <div className="rounded-2xl bg-[#111317] border border-white/[0.08] p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Protected Capital</span>
            <Lock className="w-4 h-4 text-[#14F195]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono">
              {protectedVolume.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-neutral-500 font-mono">Confirmed units</span>
          </div>
          <div className="mt-3 flex items-center gap-1 text-[11px] text-neutral-400 font-mono">
            <span>Mint: {mintLabel}</span>
          </div>
        </div>

        {/* Card 3: Permits Issued */}
        <div className="rounded-2xl bg-[#111317] border border-white/[0.08] p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Verified Transfers</span>
            <Activity className="w-4 h-4 text-[#06B6D4]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#14F195] font-mono">
              {executedCount}
            </span>
            <span className="text-xs text-neutral-500 font-mono">Confirmed on Devnet</span>
          </div>
          <div className="mt-3 flex items-center gap-1 text-[11px] text-neutral-400 font-mono">
            <span>Ed25519 precompile validated</span>
          </div>
        </div>

        {/* Card 4: Blocked Drains */}
        <div className="rounded-2xl bg-[#111317] border border-white/[0.08] p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-mono uppercase tracking-wider">Threats Thwarted</span>
            <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#EF4444] font-mono">
              {rejectedCount}
            </span>
            <span className="text-xs text-neutral-500 font-mono">Blocked Attacks</span>
          </div>
          <div className="mt-3 flex items-center gap-1 text-[11px] text-red-400 font-mono">
            <span>{rejectedCount} interceptions recorded</span>
          </div>
        </div>
      </div>

      {/* Middle Section: Active Agents Overview + Real-time Security Event Log */}
      <div className="grid grid-cols-1 gap-6">
        {/* Left Column (2/3): Active Agents Summary */}
        <div className="rounded-2xl bg-[#111317] border border-white/[0.08] p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Active Agent Registrations
              </h3>
              <p className="text-xs text-neutral-400">
                Autonomous wallets bound to Lilia Sentinel spending bounds
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab("agents")}
              className="text-xs font-mono text-[#FF5533] hover:underline flex items-center gap-1"
            >
              <span>Manage all agents</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {agents.slice(0, 3).map((agent) => {
              const pct = Math.min(100, Math.round((agent.dailySpent / agent.dailyCap) * 100));
              return (
                <div
                  key={agent.id}
                  className="p-3.5 rounded-xl bg-black/40 border border-white/[0.05] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-white/[0.15] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#FF5533]/15 text-[#FF5533] flex items-center justify-center font-mono font-bold text-sm">
                      *
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{agent.name}</span>
                        <span
                          className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded-full ${
                            agent.status === "active"
                              ? "bg-emerald-500/10 text-[#14F195] border border-emerald-500/20"
                              : "bg-red-500/10 text-red-400 border border-red-500/20"
                          }`}
                        >
                          {agent.status}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-neutral-500">
                        {agent.agentPublicKey}
                      </span>
                    </div>
                  </div>

                  <div className="w-full sm:w-48 text-right">
                    <div className="flex justify-between text-xs font-mono text-neutral-400 mb-1">
                      <span>Daily Cap:</span>
                      <span className="text-white font-bold">
                        {agent.dailySpent} / {agent.dailyCap} USDC
                      </span>
                    </div>
                    <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${pct > 80 ? "bg-red-500" : "bg-[#14F195]"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (1/3): Real-Time Threat Stream */}
        <div className="rounded-2xl bg-[#111317] border border-white/[0.08] p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#FF5533]" />
                Threat Event Stream
              </h3>
              <p className="text-xs text-neutral-400 font-mono">Live Sentinel Interceptions</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab("threats")}
              className="text-xs font-mono text-neutral-400 hover:text-white"
            >
              View all
            </button>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-[420px] pr-1">
            {events.map((evt) => (
              <div
                key={evt.id}
                className="p-2.5 rounded-lg bg-black/40 border border-white/[0.05] text-xs font-mono space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                      evt.severity === "critical"
                        ? "bg-red-500/20 text-red-400"
                        : evt.severity === "high"
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-blue-500/20 text-blue-400"
                    }`}
                  >
                    {evt.eventType.replace(/_/g, " ")}
                  </span>
                  <span className="text-[10px] text-neutral-500">{evt.timestamp}</span>
                </div>
                <p className="text-neutral-300 text-[11px] leading-relaxed">{evt.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
