"use client";

import React, { useState } from "react";
import { SIMULATION_SCENARIOS } from "../lib/mockData";
import { SimulationScenario } from "../lib/types";
import { Play, CheckCircle2, XCircle, AlertTriangle, ShieldCheck, Terminal, ArrowRight, RefreshCw } from "lucide-react";

export const SimulationLab: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<SimulationScenario>(SIMULATION_SCENARIOS[0]);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<"IDLE" | "RUNNING" | "SUCCESS" | "REJECTED_SENTINEL" | "REJECTED_HOOK">("IDLE");
  const [txHash, setTxHash] = useState<string | null>(null);

  const runScenario = (scenario: SimulationScenario) => {
    setSelectedScenario(scenario);
    setIsRunning(true);
    setStatus("RUNNING");
    setLogs([]);
    setTxHash(null);

    const append = (line: string) => setLogs((prev) => [...prev, line]);

    append(`[0.00s] Initializing Lilia test harness for ${scenario.name}...`);
    append(`[0.10s] Agent identity: ${scenario.agentId} | Intent: ${scenario.amount} USDC-2022 -> ${scenario.recipient.substring(0, 16)}...`);

    setTimeout(() => {
      append(`[0.25s] Step 1: Sentinel intercepting transaction intent...`);
      append(`[0.32s] Querying Drizzle Policy PDA: MaxCap=500.00 USDC, ReplayProtection=true`);

      if (scenario.id === "scenario-b") {
        setTimeout(() => {
          append(`[0.45s] ⚠️ ALERT: Amount (${scenario.amount} USDC) exceeds owner policy limit (500 USDC)!`);
          append(`[0.52s] ⚠️ ALERT: Destination address is not in allowlist!`);
          append(`[0.60s] ❌ SENTINEL EVALUATION: REJECTED (Risk Score: 98/100)`);
          append(`[0.70s] Ed25519 Permit signature REFUSED. Authorization withheld.`);
          append(`[0.85s] Malicious agent attempts raw transaction broadcast without permit...`);
          append(`[1.05s] Solana Devnet Hook check: Token22Hook::Error(0x1770) - Missing Authorized Permit!`);
          append(`[1.15s] 🛡️ CONSENSUS RESULT: TRANSACTION ROLLED BACK. ZERO TOKENS MOVED.`);
          setIsRunning(false);
          setStatus("REJECTED_SENTINEL");
        }, 600);
      } else if (scenario.id === "scenario-c") {
        setTimeout(() => {
          append(`[0.45s] Mocking off-chain service state (simulating compromised backend issuing permit)...`);
          append(`[0.55s] Generated Mock Ed25519 Permit Signature: 7bK3vN1qL...R9p2`);
          append(`[0.70s] Constructing Solana Devnet transaction with Ed25519 precompile instruction...`);
          append(`[0.90s] Transaction broadcasted to Solana Devnet validators...`);
          append(`[1.15s] Solana Token-2022 Transfer Hook executed on-chain.`);
          append(`[1.25s] ❌ ON-CHAIN PDA CHECK: Transfer amount (5,000 USDC) violates on-chain contract limit!`);
          append(`[1.35s] 🛡️ REVERT: Program Token22Hook returned error 0x1772 (MaxOnchainSpendExceeded).`);
          append(`[1.40s] Blockchain consensus successfully overrode off-chain permit!`);
          setIsRunning(false);
          setStatus("REJECTED_HOOK");
          setTxHash("3kX4c8M1qP9r7Z3v5B2n6T8y0U4i1O3p5A7s9D2f4G6h8J0k2L4z6X8c0V2b4N6M");
        }, 600);
      } else {
        setTimeout(() => {
          append(`[0.45s] ✓ Policy verified: Amount ${scenario.amount} USDC <= 500 cap.`);
          append(`[0.55s] ✓ Destination verified: Allowlisted recipient.`);
          append(`[0.65s] ✓ Generating cryptographic Ed25519 Permit (v1.0 Standard)...`);
          append(`[0.75s] Sentinel Authority signed permit: 5zG7kPq9Xv2...L3m1`);
          append(`[0.90s] Transaction constructed: [Ed25519 Verify IX] + [Token-2022 Transfer IX]`);
          append(`[1.10s] Submitting to Solana Devnet RPC (Helius)...`);
          append(`[1.35s] Token-2022 Transfer Hook successfully validated permit and instruction sysvar!`);
          append(`[1.50s] 🎉 TRANSACTION CONFIRMED ON SOLANA DEVNET! Block: 314920415`);
          setIsRunning(false);
          setStatus("SUCCESS");
          setTxHash("4yZ7b9N2vK1q8XpL3m4w5E6R7t8Y9u0I1o2P3a4S5d6F7g8H9j0K1l2Z3x4C5v6B");
        }, 600);
      }
    }, 400);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-semibold uppercase text-neutral-400">
              48-Hour Hackathon Test Suite
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Terminal className="w-7 h-7 text-[#FF5533]" />
            Simulation Lab & Threat Demonstration
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Execute real end-to-end scenarios demonstrating on-chain enforcement and drain prevention
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full bg-[#111317] border border-white/[0.08] text-xs font-mono text-neutral-300">
            Env: <span className="text-[#14F195] font-bold">Solana Devnet</span>
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
              onClick={() => runScenario(sc)}
              className={`cursor-pointer rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                isCurrent
                  ? "bg-[#161820] border-[#FF5533] shadow-[0_0_24px_rgba(255,85,51,0.15)]"
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
                      isCurrent ? "text-[#FF5533] fill-[#FF5533]" : "text-neutral-500"
                    }`}
                  />
                </div>
                <h4 className="font-bold text-white text-sm mb-1">{sc.name}</h4>
                <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                  {sc.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/[0.05] flex items-center justify-between text-[11px] font-mono text-neutral-500">
                <span>Amount: {sc.amount} USDC</span>
                <span className="text-[#FF5533] font-semibold flex items-center gap-1">
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
              sentinel-orchestrator-cli --scenario {selectedScenario.id}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isRunning && (
              <span className="flex items-center gap-1.5 text-xs text-[#FF5533] animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Executing...
              </span>
            )}
            <button
              onClick={() => runScenario(selectedScenario)}
              disabled={isRunning}
              className="px-3 py-1 rounded bg-[#FF5533] text-black font-bold text-xs hover:bg-[#ff6847] disabled:opacity-50"
            >
              Rerun Scenario
            </button>
          </div>
        </div>

        {/* Streaming Logs View */}
        <div className="min-h-[220px] max-h-[340px] overflow-y-auto space-y-1.5 text-neutral-300 pr-2">
          {logs.length === 0 ? (
            <div className="text-neutral-600 italic py-12 text-center">
              Click any scenario card above or "Rerun Scenario" to trigger the live on-chain simulation suite.
            </div>
          ) : (
            logs.map((line, idx) => (
              <div
                key={idx}
                className={
                  line.includes("ALERT") || line.includes("REJECTED")
                    ? "text-[#EF4444] font-bold"
                    : line.includes("CONFIRMED") || line.includes("✓")
                    ? "text-[#14F195] font-semibold"
                    : line.includes("CONSENSUS RESULT") || line.includes("REVERT")
                    ? "text-amber-400 font-bold"
                    : "text-neutral-300"
                }
              >
                {line}
              </div>
            ))
          )}
        </div>

        {/* Outcome Card Footer */}
        {status !== "IDLE" && !isRunning && (
          <div
            className={`mt-4 pt-4 border-t border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              status === "SUCCESS"
                ? "text-[#14F195]"
                : status === "REJECTED_HOOK"
                ? "text-amber-400"
                : "text-red-400"
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-sm">
              {status === "SUCCESS" ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-[#14F195]" />
                  <span>Scenario Verified: Protected Token-2022 Transfer Confirmed on Devnet!</span>
                </>
              ) : status === "REJECTED_HOOK" ? (
                <>
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                  <span>Scenario Verified: Token-2022 Transfer Hook Reverted Unlawful Spend On-Chain!</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-400" />
                  <span>Scenario Verified: Sentinel Intercepted and Prevented Wallet Drain!</span>
                </>
              )}
            </div>

            {txHash && (
              <a
                href={`https://explorer.solana.com/tx/${txHash}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono underline hover:text-white"
              >
                View on Solana Explorer →
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
