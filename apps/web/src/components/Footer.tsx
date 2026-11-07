"use client";

import React from "react";
import { ShieldCheck, ExternalLink, Terminal, GitBranch, Lock } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-white/[0.08] bg-[#08090B] mt-24 pt-16 pb-12 px-4 md:px-8 text-neutral-400 font-sans">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Top Section: Brand + Mission + Live Network Telemetry */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-white/[0.06]">
          {/* Brand Column */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-[#FF532A] flex items-center justify-center text-black font-black text-sm shadow-[0_0_12px_rgba(255,83,42,0.4)]">
                ✱
              </div>
              <span className="font-bold text-white text-lg tracking-tight">LILIA</span>
              <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-[10px] font-mono text-neutral-400 border border-white/[0.05]">
                Token-2022
              </span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-md leading-relaxed">
              AI-assisted on-chain transaction security infrastructure for autonomous agents. 
              Enforcing deterministic spending limits and threat containment through Solana Transfer Hooks.
            </p>
          </div>

          {/* Architecture Links */}
          <div className="space-y-3 font-mono text-xs">
            <div className="text-white font-bold tracking-wider uppercase text-[11px]">
              Protocol
            </div>
            <ul className="space-y-2 text-neutral-400">
              <li>
                <a href="#firewall" className="hover:text-white transition-colors">
                  Consensus Firewall
                </a>
              </li>
              <li>
                <a href="#simulation" className="hover:text-white transition-colors">
                  Hackathon Simulation Lab
                </a>
              </li>
              <li>
                <a href="#mcp" className="hover:text-white transition-colors">
                  Model Context Protocol (MCP)
                </a>
              </li>
              <li>
                <span className="text-neutral-500">Ed25519 Permit v1.0</span>
              </li>
            </ul>
          </div>

          {/* Infrastructure & Audits */}
          <div className="space-y-3 font-mono text-xs">
            <div className="text-white font-bold tracking-wider uppercase text-[11px]">
              Ecosystem
            </div>
            <ul className="space-y-2 text-neutral-400">
              <li className="flex items-center gap-1.5 text-neutral-300">
                <span className="w-1.5 h-1.5 rounded-full bg-[#14F195]"></span>
                <span>Solana Devnet</span>
              </li>
              <li className="flex items-center gap-1.5 text-neutral-300">
                <span className="w-1.5 h-1.5 rounded-full bg-[#06B6D4]"></span>
                <span>Anchor Program</span>
              </li>
              <li className="flex items-center gap-1.5 text-neutral-300">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                <span>MCP SDK</span>
              </li>
              <li className="flex items-center gap-1.5 text-neutral-300">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF532A]"></span>
                <span>Sentinel Authority</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section: Live Consensus Telemetry Strip + Copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-neutral-500">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 text-[#14F195]">
              <span className="w-2 h-2 rounded-full bg-[#14F195] animate-pulse"></span>
              Devnet Consensus Online
            </span>
            <span>•</span>
            <span>Token-2022 Transfer Hook Active</span>
            <span>•</span>
            <span>Fastify API Core</span>
          </div>

          <div>
            <span>© 2026 Lilia Security Protocol. All rights reserved.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
