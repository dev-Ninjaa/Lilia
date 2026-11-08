"use client";

import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Code2,
  LayoutDashboard,
  Lock,
  Terminal,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect } from "react";

export type AppTabId =
  | "overview"
  | "agents"
  | "policies"
  | "transactions"
  | "transfers"
  | "threats"
  | "simulation"
  | "integrations";

type SidebarProps = {
  open: boolean;
  activeTab: AppTabId;
  onNavigate: (tab: AppTabId) => void;
  onClose: () => void;
  onBackToLanding: () => void;
  apiConnected: boolean;
};

const NAV: Array<{ id: AppTabId; name: string; icon: LucideIcon }> = [
  { id: "overview", name: "Overview", icon: LayoutDashboard },
  { id: "agents", name: "Agents", icon: Users },
  { id: "policies", name: "Policies", icon: Lock },
  { id: "transactions", name: "Feed", icon: Activity },
  { id: "transfers", name: "Transfers", icon: ArrowUpRight },
  { id: "threats", name: "Threats", icon: AlertTriangle },
  { id: "simulation", name: "Simulate", icon: Terminal },
  { id: "integrations", name: "Integrate", icon: Code2 },
];

function DiamondGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2L4 9l8 13 8-13L12 2z"
        fill="url(#diamond-side-grad)"
        stroke="url(#diamond-side-stroke)"
        strokeWidth="0.5"
      />
      <defs>
        <linearGradient id="diamond-side-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffb347" />
          <stop offset="50%" stopColor="#ff6b4a" />
          <stop offset="100%" stopColor="#ff2f3a" />
        </linearGradient>
        <linearGradient id="diamond-side-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffb347" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#ff2f3a" stopOpacity="0.4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export const Sidebar: React.FC<SidebarProps> = ({
  open,
  activeTab,
  onNavigate,
  onClose,
  onBackToLanding,
  apiConnected,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const nav = (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex items-center gap-2.5 border-b border-white/[0.07] px-5 py-4">
        <DiamondGlyph />
        <span className="font-bold tracking-wider text-sm text-white">LILIA</span>
        <span className="rounded-full border border-white/[0.08] bg-white/[0.06] px-1.5 py-0.5 font-mono text-[9px] text-neutral-400">
          Hook
        </span>
      </div>

      {/* Nav */}
      <nav aria-label="App" className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = item.id === activeTab;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  aria-current={active ? "page" : undefined}
                  onClick={() => {
                    onNavigate(item.id);
                    onClose();
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5533] ${
                    active
                      ? "bg-[#FF5533]/10 font-semibold text-white ring-1 ring-[#FF5533]/30"
                      : "text-neutral-400 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  <Icon
                    className={`h-4.5 w-4.5 shrink-0 ${active ? "text-[#FF5533]" : "text-neutral-500"}`}
                    aria-hidden="true"
                  />
                  <span>{item.name}</span>
                  {active && (
                    <span
                      className="ml-auto h-1.5 w-1.5 rounded-full bg-[#FF5533]"
                      aria-hidden="true"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="space-y-3 border-t border-white/[0.07] px-5 py-4">
        <div className="flex items-center gap-2 font-mono text-[11px] text-neutral-400">
          <span
            className={`h-2 w-2 rounded-full ${apiConnected ? "bg-[#14F195]" : "bg-neutral-600"}`}
            aria-hidden="true"
          />
          <span>{apiConnected ? "API connected" : "API offline"}</span>
        </div>
        <button
          type="button"
          onClick={onBackToLanding}
          className="w-full rounded-xl border border-white/[0.12] bg-white/[0.06] px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-white/[0.12] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5533]"
        >
          Back to landing
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        aria-label="Primary"
        className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-white/[0.07] bg-[#0b0c10] lg:block"
      >
        {nav}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
        >
          {/* biome-ignore lint/a11y/useSemanticElements: decorative overlay */}
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: mouse-only overlay, close button is keyboard-reachable */}
          <div
            aria-hidden="true"
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-white/[0.1] bg-[#0b0c10] shadow-2xl">
            <button
              type="button"
              aria-label="Close navigation"
              onClick={onClose}
              className="absolute right-3 top-3 rounded-lg p-2 text-neutral-400 hover:bg-white/[0.06] hover:text-white focus-visible:outline-2 focus-visible:outline-[#FF5533]"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            {nav}
          </aside>
        </div>
      )}
    </>
  );
};
