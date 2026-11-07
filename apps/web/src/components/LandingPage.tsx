"use client";

import React, { useState } from "react";
import { ThreeGlobe } from "./ThreeGlobe";
import { SimulationLab } from "./SimulationLab";
import { 
  ArrowUpRight, 
  ShieldCheck, 
  Lock, 
  Cpu, 
  AlertTriangle, 
  CheckCircle2, 
  Terminal, 
  Code2, 
  ExternalLink,
  Layers,
  Sparkles,
  Zap
} from "lucide-react";

interface LandingPageProps {
  onLaunchApp: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLaunchApp }) => {
  return (
    <div className="space-y-28 animate-fade-in text-white selection:bg-[#FF532A] selection:text-black">
      {/* HERO SECTION with Integrated 3D Interactive Globe */}
      <section className="relative pt-6 md:pt-12 pb-16 flex flex-col items-center justify-center min-h-[82vh] overflow-hidden">
        {/* Three.js Interactive Particle Globe as Ambient 3D Backdrop */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40 md:opacity-60 z-0">
          <ThreeGlobe className="w-[500px] h-[500px] md:w-[720px] md:h-[720px]" />
        </div>

        {/* Ambient Subtle Vignette & Diffuse Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-b from-[#FF532A]/20 via-[#FF532A]/5 to-transparent blur-3xl pointer-events-none rounded-full z-0" />

        {/* Foreground Hero Content */}
        <div className="relative z-10 text-center max-w-4xl mx-auto px-4 flex flex-col items-center">
          {/* Section Tracking Pill matching reference mock */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#161820]/90 border border-white/[0.09] backdrop-blur-xl text-xs mb-8 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-[#14F195] animate-pulse"></span>
            <span className="text-neutral-300 font-mono text-[11px] font-medium">
              Solana Token-2022 Transfer Hook Architecture
            </span>
          </div>

          {/* Paul Graham Display Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white leading-[1.08] mb-6">
            Signatures prove who signed.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF532A] via-[#ff6844] to-[#ffa14a]">
              Not whether they should have.
            </span>
          </h1>

          {/* Deep Insight Body Copy */}
          <p className="text-neutral-400 text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed mb-10 font-sans">
            When an autonomous AI agent holds a private key, an indirect prompt injection or logic flaw 
            can drain its entire treasury in 400 milliseconds. Lilia decouples signing authority from 
            execution—enforcing mathematical spending bounds directly on the Solana blockchain.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 mb-12">
            <button
              onClick={onLaunchApp}
              className="group flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#FF532A] text-black font-semibold text-sm hover:bg-[#ff6844] active:scale-[0.98] transition-all shadow-[0_0_28px_rgba(255,83,42,0.35)]"
            >
              <span>Launch Control Center</span>
              <ArrowUpRight className="w-4 h-4 stroke-[2.5] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
            <a
              href="#simulation"
              className="flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#111317]/90 border border-white/[0.12] hover:border-white/[0.25] text-sm font-medium text-neutral-300 hover:text-white backdrop-blur-xl active:scale-[0.98] transition-all"
            >
              <Terminal className="w-4 h-4 text-[#FF532A]" />
              <span>Test Interactive Simulation</span>
            </a>
          </div>

          {/* Core Technical Highlights Ribbon (Zero Fake Numbers, 100% Real Architecture) */}
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 pt-6 border-t border-white/[0.08] text-xs font-mono text-neutral-400">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#14F195]"></span>
              <span>Deterministic Token-2022 Hook</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF532A]"></span>
              <span>Ed25519 Cryptographic Permits</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#06B6D4]"></span>
              <span>Model Context Protocol (MCP) Native</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
              <span>Solana Devnet Ready</span>
            </div>
          </div>
        </div>
      </section>

      {/* THE VULNERABILITY: WHY SIGNATURES FAIL (Paul Graham Framing) */}
      <section id="problem" className="max-w-6xl mx-auto px-4 md:px-8">
        <div className="p-8 sm:p-12 rounded-3xl bg-[#101217] border border-white/[0.09] shadow-2xl relative overflow-hidden">
          <div className="max-w-3xl">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#FF532A]">
              The Fundamental Flaw in Agentic Web3
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white mt-2 mb-6">
              A private key is an all-or-nothing weapon.
            </h2>
            <div className="space-y-4 text-sm sm:text-base text-neutral-400 leading-relaxed font-sans">
              <p>
                In traditional systems, we never give untrusted code raw root database access without 
                permission layers, rate limiters, and perimeter firewalls. Yet in crypto, giving an AI agent 
                a private key grants it unchecked, non-reversible power over every asset in that account.
              </p>
              <p>
                If an autonomous agent parses an adversarial tweet, an injected API payload, or experiences 
                floating-point hallucination, it can sign a draining transaction. The blockchain validators 
                do not know the agent was deceived; they only see a valid signature and execute the transfer.
              </p>
              <p className="text-white font-medium">
                Lilia introduces an independent security layer: transactions cannot broadcast or settle 
                without an authorized cryptographic permit issued by our Sentinel and validated on-chain by the Solana runtime.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3 BENTO CARDS (Directly styled after the reference mock: Ice-Gray Cards + Dark Canvas Labels) */}
      <section id="firewall" className="max-w-6xl mx-auto px-4 md:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#FF532A]">
            Tri-Partite Security Architecture
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mt-2">
            Defense in Depth: From Model Intent to Block Settlement
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {/* Card 1: Constant Monitoring */}
          <div className="flex flex-col justify-between">
            <div className="rounded-3xl bg-[#E8EEF2] p-7 text-black h-[320px] flex flex-col justify-between shadow-xl relative overflow-hidden border border-white/20">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-black/10 text-xs font-bold font-mono uppercase tracking-wider">
                  24/7 Gate
                </span>
                <ShieldCheck className="w-5 h-5 text-black" />
              </div>

              {/* Data Flow Illustration */}
              <div className="my-auto py-4">
                <div className="w-full rounded-2xl bg-white p-3.5 border border-black/5 shadow-inner font-mono text-[11px] space-y-2">
                  <div className="flex justify-between border-b border-black/5 pb-1.5 text-neutral-600">
                    <span>agent_intent::evaluate()</span>
                    <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
                  </div>
                  <div className="flex justify-between text-neutral-800">
                    <span>Velocity Limit:</span>
                    <span className="font-bold text-black">500.00 USDC</span>
                  </div>
                  <div className="w-full bg-neutral-200 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#FF532A] h-full w-[45%]"></div>
                  </div>
                  <div className="text-[10px] text-neutral-500 flex justify-between">
                    <span>Allowlist: Verified</span>
                    <span>Replay: Blocked</span>
                  </div>
                </div>
              </div>

              <div className="text-xs font-mono text-neutral-600 flex items-center justify-between">
                <span>Off-Chain Sentinel Core</span>
                <span className="text-black font-bold">Latency: 8.4ms</span>
              </div>
            </div>

            <div className="mt-4 px-1">
              <h3 className="text-base font-bold text-white tracking-tight">
                Constant pre-flight monitoring
              </h3>
              <p className="text-neutral-400 text-xs mt-1 leading-relaxed">
                Before an agent can broadcast, proposed transfers are checked against owner-defined spending velocity caps and destination whitelists.
              </p>
            </div>
          </div>

          {/* Card 2: AI-Based Threat Detection */}
          <div className="flex flex-col justify-between">
            <div className="rounded-3xl bg-[#111317] border border-white/[0.1] p-7 text-white h-[320px] flex flex-col justify-between shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  Threat Interceptor
                </span>
                <Cpu className="w-4 h-4 text-neutral-400" />
              </div>

              {/* Threat Alert Badge matching reference mock */}
              <div className="my-auto py-4 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 font-bold text-xs shadow-[0_0_20px_rgba(239,68,68,0.3)] mb-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                  <span>Scam / Drain detected!</span>
                </div>
                <div className="font-mono text-[11px] text-neutral-400 mt-2">
                  Prompt Injection: 40,000 USDC drain attempt thwarted
                </div>
              </div>

              <div className="text-xs font-mono text-neutral-500 flex items-center justify-between">
                <span>Adversarial Heuristics</span>
                <span className="text-red-400 font-bold">Permit Refused</span>
              </div>
            </div>

            <div className="mt-4 px-1">
              <h3 className="text-base font-bold text-white tracking-tight">
                AI-assisted risk assessment
              </h3>
              <p className="text-neutral-400 text-xs mt-1 leading-relaxed">
                Sentinel detects anomalous transfer volume, suspicious recipient patterns, and adversarial prompt payloads before funds are at risk.
              </p>
            </div>
          </div>

          {/* Card 3: Automatic Triage & Consensus Hook */}
          <div className="flex flex-col justify-between">
            <div className="rounded-3xl bg-[#E8EEF2] p-7 text-black h-[320px] flex flex-col justify-between shadow-xl relative overflow-hidden border border-white/20">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-black/10 text-xs font-bold font-mono uppercase tracking-wider">
                  Consensus Hook
                </span>
                <Lock className="w-5 h-5 text-black" />
              </div>

              {/* Concentric Rotating Seal graphic matching mockup */}
              <div className="my-auto py-2 flex flex-col items-center justify-center">
                <div className="w-20 h-20 rounded-full border border-dashed border-black/40 flex items-center justify-center text-[8px] font-mono font-black text-center p-2 uppercase text-black/70">
                  Transfer Hook • Solana •
                </div>
                <div className="mt-3 px-3.5 py-1 rounded-full bg-black text-[#14F195] text-[10px] font-mono font-bold flex items-center gap-1.5 shadow-md">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#14F195]" />
                  Deterministic Rollback Active
                </div>
              </div>

              <div className="text-xs font-mono text-neutral-600 flex items-center justify-between">
                <span>Token-2022 Interface</span>
                <span className="text-black font-bold">Zero-Trust SVM</span>
              </div>
            </div>

            <div className="mt-4 px-1">
              <h3 className="text-base font-bold text-white tracking-tight">
                Consensus-level rollback
              </h3>
              <p className="text-neutral-400 text-xs mt-1 leading-relaxed">
                If a transaction lacks an authentic, unexpired Ed25519 permit, the Solana Token-2022 Transfer Hook aborts execution on the validator level.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* LIVE INTERACTIVE SIMULATION SUITE */}
      <section id="simulation" className="max-w-6xl mx-auto px-4 md:px-8">
        <div className="p-8 sm:p-12 rounded-3xl bg-[#101217] border border-white/[0.09] shadow-2xl">
          <div className="mb-8">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#FF532A]">
              Live 48-Hour Hackathon Demo Harness
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
              Execute Real Transaction Scenarios on Solana Devnet
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Select a scenario below to run an end-to-end simulation through our Sentinel and Transfer Hook engine.
            </p>
          </div>

          <SimulationLab />
        </div>
      </section>

      {/* MODEL CONTEXT PROTOCOL (MCP) INTEGRATION SECTION */}
      <section id="mcp" className="max-w-6xl mx-auto px-4 md:px-8">
        <div className="p-8 sm:p-12 rounded-3xl bg-[#101217] border border-white/[0.09] shadow-2xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-mono font-bold mb-4">
              <Code2 className="w-3.5 h-3.5" />
              <span>Model Context Protocol (MCP) Ready</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-4">
              Integrate with Claude, Cursor, and Autonomous Agents in Minutes
            </h2>
            <p className="text-sm text-neutral-400 leading-relaxed mb-6 font-sans">
              Lilia does not require rebuilding your agent architecture. Our MCP server exposes 7 core security tools (`evaluate_transaction`, `request_authorization`, `prepare_transfer`, etc.) directly into any MCP-compatible framework.
            </p>
            <div className="space-y-2.5 font-mono text-xs text-neutral-300">
              <div className="flex items-center gap-2">
                <span className="text-[#14F195]">✓</span>
                <span>Works with Claude Desktop, Cursor, and custom Python/Node agents</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#14F195]">✓</span>
                <span>Enforces agent identity and principal authorization checks</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#14F195]">✓</span>
                <span>Zero duplicate business logic: Shared Sentinel engine for REST and MCP</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-black border border-white/[0.09] p-5 font-mono text-xs overflow-x-auto shadow-inner">
            <div className="text-neutral-500 text-[11px] mb-2">// claude_desktop_config.json</div>
            <pre className="text-purple-300 leading-relaxed text-[11px]">
{`{
  "mcpServers": {
    "lilia": {
      "command": "bunx",
      "args": ["@lilia/mcp-server"],
      "env": {
        "LILIA_API_KEY": "lilia_sec_live_9xQ2...",
        "SOLANA_NETWORK": "devnet"
      }
    }
  }
}`}
            </pre>
          </div>
        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section className="max-w-4xl mx-auto px-4 text-center py-8">
        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-4">
          Autonomous agents. Bounded authority.
        </h2>
        <p className="text-neutral-400 text-sm sm:text-base max-w-xl mx-auto mb-8">
          Give autonomous models the power to transact without handing over an unconstrained private key.
        </p>
        <button
          onClick={onLaunchApp}
          className="px-8 py-4 rounded-full bg-[#FF532A] text-black font-bold text-sm hover:bg-[#ff6844] active:scale-[0.98] transition-all shadow-[0_0_32px_rgba(255,83,42,0.4)]"
        >
          Open Lilia Control Center →
        </button>
      </section>
    </div>
  );
};
