"use client";

import React from "react";
import { ArrowUpRight, ShieldCheck, Zap, Lock, Cpu, AlertTriangle, CheckCircle2 } from "lucide-react";

interface HeroSectionProps {
  onLaunchSimulation: () => void;
  onExploreAgents: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onLaunchSimulation,
  onExploreAgents,
}) => {
  return (
    <section className="relative pt-12 pb-16 px-4 md:px-8 max-w-7xl mx-auto w-full">
      {/* Background Subtle Radial Glow matching mockup */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-[#FF5533]/15 via-[#FF5533]/5 to-transparent blur-3xl pointer-events-none rounded-full" />

      {/* Hero Headline & Intro */}
      <div className="relative text-center max-w-4xl mx-auto flex flex-col items-center">
        {/* Section Pill Badge matching mockup: 01 [ About * Network ] */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#16181F] border border-white/[0.08] text-xs mb-6">
          <span className="text-[#FF5533] font-mono font-bold">01</span>
          <span className="text-neutral-400">|</span>
          <span className="text-neutral-300 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#FF5533]"></span>
            AI-Assisted Transaction Security Protocol
          </span>
        </div>

        {/* Master Headline with Inline Badges matching mockup */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1] mb-6">
          Next level of{" "}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF5533] text-black font-semibold text-2xl sm:text-4xl md:text-5xl align-middle mx-1 shadow-[0_0_24px_rgba(255,85,51,0.3)]">
            <span className="text-lg sm:text-2xl font-black">*</span> AI Agent
          </span>{" "}
          security & on-chain firewall{" "}
          <span className="inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[#FF5533]/20 border border-[#FF5533]/40 text-[#FF5533] align-middle mx-1">
            +
          </span>
        </h1>

        <p className="text-neutral-400 text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed mb-8">
          Autonomous agents can sign transactions, but signatures do not guarantee safety. 
          Lilia enforces spending limits and threat containment through cryptographically signed 
          permits and deterministic <span className="text-white font-medium">Token-2022 Transfer Hooks</span> on Solana.
        </p>

        {/* Dual Primary Call-to-Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-14">
          <button
            onClick={onLaunchSimulation}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#FF5533] text-black font-semibold text-sm hover:bg-[#ff6847] active:scale-[0.98] transition-all shadow-[0_0_24px_rgba(255,85,51,0.25)]"
          >
            <span>Run Hackathon Simulation</span>
            <ArrowUpRight className="w-4 h-4 text-black stroke-[2.5]" />
          </button>
          <button
            onClick={onExploreAgents}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#16181F] text-white border border-white/[0.12] hover:border-white/[0.25] text-sm font-medium active:scale-[0.98] transition-all"
          >
            <span>Explore Active Sentinel Agents</span>
          </button>
        </div>

        {/* Metrics Ribbon matching mockup (93m+ Total locked, 3.2b Market size, 1k+ Awards, 221k Transactions) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl pt-6 border-t border-white/[0.08] mb-16">
          <div className="flex flex-col items-center">
            <span className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white font-mono tracking-tight">
              $93M+
            </span>
            <span className="text-xs text-neutral-400 mt-1 uppercase tracking-wider font-mono">
              Protected Volume
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#14F195] font-mono tracking-tight">
              3.2K
            </span>
            <span className="text-xs text-neutral-400 mt-1 uppercase tracking-wider font-mono">
              Active Agents
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white font-mono tracking-tight">
              &lt;10ms
            </span>
            <span className="text-xs text-neutral-400 mt-1 uppercase tracking-wider font-mono">
              Sentinel Latency
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#FF5533] font-mono tracking-tight">
              221K+
            </span>
            <span className="text-xs text-neutral-400 mt-1 uppercase tracking-wider font-mono">
              Verified Permits
            </span>
          </div>
        </div>
      </div>

      {/* 3-Column Illustrated Feature Grid matching the * Network Mockup */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch max-w-6xl mx-auto mb-20">
        {/* Left Card: Constant Monitoring */}
        <div className="group rounded-3xl bg-[#E6ECEF] p-6 text-black flex flex-col justify-between shadow-lg relative overflow-hidden min-h-[360px] border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <span className="px-3 py-1 rounded-full bg-black/10 text-xs font-semibold uppercase tracking-wider">
              24/7 Telemetry
            </span>
            <ShieldCheck className="w-5 h-5 text-black" />
          </div>

          {/* Abstract Network Visual matching mockup */}
          <div className="my-auto py-6">
            <div className="w-full h-32 rounded-2xl bg-white p-3 flex flex-col justify-between border border-black/5 shadow-inner">
              <div className="flex items-center justify-between border-b border-black/5 pb-2">
                <span className="text-[11px] font-mono text-neutral-600">solana::transfer_hook::active</span>
                <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
              </div>
              <div className="space-y-1.5 font-mono text-[10px] text-neutral-700">
                <div className="flex justify-between">
                  <span>Agent Alpha Velocity:</span>
                  <span className="font-bold text-black">450 / 1000 USDC</span>
                </div>
                <div className="w-full bg-neutral-200 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#FF5533] h-full w-[45%]"></div>
                </div>
                <div className="text-[9px] text-neutral-500 flex justify-between">
                  <span>Replay Nonce: #48201</span>
                  <span>TTL: 60s valid</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-black tracking-tight mb-1">
              Constant monitoring
            </h3>
            <p className="text-neutral-600 text-xs leading-relaxed">
              Every token transfer intent is evaluated before transaction broadcast against owner policies, spending velocity, and destination allowlists.
            </p>
          </div>
        </div>

        {/* Center Split Column: Coral Action Tile + AI-Based Detection Card */}
        <div className="flex flex-col gap-6">
          {/* Top Coral Action Tile matching mockup: "SHARE IT / RUN" */}
          <div
            onClick={onLaunchSimulation}
            className="cursor-pointer rounded-3xl bg-[#FF5533] p-6 text-black flex items-center justify-between shadow-lg hover:bg-[#ff6847] active:scale-[0.99] transition-all group"
          >
            <div>
              <span className="text-xs font-extrabold tracking-wider uppercase opacity-80">
                Devnet Test Suite
              </span>
              <h4 className="text-xl font-black tracking-tight mt-0.5">
                RUN SIMULATION LAB
              </h4>
            </div>
            <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform">
              <ArrowUpRight className="w-5 h-5 text-white" />
            </div>
          </div>

          {/* Bottom Card: AI-based detection with "Scam detected!" pill matching mockup */}
          <div className="rounded-3xl bg-[#111317] p-6 text-white border border-white/[0.08] flex-1 flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-[#EF4444] text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3 text-[#EF4444]" />
                Threat Intercepted
              </span>
              <Cpu className="w-4 h-4 text-neutral-400" />
            </div>

            {/* Illustrated threat alert badge matching mockup */}
            <div className="my-auto py-4 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 font-bold text-xs shadow-[0_0_16px_rgba(239,68,68,0.25)] mb-3">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                <span>Scam / Drain detected!</span>
              </div>
              <p className="font-mono text-[11px] text-neutral-400">
                Prompt injection attempt: 40,000 USDC drain thwarted
              </p>
            </div>

            <div>
              <h3 className="text-base font-bold text-white tracking-tight mb-1">
                AI-based detection
              </h3>
              <p className="text-neutral-400 text-xs leading-relaxed">
                Sentinel combines deterministic spending caps with contextual risk scoring to flag prompt injections and anomalous recipient addresses.
              </p>
            </div>
          </div>
        </div>

        {/* Right Card: Automatic Triage & Consensus Hook */}
        <div className="rounded-3xl bg-[#E6ECEF] p-6 text-black flex flex-col justify-between shadow-lg min-h-[360px] border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <span className="px-3 py-1 rounded-full bg-black/10 text-xs font-semibold uppercase tracking-wider">
              Token-2022 Consensus
            </span>
            <Lock className="w-5 h-5 text-black" />
          </div>

          {/* On-Chain Hook Stamp Graphic matching mockup */}
          <div className="my-auto py-4 flex flex-col items-center justify-center">
            <div className="relative w-24 h-24 rounded-full border-2 border-dashed border-black/30 flex items-center justify-center p-2 text-center animate-spin-slow">
              <span className="text-[8px] font-mono font-black uppercase tracking-widest text-black/70">
                Transfer Hook • On-Chain •
              </span>
            </div>
            <div className="mt-3 px-3 py-1 rounded-full bg-black text-[#14F195] text-[10px] font-mono font-bold flex items-center gap-1.5 shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#14F195]" />
              Consensus Guard Active
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-black tracking-tight mb-1">
              Automatic triage
            </h3>
            <p className="text-neutral-600 text-xs leading-relaxed">
              If a transaction lacks a verified Ed25519 Sentinel permit, the Solana Token-2022 Transfer Hook rolls back the transfer at the validator level.
            </p>
          </div>
        </div>
      </div>

      {/* Section 02: Ecosystem & Partner Logos Bar matching mockup */}
      <div className="max-w-5xl mx-auto pt-8 border-t border-white/[0.08]">
        <div className="flex items-center justify-between mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#16181F] border border-white/[0.08] text-xs">
            <span className="text-[#FF5533] font-mono font-bold">02</span>
            <span className="text-neutral-400">|</span>
            <span className="text-neutral-300 font-medium">Secured Architecture & Toolchain</span>
          </div>
          <span className="text-xs text-neutral-500 font-mono hidden sm:inline">
            Devnet Proof of Concept
          </span>
        </div>

        {/* Logos Ribbon */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <div className="px-5 py-2.5 rounded-full bg-[#111317] border border-white/[0.08] text-xs font-mono font-semibold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#14F195]"></span>
            Solana Token-2022
          </div>
          <div className="px-5 py-2.5 rounded-full bg-[#111317] border border-white/[0.08] text-xs font-mono font-semibold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#06B6D4]"></span>
            Anchor Framework
          </div>
          <div className="px-5 py-2.5 rounded-full bg-[#FF5533] text-black text-xs font-mono font-extrabold flex items-center gap-2 shadow-[0_0_14px_rgba(255,85,51,0.25)]">
            * LILIA SENTINEL
          </div>
          <div className="px-5 py-2.5 rounded-full bg-[#111317] border border-white/[0.08] text-xs font-mono font-semibold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-400"></span>
            Model Context Protocol (MCP)
          </div>
          <div className="px-5 py-2.5 rounded-full bg-[#111317] border border-white/[0.08] text-xs font-mono font-semibold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
            Helius RPC Engine
          </div>
          <div className="px-5 py-2.5 rounded-full bg-[#111317] border border-white/[0.08] text-xs font-mono font-semibold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Fastify + Bun Runtime
          </div>
        </div>
      </div>
    </section>
  );
};
