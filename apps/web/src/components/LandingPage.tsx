"use client";

import { AuroraBackground } from "@/components/AuroraBackground";
import { HeroSection } from "@/components/HeroSection";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  ExternalLink,
  Key,
  Layers,
  Lock,
  Play,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import type React from "react";
import { useState } from "react";

function GithubIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

interface LandingPageProps {
  launchHref?: string;
}

type ScenarioId = "A" | "B" | "C";

export const LandingPage: React.FC<LandingPageProps> = ({ launchHref = "/console/overview" }) => {
  const [activeScenario, setActiveScenario] = useState<ScenarioId>("A");
  const [activeTab, setActiveTab] = useState<"mcp" | "rest">("mcp");
  const [copied, setCopied] = useState(false);

  const mcpCode = `{
  "mcpServers": {
    "lilia": {
      "command": "bunx",
      "args": ["@lilia/mcp-server"]
    }
  }
}`;

  const restCode = `curl -X POST https://api.lilia.xyz/v1/permits \\
  -H "Authorization: Bearer lilia_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"agentId":"ag_01","amount":500000000,"recipient":"7xx9...4a1M"}'`;

  const copyCode = () => {
    const code = activeTab === "mcp" ? mcpCode : restCode;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative min-h-screen bg-[#07080a] text-white selection:bg-[#ff6b4a]/20 selection:text-white">
      {/* ── Living Animated Aurora Background (Spans Entire Frontend) ── */}
      <AuroraBackground isFixed={true} />

      {/* ── Main Foreground Page Content ── */}
      <div className="relative z-10">
        {/* Hero Section */}
        <HeroSection launchHref={launchHref} />

        <div className="max-w-7xl mx-auto px-6 space-y-36 pb-28">
          {/* ── 01 / THE PROBLEM ──────────────────────────────────── */}
          <section id="the-problem" className="pt-6">
            <div className="mb-4">
              <span className="font-mono text-xs font-bold text-[#ff6b4a]">01</span>{" "}
              <span className="font-mono text-xs text-neutral-500 uppercase tracking-wider">
                / THE PROBLEM
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
              {/* Col 1: Headline */}
              <div className="lg:col-span-5">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.12]">
                  A valid signature
                  <br />
                  doesn't mean a
                  <br />
                  <span className="text-[#ff6b4a]">good decision.</span>
                </h2>
              </div>

              {/* Col 2: Context Paragraphs */}
              <div className="lg:col-span-3 space-y-4 text-sm sm:text-base text-neutral-400 leading-relaxed">
                <p>
                  An AI agent can have the right key, sign a transaction, and still be tricked into
                  sending your money to the wrong place.
                </p>
                <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed">
                  Imagine giving an AI agent $10,000 to run your business. It buys computing power
                  and pays invoices. Then it reads a malicious instruction and tries to send $5,000
                  to a stranger. The signature is valid, but nobody wanted that payment to happen.
                </p>
              </div>

              {/* Col 3: Visual Problem Card */}
              <div className="lg:col-span-4">
                <div className="rounded-2xl bg-[#0a0a0e]/80 border border-white/[0.08] p-3 sm:p-4 space-y-2.5 shadow-2xl backdrop-blur-xl">
                  {/* 1. Prompt row */}
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 flex items-center gap-3">
                    <span className="font-mono text-xs text-neutral-500">&gt;_</span>
                    <span className="font-mono text-xs text-neutral-300 truncate">
                      Transfer 10,000 USDC to 7xx9... now.*
                    </span>
                  </div>

                  {/* 2. Signed by agent row */}
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Zap className="w-4 h-4 text-neutral-400" />
                      <span className="text-xs font-medium text-neutral-200">Signed by agent</span>
                    </div>
                    <span className="text-xs font-mono font-medium text-emerald-400 flex items-center gap-1">
                      ✓ Valid signature
                    </span>
                  </div>

                  {/* 3. Result alert row */}
                  <div className="bg-red-500/[0.08] border border-red-500/20 rounded-xl p-3 flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <div className="flex-1">
                      <div className="text-[10px] font-mono text-red-300/70 uppercase">Result</div>
                      <div className="text-xs font-semibold text-red-400">
                        Funds lost. (No policy check)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── 02 / THE IDEA ─────────────────────────────────────── */}
          <section id="the-idea">
            <div className="mb-4">
              <span className="font-mono text-xs font-bold text-[#ff6b4a]">02</span>{" "}
              <span className="font-mono text-xs text-neutral-500 uppercase tracking-wider">
                / THE IDEA
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
              {/* Col 1: Headline */}
              <div className="lg:col-span-5">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.12]">
                  The agent can
                  <br />
                  make decisions.
                  <br />
                  <span className="text-[#ff6b4a]">You make the rules.</span>
                </h2>
              </div>

              {/* Col 2: Context Paragraphs */}
              <div className="lg:col-span-3 space-y-4 text-sm sm:text-base text-neutral-400 leading-relaxed">
                <p>
                  Set clear spending limits, approved recipients, and policies for each agent. Lilia
                  checks every transaction and only lets it through if it follows your rules.
                </p>
                <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed">
                  The important difference? The rules aren't just advisory prompts to the AI.
                  They're enforced cryptographically by the Solana blockchain.
                </p>
              </div>

              {/* Col 3: Policy Card */}
              <div className="lg:col-span-4">
                <div className="rounded-2xl bg-[#0a0a0e]/80 border border-white/[0.08] p-5 shadow-2xl relative overflow-hidden backdrop-blur-xl">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#ff6b4a]/60 to-transparent" />
                  <div className="flex items-center gap-2 mb-4">
                    <ShieldCheck className="w-4 h-4 text-[#ff6b4a]" />
                    <span className="text-sm font-semibold text-white">Your Policy</span>
                  </div>

                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
                      <span className="text-neutral-400 flex items-center gap-2">
                        <Coins className="w-3.5 h-3.5 text-neutral-500" />
                        Max per transaction
                      </span>
                      <span className="text-white font-medium">1,000 USDC</span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
                      <span className="text-neutral-400 flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-neutral-500" />
                        Approved recipients
                      </span>
                      <span className="text-white font-medium">3 wallets</span>
                    </div>

                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-neutral-400 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-neutral-500" />
                        Permit validity
                      </span>
                      <span className="text-white font-medium">60 seconds</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── 03 / HOW IT WORKS ─────────────────────────────────── */}
          <section id="how-it-works">
            <div className="mb-4">
              <span className="font-mono text-xs font-bold text-[#ff6b4a]">03</span>{" "}
              <span className="font-mono text-xs text-neutral-500 uppercase tracking-wider">
                / HOW IT WORKS
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.12] mb-12">
              Every payment has
              <br />
              to earn its permission.
            </h2>

            {/* 4-Step Connected Rail */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
              {/* Step 1: Agent Request */}
              <div className="p-5 rounded-2xl bg-[#0a0a0e]/80 border border-white/[0.08] backdrop-blur-xl flex flex-col items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Agent Request</div>
                  <div className="text-xs text-neutral-400 mt-1">Proposes a transfer.</div>
                </div>
              </div>

              {/* Step 2: Lilia Sentinel */}
              <div className="p-5 rounded-2xl bg-[#0a0a0e]/80 border border-[#ff6b4a]/50 shadow-[0_0_30px_rgba(255,107,74,0.2)] backdrop-blur-xl flex flex-col items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-[#ff6b4a]/20 border border-[#ff6b4a] shadow-[0_0_20px_rgba(255,107,74,0.5)] flex items-center justify-center text-[#ff6b4a]">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Lilia Sentinel</div>
                  <div className="text-xs text-neutral-400 mt-1">Checks limits and recipients.</div>
                </div>
              </div>

              {/* Step 3: Signed Permit */}
              <div className="p-5 rounded-2xl bg-[#0a0a0e]/80 border border-white/[0.08] backdrop-blur-xl flex flex-col items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Signed Permit</div>
                  <div className="text-xs text-neutral-400 mt-1">
                    Issues a short-lived authorization.
                  </div>
                </div>
              </div>

              {/* Step 4: On-Chain Hook */}
              <div className="p-5 rounded-2xl bg-[#0a0a0e]/80 border border-white/[0.08] backdrop-blur-xl flex flex-col items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">On-Chain Hook</div>
                  <div className="text-xs text-neutral-400 mt-1">
                    Verifies the permit and rules.
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── 04 / TRY IT YOURSELF (Simulation Lab) ─────────────── */}
          <section id="simulation-lab">
            <div className="mb-4">
              <span className="font-mono text-xs font-bold text-[#ff6b4a]">04</span>{" "}
              <span className="font-mono text-xs text-neutral-500 uppercase tracking-wider">
                / TRY IT YOURSELF
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left: Info + Scenarios */}
              <div className="lg:col-span-5 space-y-6">
                <div>
                  <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                    Simulation Lab
                  </h2>
                  <p className="mt-3 text-sm text-neutral-400 leading-relaxed">
                    Run real transaction scenarios and see how Lilia approves safe transfers and
                    blocks malicious ones in real time.
                  </p>
                </div>

                {/* 3 Selectable Scenario Buttons */}
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveScenario("A")}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center gap-3 cursor-pointer ${
                      activeScenario === "A"
                        ? "bg-[#ff6b4a]/15 border-[#ff6b4a]/70 shadow-[0_0_20px_rgba(255,107,74,0.2)]"
                        : "bg-[#0a0a0e]/70 border-white/[0.07] hover:border-white/[0.15]"
                    }`}
                  >
                    <Play
                      className={`w-4 h-4 ${
                        activeScenario === "A"
                          ? "fill-[#ff6b4a] text-[#ff6b4a]"
                          : "text-neutral-400"
                      }`}
                    />
                    <div className="flex-1">
                      <span
                        className={`text-xs font-semibold ${
                          activeScenario === "A" ? "text-white" : "text-neutral-300"
                        }`}
                      >
                        A. Legitimate Transfer
                      </span>
                    </div>
                    {activeScenario === "A" && (
                      <span className="text-[10px] font-mono text-[#ff6b4a] font-bold">ACTIVE</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveScenario("B")}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center gap-3 cursor-pointer ${
                      activeScenario === "B"
                        ? "bg-[#ff6b4a]/15 border-[#ff6b4a]/70 shadow-[0_0_20px_rgba(255,107,74,0.2)]"
                        : "bg-[#0a0a0e]/70 border-white/[0.07] hover:border-white/[0.15]"
                    }`}
                  >
                    <ShieldAlert
                      className={`w-4 h-4 ${
                        activeScenario === "B" ? "text-[#ff6b4a]" : "text-neutral-400"
                      }`}
                    />
                    <div className="flex-1">
                      <span
                        className={`text-xs font-semibold ${
                          activeScenario === "B" ? "text-white" : "text-neutral-300"
                        }`}
                      >
                        B. Prompt Injection / Drain
                      </span>
                    </div>
                    {activeScenario === "B" && (
                      <span className="text-[10px] font-mono text-[#ff6b4a] font-bold">ACTIVE</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveScenario("C")}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center gap-3 cursor-pointer ${
                      activeScenario === "C"
                        ? "bg-[#ff6b4a]/15 border-[#ff6b4a]/70 shadow-[0_0_20px_rgba(255,107,74,0.2)]"
                        : "bg-[#0a0a0e]/70 border-white/[0.07] hover:border-white/[0.15]"
                    }`}
                  >
                    <Lock
                      className={`w-4 h-4 ${
                        activeScenario === "C" ? "text-[#ff6b4a]" : "text-neutral-400"
                      }`}
                    />
                    <div className="flex-1">
                      <span
                        className={`text-xs font-semibold ${
                          activeScenario === "C" ? "text-white" : "text-neutral-300"
                        }`}
                      >
                        C. On-Chain Limit Bypass
                      </span>
                    </div>
                    {activeScenario === "C" && (
                      <span className="text-[10px] font-mono text-[#ff6b4a] font-bold">ACTIVE</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Right: Dynamic Interactive Terminal Console */}
              <div className="lg:col-span-7">
                <div className="rounded-2xl bg-[#050608]/90 border border-white/[0.08] p-5 shadow-2xl font-mono text-xs backdrop-blur-xl">
                  {/* Terminal Header */}
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                      <span className="ml-2 text-neutral-400 text-[11px]">
                        {activeScenario === "A" && "Running: Scenario A – Legitimate Transfer"}
                        {activeScenario === "B" && "Running: Scenario B – Prompt Injection / Drain"}
                        {activeScenario === "C" && "Running: Scenario C – On-Chain Limit Bypass"}
                      </span>
                    </div>
                    <span className="text-[11px] text-neutral-500">
                      {activeScenario === "A" && "= 412 ms"}
                      {activeScenario === "B" && "= 8 ms (halted)"}
                      {activeScenario === "C" && "= 640 ms (rollback)"}
                    </span>
                  </div>

                  {/* Scenario A Logs */}
                  {activeScenario === "A" && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-neutral-300">
                        <span className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          Evaluate policy (limit: 1,000 USDC)
                        </span>
                        <span className="text-emerald-400 font-bold">... PASS</span>
                      </div>

                      <div className="flex items-center justify-between text-neutral-300">
                        <span className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          Check recipient allowlist
                        </span>
                        <span className="text-emerald-400 font-bold">... PASS</span>
                      </div>

                      <div className="flex items-center justify-between text-neutral-300">
                        <span className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          Issue Ed25519 permit
                        </span>
                        <span className="text-emerald-400 font-bold">... SIGNED</span>
                      </div>

                      <div className="flex items-center justify-between text-neutral-300">
                        <span className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          Token-2022 hook validation (on-chain)
                        </span>
                        <span className="text-emerald-400 font-bold">... PASS</span>
                      </div>

                      <div className="pt-3 border-t border-white/[0.06] text-emerald-400 flex items-center gap-2 font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Transaction confirmed on Solana Devnet</span>
                      </div>
                    </div>
                  )}

                  {/* Scenario B Logs */}
                  {activeScenario === "B" && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-neutral-300">
                        <span className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          Evaluate policy (attempt: 40,000 USDC)
                        </span>
                        <span className="text-red-400 font-bold">... EXCEEDS CAP</span>
                      </div>

                      <div className="flex items-center justify-between text-neutral-300">
                        <span className="flex items-center gap-2 text-red-400 font-semibold">
                          ✗ Check recipient allowlist (attacker sink: 7xx9...4a1M)
                        </span>
                        <span className="text-red-400 font-bold">... REJECTED</span>
                      </div>

                      <div className="flex items-center justify-between text-neutral-300">
                        <span className="flex items-center gap-2 text-amber-400">
                          ! Contextual threat scan: Indirect Prompt Injection Drain
                        </span>
                        <span className="text-amber-400 font-bold">... SCORE: 0.98</span>
                      </div>

                      <div className="flex items-center justify-between text-neutral-300">
                        <span className="flex items-center gap-2 text-red-400 font-semibold">
                          ✗ Issue Ed25519 permit
                        </span>
                        <span className="text-red-400 font-bold">... REFUSED BY SENTINEL</span>
                      </div>

                      <div className="pt-3 border-t border-white/[0.06] text-amber-400 flex items-center gap-2 font-semibold">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Transfer halted off-chain with 0 gas spent</span>
                      </div>
                    </div>
                  )}

                  {/* Scenario C Logs */}
                  {activeScenario === "C" && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-neutral-300">
                        <span className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          Sentinel permit issued for 1,000 USDC cap
                        </span>
                        <span className="text-emerald-400 font-bold">... SIGNED</span>
                      </div>

                      <div className="flex items-center justify-between text-neutral-300">
                        <span className="flex items-center gap-2 text-amber-400">
                          ! Attacker attempts direct RPC broadcast: 5,000 USDC
                        </span>
                        <span className="text-amber-400 font-bold">... DETECTED</span>
                      </div>

                      <div className="flex items-center justify-between text-neutral-300">
                        <span className="flex items-center gap-2 text-red-400 font-semibold">
                          ✗ Token-2022 Transfer Hook execution
                        </span>
                        <span className="text-red-400 font-bold">... FAILED_ON_CHAIN</span>
                      </div>

                      <div className="flex items-center justify-between text-neutral-300">
                        <span className="flex items-center gap-2 text-red-400">
                          ✗ Custom Program Error: 0x1771 (ExceededPolicyVelocity)
                        </span>
                        <span className="text-red-400 font-bold">... ABORTED</span>
                      </div>

                      <div className="pt-3 border-t border-white/[0.06] text-red-400 flex items-center gap-2 font-semibold">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Consensus-level validator rollback committed</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ── 05 / INTEGRATIONS ─────────────────────────────────── */}
          <section id="integrations">
            <div className="mb-4">
              <span className="font-mono text-xs font-bold text-[#ff6b4a]">05</span>{" "}
              <span className="font-mono text-xs text-neutral-500 uppercase tracking-wider">
                / INTEGRATIONS
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Col 1: Text Description */}
              <div className="lg:col-span-4">
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
                  Plug into
                  <br />
                  <span className="text-[#ff6b4a]">your agent.</span>
                </h2>
                <p className="mt-4 text-sm text-neutral-400 leading-relaxed">
                  Use Lilia with Claude, Cursor, or any MCP-compatible agent. Or integrate directly
                  with a simple REST API.
                </p>
              </div>

              {/* Col 2: Code Window with Tabs & Copy Button */}
              <div className="lg:col-span-5">
                <div className="rounded-2xl bg-[#050608]/90 border border-white/[0.08] p-4 font-mono text-xs shadow-2xl relative backdrop-blur-xl">
                  {/* Tabs */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab("mcp")}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          activeTab === "mcp"
                            ? "bg-[#ff6b4a]/15 text-[#ff6b4a] border border-[#ff6b4a]/30"
                            : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        MCP (Claude / Cursor)
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("rest")}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          activeTab === "rest"
                            ? "bg-[#ff6b4a]/15 text-[#ff6b4a] border border-[#ff6b4a]/30"
                            : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        REST API
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={copyCode}
                      className="p-1.5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                      aria-label="Copy code snippet"
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Preformatted Code */}
                  <pre className="text-neutral-300 leading-relaxed overflow-x-auto text-[11px] p-1">
                    {activeTab === "mcp" ? mcpCode : restCode}
                  </pre>
                </div>
              </div>

              {/* Col 3: Feature Pills */}
              <div className="lg:col-span-3 space-y-4">
                <div className="p-4 rounded-xl bg-[#0a0a0e]/70 border border-white/[0.06] backdrop-blur-md flex items-start gap-3">
                  <Zap className="w-4 h-4 text-[#ff7733] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-white">7 MCP Tools</div>
                    <div className="text-[11px] text-neutral-400 mt-0.5 leading-snug">
                      evaluate_transaction, request_authorization, and more.
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#0a0a0e]/70 border border-white/[0.06] backdrop-blur-md flex items-start gap-3">
                  <Layers className="w-4 h-4 text-[#ff7733] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-white">Works with your stack</div>
                    <div className="text-[11px] text-neutral-400 mt-0.5 leading-snug">
                      Claude, Cursor, LangChain, or custom agents.
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#0a0a0e]/70 border border-white/[0.06] backdrop-blur-md flex items-start gap-3">
                  <ShieldCheck className="w-4 h-4 text-[#ff7733] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-white">No changes to your agent</div>
                    <div className="text-[11px] text-neutral-400 mt-0.5 leading-snug">
                      Add security without rewriting your workflows.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── 06 / THE PROOF ────────────────────────────────────── */}
          <section id="the-proof">
            <div className="mb-4">
              <span className="font-mono text-xs font-bold text-[#ff6b4a]">06</span>{" "}
              <span className="font-mono text-xs text-neutral-500 uppercase tracking-wider">
                / THE PROOF
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Col 1: Headline */}
              <div className="lg:col-span-4">
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
                  Built to enforce.
                  <br />
                  <span className="text-[#ff6b4a]">Not just to warn.</span>
                </h2>
              </div>

              {/* Col 2: Description */}
              <div className="lg:col-span-5 text-sm sm:text-base text-neutral-400 leading-relaxed">
                Lilia's Token-2022 Transfer Hook is deployed on Solana Devnet, with 18 passing tests
                covering valid transfers, replays, expiries, and policy violations.
              </div>

              {/* Col 3: External Links */}
              <div className="lg:col-span-3 space-y-3">
                <a
                  href="https://explorer.solana.com/address/L1L1A11111111111111111111111111111111111111?cluster=devnet"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3.5 rounded-xl bg-[#0a0a0e]/70 border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.15] transition-all group backdrop-blur-md"
                >
                  <div className="flex items-center gap-2.5">
                    <Zap className="w-4 h-4 text-[#ff6b4a]" />
                    <span className="text-xs font-medium text-white">View on Solana Explorer</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white transition-colors" />
                </a>

                <a
                  href="https://github.com/dev-Ninjaa/Lilia"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3.5 rounded-xl bg-[#0a0a0e]/70 border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.15] transition-all group backdrop-blur-md"
                >
                  <div className="flex items-center gap-2.5">
                    <GithubIcon className="w-4 h-4 text-neutral-300" />
                    <span className="text-xs font-medium text-white">Explore on GitHub</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white transition-colors" />
                </a>
              </div>
            </div>
          </section>

          {/* ── THE END / FINAL CALL TO ACTION (Spheres completely removed) ── */}
          <section className="relative pt-24 pb-16 flex flex-col items-center justify-center text-center">
            <div className="relative z-10 max-w-2xl mx-auto space-y-4">
              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
                Let agents act.
                <br />
                <span className="bg-gradient-to-r from-[#ffb347] via-[#ff6b4a] to-[#ff2f3a] bg-clip-text text-transparent">
                  Keep the final say.
                </span>
              </h2>

              <p className="text-sm sm:text-base text-neutral-400 font-normal max-w-md mx-auto">
                Build secure, policy-bound AI agents on Solana.
              </p>

              <div className="pt-4">
                <Link
                  href={launchHref}
                  className="btn-white px-7 py-3 text-sm font-semibold flex items-center gap-2 cursor-pointer shadow-xl inline-flex"
                >
                  <span>Start Building with Lilia</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </section>
        </div>

        {/* ── MINIMALIST FOOTER ─────────────────────────────────── */}
        <footer className="border-t border-white/[0.06] py-8 text-center text-xs text-neutral-500 font-mono bg-[#07080a]/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>© {new Date().getFullYear()} Lilia Protocol. Enforced on Solana.</div>
            <div className="flex items-center gap-6">
              <a
                href="https://github.com/dev-Ninjaa/Lilia"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-neutral-300 transition-colors"
              >
                GitHub
              </a>
              <a
                href="https://github.com/dev-Ninjaa/Lilia#readme"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-neutral-300 transition-colors"
              >
                Documentation
              </a>
              <Link href={launchHref} className="hover:text-neutral-300 transition-colors">
                Console
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};
