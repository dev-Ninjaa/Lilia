"use client";

import { type NavItem, TubelightNavBar } from "@/components/ui/tubelight-navbar";
import { ArrowRight, Code2, Layers, Shield, Terminal } from "lucide-react";
import Link from "next/link";

type NavbarProps = {
  launchHref?: string;
};

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

export const Navbar: React.FC<NavbarProps> = ({ launchHref = "/console/overview" }) => {
  const landingNav: NavItem[] = [
    { name: "Thesis", url: "#problem", icon: Shield },
    { name: "Architecture", url: "#firewall", icon: Layers },
    { name: "Simulation", url: "#simulation", icon: Terminal },
    { name: "MCP Protocol", url: "#mcp", icon: Code2 },
  ];

  const brandSlot = (
    <span className="flex items-center gap-2">
      <DiamondGlyph />
      <span className="font-bold tracking-wider text-sm text-white">LILIA</span>
      <span className="hidden xl:inline-block px-1.5 py-0.5 rounded-full bg-white/[0.06] text-[9px] font-mono text-neutral-400 border border-white/[0.08]">
        Hook
      </span>
    </span>
  );

  const actionSlot = (
    <Link
      href={launchHref}
      className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#e6e6e6] text-[#18181b] hover:bg-white transition-all shadow-[0_0_14px_rgba(255,255,255,0.15)] active:scale-[0.98] cursor-pointer"
    >
      <span className="hidden sm:inline">Launch App</span>
      <span className="sm:hidden">App</span>
      <ArrowRight size={12} strokeWidth={2.5} />
    </Link>
  );

  return (
    <header className="relative">
      <TubelightNavBar items={landingNav} brandSlot={brandSlot} actionSlot={actionSlot} />
    </header>
  );
};
