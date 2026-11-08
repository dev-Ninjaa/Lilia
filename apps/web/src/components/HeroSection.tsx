"use client";

import { ArrowRight, Play } from "lucide-react";
import type React from "react";

interface HeroSectionProps {
  launchHref?: string;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ launchHref = "/console/overview" }) => {
  return (
    <section className="relative min-h-[760px] pt-36 pb-20 flex flex-col items-center justify-center text-center px-6">
      {/* ── Main Hero Content Cluster ── */}
      <div className="relative max-w-4xl mx-auto z-10">
        {/* Eyebrow Chip */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] mb-6 backdrop-blur-md">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff6b4a] animate-pulse" />
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ff7733]">
            ON-CHAIN SECURITY FOR AI AGENTS
          </span>
        </div>

        {/* Hero Title with Warm Gradient Accent Word */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white leading-[1.08]">
          Give your AI agent a wallet.
          <br />
          Not a{" "}
          <span className="bg-gradient-to-r from-[#ffb347] via-[#ff6b4a] to-[#ff2f3a] bg-clip-text text-transparent">
            blank check.
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p className="mt-6 text-sm sm:text-base text-neutral-400 max-w-2xl mx-auto leading-relaxed font-normal">
          Lilia lets you control how much your AI agents can spend and who they can pay. Those
          limits are enforced on Solana, so protected transfers that break your rules don't go
          through.
        </p>

        {/* CTAs */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
          <a
            href="#the-problem"
            className="btn-white px-6 py-2.5 text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-black" />
            <span>See how it works</span>
          </a>
          <a
            href="#simulation-lab"
            className="btn-ghost px-6 py-2.5 text-xs sm:text-sm font-medium flex items-center gap-1.5 cursor-pointer"
          >
            <span>Try the demo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* ── Dual Stat Cards Beneath CTAs ── */}
        <div className="mt-14 grid grid-cols-2 gap-4 max-w-xl mx-auto">
          <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#0a0a0e]/60 backdrop-blur-xl text-center shadow-lg">
            <div className="text-xl sm:text-2xl font-bold text-white tracking-tight">18 / 18</div>
            <div className="text-xs text-neutral-400 mt-0.5 font-medium">Tests Passing</div>
            <div className="w-10 h-px bg-white/10 mx-auto my-2" />
            <div className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              &lt; 10 ms
            </div>
            <div className="text-xs text-neutral-400 mt-0.5 font-medium">Sentinel Latency</div>
          </div>

          <div className="p-4 rounded-2xl border border-white/[0.08] bg-[#0a0a0e]/60 backdrop-blur-xl text-center shadow-lg">
            <div className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Token-2022
            </div>
            <div className="text-xs text-neutral-400 mt-0.5 font-medium">Transfer Hook</div>
            <div className="w-10 h-px bg-white/10 mx-auto my-2" />
            <div className="text-xl sm:text-2xl font-bold text-white tracking-tight">Solana</div>
            <div className="text-xs text-neutral-400 mt-0.5 font-medium">Devnet Live</div>
          </div>
        </div>
      </div>
    </section>
  );
};
