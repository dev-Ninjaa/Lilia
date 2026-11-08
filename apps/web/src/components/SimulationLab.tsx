"use client";

import React, { useState } from "react";
import { SIMULATION_SCENARIOS } from "../lib/mockData";
import { Agent, Policy, SimulationScenario } from "../lib/types";
import { ApiError, runSimulation } from "../lib/api";
import { Play, CheckCircle2, XCircle, ShieldCheck, Terminal, RefreshCw } from "lucide-react";

interface SimulationLabProps {
  agents?: Agent[];
  policies?: Policy[];
}

type RunStatus = "IDLE" | "RUNNING" | "SUCCESS" | "REJECTED_SENTINEL";

export const SimulationLab: React.FC<SimulationLabProps> = ({ agents = [], policies = [] }) => {
  const [selectedScenario, setSelectedScenario] = useState<SimulationScenario>(SIMULATION_SCENARIOS[0]);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<RunStatus>("IDLE");
  const [error, setError] = useState<string | null>(null);

  const pickTargets = () => {
    const agent = agents.find((a) => a.status === "active") ?? agents[0];
    const policy =
      (agent ? policies.find((p) => p.agentId === agent.id && p.status === "active") : undefined) ??
      (agent ? policies.find((p) => p.agentId === agent.id) : undefined) ??
      policies[0];
    return { agent, policy };
  };

  const runScenario = async (scenario: SimulationScenario) => {
    setSelectedScenario(scenario);
    setError(null);
    setIsRunning(true);
    setStatus("RUNNING");
    setLogs([]);
    const append = (line: string) => setLogs((prev) => [...prev, line]);

    const { agent, policy } = pickTargets();
    append(`[0.00s] Initializing Lilia simulation harness for ${scenario.name}...`);
    if (!agent || !policy) {
      append("[0.10s] No active agent and policy are available. Register an agent and policy first.");
      setError("No live agent/policy available for simulation.");
      setIsRunning(false);
      setStatus("IDLE");
      return;
    }

    const allowedMint = policy.supportedMint.startsWith("Any")
      ? "Token-2022-mint"
      : policy.supportedMint;
    const max = policy.maxTransferAmount;

    let amount: string;
    let recipient: string;
    if (scenario.id === "scenario-b") {
      amount = String(Math.max(scenario.amount, max * 10));
      recipient = policy.blockedRecipients[0] ?? "unknown-recipient";
    } else if (scenario.id === "scenario-c") {
      amount = String(max * 5);
      recipient = policy.allowedRecipients[0] ?? agent.agentPublicKey;
    } else {
      amount = String(Math.min(scenario.amount, max));
      recipient = policy.allowedRecipients[0] ?? agent.agentPublicKey;
    }

    append(
      `[0.10s] Agent: ${agent.name} (${agent.id}) | Policy: ${policy.name} (max ${max}) | Intent: ${amount} -> ${recipient}`,
    );
    append("[0.25s] Calling POST /api/simulation/run (off-chain Sentinel evaluation only)...");
    try {
      const result = await runSimulation({
        agentId: agent.id,
        policyId: policy.id,
        recipient,
        mint: allowedMint,
        amount,
      });
      const decision = result.result;
      append(`[0.50s] Sentinel decision: ${decision.decision.toUpperCase()} (risk ${decision.riskScore}/100, ${decision.riskLevel})`);
      for (const reason of decision.reasons) {
        append(`[0.60s]   - [${reason.severity}] ${reason.ruleId}: ${reason.message}`);
      }
      append(`[0.70s] Blockchain execution: ${decision.blockchainExecution} (no on-chain broadcast).`);
      if (scenario.id === "scenario-c") {
        append("[0.80s] Note: Token-2022 hook enforcement is not exercised by /simulation/run. Use scripts/devnet for on-chain hook verification.");
      }
      append(
        decision.approved
          ? "[0.90s] RESULT: transfer would be approved off-chain; a permit could be requested next."
          : "[0.90s] RESULT: transfer refused off-chain; no permit would be issued.",
      );
      setIsRunning(false);
      setStatus(decision.approved ? "SUCCESS" : "REJECTED_SENTINEL");
    } catch (caught) {
      const message =
        caught instanceof ApiError ? `${caught.code}: ${caught.message}` : "Simulation failed.";
      append(`[0.60s] ERROR: ${message}`);
      setError(message);
      setIsRunning(false);
      setStatus("IDLE");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-semibold uppercase text-neutral-400">
              Live sentinel evaluation
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Terminal className="w-7 h-7 text-[#ff6b4a]" />
            Simulation Lab & Threat Demonstration
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Runs real off-chain Sentinel evaluations via POST /api/simulation/run. No on-chain execution is performed.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full bg-[#111317] border border-white/[0.08] text-xs font-mono text-neutral-300">
            Env: <span className="text-[#14F195] font-bold">Lilia API</span>
          </span>
        </div>
      </div>

      {/* Scenarios Picker Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {SIMULATION_SCENARIOS.map((sc) => {
          const isCurrent = selectedScenario.id === sc.id;
          return (
            <div
              key={sc.id}
              onClick={() => void runScenario(sc)}
              className={`cursor-pointer rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                isCurrent
                  ? "bg-[#161820] border-[#ff6b4a] shadow-[0_0_24px_rgba(255,107,74,0.2)]"
                  : "bg-[#111317] border-white/[0.08] hover:border-white/[0.18]"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                      sc.id === "scenario-a"
                        ? "bg-emerald-500/20 text-[#14F195]"
                        : sc.id === "scenario-b"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-amber-500/20 text-amber-400"
                    }`}
                  >
                    {sc.tag}
                  </span>
                  <Play
                    className={`w-4 h-4 ${
                      isCurrent ? "text-[#ff6b4a] fill-[#ff6b4a]" : "text-neutral-500"
                    }`}
                  />
                </div>
                <h4 className="font-bold text-white text-sm mb-1">{sc.name}</h4>
                <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                  {sc.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/[0.05] flex items-center justify-between text-[11px] font-mono text-neutral-500">
                <span>Amount: {sc.amount} units</span>
                <span className="text-[#ff6b4a] font-semibold flex items-center gap-1">
                  Run test →
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Terminal Execution Window */}
      <div className="rounded-2xl bg-black border border-white/[0.12] p-6 shadow-2xl relative overflow-hidden font-mono text-xs">
        {/* Terminal Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
            <span className="text-neutral-400 ml-2 text-[11px]">
              sentinel-simulation-cli --scenario {selectedScenario.id}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isRunning && (
              <span className="flex items-center gap-1.5 text-xs text-[#ff6b4a] animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Evaluating...
              </span>
            )}
            <button
              onClick={() => void runScenario(selectedScenario)}
              disabled={isRunning}
              className="px-3 py-1 rounded bg-[#ff6b4a] text-black font-bold text-xs hover:bg-[#ff856b] disabled:opacity-50 cursor-pointer"
            >
              Rerun Scenario
            </button>
          </div>
        </div>

        {/* Streaming Logs View */}
        <div className="min-h-[220px] max-h-[340px] overflow-y-auto space-y-1.5 text-neutral-300 pr-2">
          {logs.length === 0 ? (
            <div className="text-neutral-600 italic py-12 text-center">
              Click any scenario card above or &quot;Rerun Scenario&quot; to run a live Sentinel simulation.
            </div>
          ) : (
            logs.map((line, idx) => (
              <div
                key={idx}
                className={
                  line.includes("ERROR") || line.includes("refused")
                    ? "text-[#EF4444] font-bold"
                    : line.includes("approved") || line.includes("RESULT")
                    ? "text-[#14F195] font-semibold"
                    : "text-neutral-300"
                }
              >
                {line}
              </div>
            ))
          )}
        </div>

        {error && (
          <div className="mt-4 pt-4 border-t border-neutral-800 font-mono text-xs text-red-400">{error}</div>
        )}

        {/* Outcome Card Footer */}
        {status !== "IDLE" && !isRunning && (
          <div
            className={`mt-4 pt-4 border-t border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              status === "SUCCESS" ? "text-[#14F195]" : "text-red-400"
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-sm">
              {status === "SUCCESS" ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-[#14F195]" />
                  <span>Simulation complete — Sentinel would approve (off-chain only).</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-400" />
                  <span>Simulation complete — Sentinel would reject (off-chain only).</span>
                </>
              )}
            </div>
            <span className="text-[11px] text-neutral-500 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              blockchainExecution: not_performed
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
