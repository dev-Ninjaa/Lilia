"use client";

import React, { useState } from "react";
import { Wallet, ArrowRight, ShieldCheck, Menu, X, LayoutDashboard, Globe } from "lucide-react";

interface NavbarProps {
  currentView: "landing" | "app";
  setCurrentView: (v: "landing" | "app") => void;
  activeAppTab: string;
  setActiveAppTab: (tab: string) => void;
  walletConnected: boolean;
  setWalletConnected: (c: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setCurrentView,
  activeAppTab,
  setActiveAppTab,
  walletConnected,
  setWalletConnected,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const landingNav = [
    { label: "The Problem", href: "#problem" },
    { label: "Consensus Firewall", href: "#firewall" },
    { label: "Simulation Lab", href: "#simulation" },
    { label: "Architecture", href: "#architecture" },
    { label: "MCP Protocol", href: "#mcp" },
  ];

  const appNav = [
    { id: "overview", label: "Overview" },
    { id: "agents", label: "Agent Registry" },
    { id: "policies", label: "Security Policies" },
    { id: "transactions", label: "Transaction Feed" },
    { id: "threats", label: "Threat Intel" },
    { id: "simulation", label: "Simulation Suite" },
    { id: "integrations", label: "MCP & API" },
  ];

  return (
    <header className="sticky top-3 z-50 px-4 md:px-8 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between gap-3">
        {/* Brand Logo with Tactile Coral Asterisk Glyph */}
        <div
          onClick={() => setCurrentView("landing")}
          className="cursor-pointer group flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-[#101217]/90 border border-white/[0.09] backdrop-blur-xl hover:border-white/[0.22] transition-all shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
        >
          <div className="w-6 h-6 rounded-full bg-[#FF532A] flex items-center justify-center text-black font-black text-sm shadow-[0_0_14px_rgba(255,83,42,0.45)] group-hover:rotate-45 transition-transform duration-300">
            ✱
          </div>
          <span className="font-bold text-white tracking-tight text-sm md:text-base">
            LILIA
          </span>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-white/[0.06] text-[10px] font-mono text-neutral-400 border border-white/[0.05]">
            Solana Hook
          </span>
        </div>

        {/* Center Glassmorphic Navigation Island */}
        <nav className="hidden lg:flex items-center gap-1 bg-[#101217]/85 border border-white/[0.09] backdrop-blur-2xl px-2.5 py-1.5 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
          {currentView === "landing"
            ? landingNav.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="px-3.5 py-1.5 rounded-full text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-all"
                >
                  {item.label}
                </a>
              ))
            : appNav.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveAppTab(item.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                    activeAppTab === item.id
                      ? "bg-white text-black font-semibold shadow-sm"
                      : "text-neutral-400 hover:text-white hover:bg-white/[0.06]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
        </nav>

        {/* Right Modular Controls: View Switcher + Wallet CTA */}
        <div className="flex items-center gap-2">
          {/* Landing <-> Control Center Toggle Button */}
          {currentView === "landing" ? (
            <button
              onClick={() => setCurrentView("app")}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold tracking-tight transition-all active:scale-[0.98] bg-[#FF532A] text-black hover:bg-[#ff6844] shadow-[0_0_20px_rgba(255,83,42,0.35)]"
            >
              <LayoutDashboard className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Launch Control Center</span>
              <span className="sm:hidden">App</span>
              <ArrowRight className="w-3 h-3 stroke-[2.5]" />
            </button>
          ) : (
            <button
              onClick={() => setCurrentView("landing")}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold tracking-tight transition-all active:scale-[0.98] bg-[#161820] text-neutral-300 border border-white/[0.12] hover:border-white/[0.25] hover:text-white"
            >
              <Globe className="w-3.5 h-3.5 text-[#FF532A]" />
              <span className="hidden sm:inline">Landing Page</span>
              <span className="sm:hidden">Landing</span>
            </button>
          )}

          {/* Wallet Button */}
          <button
            onClick={() => setWalletConnected(!walletConnected)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#101217]/90 border border-white/[0.1] text-xs font-mono text-neutral-300 hover:border-white/[0.2] transition-all"
          >
            <span className="w-2 h-2 rounded-full bg-[#14F195]"></span>
            <span className="hidden md:inline">{walletConnected ? "Athar...9xQ2" : "Connect"}</span>
          </button>

          {/* Mobile Menu Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-full bg-[#101217] border border-white/[0.09] text-neutral-400 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden mt-2 p-3 rounded-2xl bg-[#101217]/95 border border-white/[0.1] backdrop-blur-2xl shadow-2xl animate-fade-in flex flex-col gap-1.5">
          {currentView === "landing"
            ? landingNav.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-xl text-xs font-medium text-neutral-300 hover:bg-white/[0.06] hover:text-white"
                >
                  {item.label}
                </a>
              ))
            : appNav.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveAppTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`text-left px-3 py-2 rounded-xl text-xs font-medium ${
                    activeAppTab === item.id
                      ? "bg-white text-black font-bold"
                      : "text-neutral-300 hover:bg-white/[0.06]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
        </div>
      )}
    </header>
  );
};
