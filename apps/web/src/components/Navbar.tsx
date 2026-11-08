"use client";

import { type NavItem, TubelightNavBar } from "@/components/ui/tubelight-navbar";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Code2,
  Globe,
  Layers,
  LayoutDashboard,
  Lock,
  Shield,
  Terminal,
  Users,
} from "lucide-react";
import type React from "react";

interface NavbarProps {
  currentView: "landing" | "app";
  setCurrentView: (v: "landing" | "app") => void;
  activeAppTab: string;
  setActiveAppTab: (tab: string) => void;
  walletConnected: boolean;
  setWalletConnected: (c: boolean) => void;
}

function DiamondGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2L4 9l8 13 8-13L12 2z"
        fill="url(#diamond-nav-grad)"
        stroke="url(#diamond-nav-stroke)"
        strokeWidth="0.5"
      />
      <defs>
        <linearGradient id="diamond-nav-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffb347" />
          <stop offset="50%" stopColor="#ff6b4a" />
          <stop offset="100%" stopColor="#ff2f3a" />
        </linearGradient>
        <linearGradient id="diamond-nav-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffb347" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#ff2f3a" stopOpacity="0.4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setCurrentView,
  activeAppTab,
  setActiveAppTab,
  walletConnected,
  setWalletConnected,
}) => {
  const landingNav: NavItem[] = [
    { name: "Thesis", url: "#problem", icon: Shield },
    { name: "Architecture", url: "#firewall", icon: Layers },
    { name: "Simulation", url: "#simulation", icon: Terminal },
    { name: "MCP Protocol", url: "#mcp", icon: Code2 },
  ];

  const appNav: NavItem[] = [
    { id: "overview", name: "Overview", url: "#", icon: LayoutDashboard },
    { id: "agents", name: "Agents", url: "#", icon: Users },
    { id: "policies", name: "Policies", url: "#", icon: Lock },
    { id: "transactions", name: "Feed", url: "#", icon: Activity },
    { id: "transfers", name: "Transfers", url: "#", icon: ArrowUpRight },
    { id: "threats", name: "Threats", url: "#", icon: AlertTriangle },
    { id: "simulation", name: "Simulate", url: "#", icon: Terminal },
    { id: "integrations", name: "Integrate", url: "#", icon: Code2 },
  ];

  const brandSlot = (
    <button
      type="button"
      onClick={() => setCurrentView("landing")}
      className="flex items-center gap-2 group cursor-pointer focus:outline-none"
    >
      <DiamondGlyph />
      <span className="font-bold tracking-wider text-sm text-white group-hover:text-[#ffb347] transition-colors">
        LILIA
      </span>
      <span className="hidden xl:inline-block px-1.5 py-0.5 rounded-full bg-white/[0.06] text-[9px] font-mono text-neutral-400 border border-white/[0.08]">
        Hook
      </span>
    </button>
  );

  const actionSlot = (
    <div className="flex items-center gap-1.5">
      {/* Wallet Pill */}
      <button
        type="button"
        onClick={() => setWalletConnected(!walletConnected)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-neutral-300 hover:border-white/[0.2] transition-all cursor-pointer"
        title="Toggle Devnet connection"
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            walletConnected ? "bg-[#14F195]" : "bg-neutral-500"
          }`}
        />
        <span className="hidden md:inline text-[11px]">
          {walletConnected ? "API connected" : "Connect"}
        </span>
      </button>

      {/* View Toggle */}
      {currentView === "landing" ? (
        <button
          type="button"
          onClick={() => setCurrentView("app")}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#e6e6e6] text-[#18181b] hover:bg-white transition-all shadow-[0_0_14px_rgba(255,255,255,0.15)] active:scale-[0.98] cursor-pointer"
        >
          <span className="hidden sm:inline">Launch App</span>
          <span className="sm:hidden">App</span>
          <ArrowRight size={12} strokeWidth={2.5} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setCurrentView("landing")}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/[0.08] text-white border border-white/[0.12] hover:bg-white/[0.15] transition-all active:scale-[0.98] cursor-pointer"
        >
          <Globe size={12} className="text-[#ff6b4a]" />
          <span>Landing</span>
        </button>
      )}
    </div>
  );

  return (
    <header className="relative">
      <TubelightNavBar
        items={currentView === "landing" ? landingNav : appNav}
        activeId={currentView === "app" ? activeAppTab : undefined}
        onSelect={currentView === "app" ? (id) => setActiveAppTab(id) : undefined}
        brandSlot={brandSlot}
        actionSlot={actionSlot}
      />
    </header>
  );
};
