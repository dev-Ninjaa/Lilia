"use client";

import { AuroraBackground } from "@/components/AuroraBackground";
import { type AppTabId, Sidebar } from "@/components/Sidebar";
import { solanaStatus } from "@/lib/api";
import { Menu } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type ConsoleShellProps = {
  children: React.ReactNode;
};

const TAB_BY_PATH: Record<string, AppTabId> = {
  overview: "overview",
  agents: "agents",
  policies: "policies",
  transactions: "transactions",
  transfers: "transfers",
  threats: "threats",
  simulation: "simulation",
  integrations: "integrations",
  settings: "settings",
};

/**
 * Client shell for the console routes: sidebar + mobile header around the
 * matched Server Component page.
 */
export const ConsoleShell: React.FC<ConsoleShellProps> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;
    solanaStatus()
      .then((status) => {
        if (!cancelled) setApiConnected(status.configured);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const segment = pathname.replace("/console", "").replace("/", "");
  const activeTab = TAB_BY_PATH[segment] ?? "overview";

  const handleNavigate = (tab: AppTabId) => {
    setSidebarOpen(false);
    router.push(`/console/${tab}`);
  };

  return (
    <div className="relative min-h-screen bg-[#07080a] text-white selection:bg-[#ff6b4a] selection:text-black">
      {/* Subtle Aurora Ambient Variant for Console */}
      <AuroraBackground isFixed={true} className="opacity-35" />

      <div className="relative z-10">
        <Sidebar
          open={sidebarOpen}
          activeTab={activeTab}
          onNavigate={handleNavigate}
          onClose={() => setSidebarOpen(false)}
          onBackToLanding={() => router.push("/")}
          apiConnected={apiConnected}
        />

        {/* Mobile header (desktop uses fixed sidebar) */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/[0.07] bg-[#0b0c10]/95 px-4 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            aria-label="Open navigation"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-neutral-300 hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-[#FF5533]"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <span className="font-bold tracking-wider text-sm">LILIA</span>
          <span
            className={`flex items-center gap-1.5 font-mono text-[11px] ${apiConnected ? "text-[#14F195]" : "text-neutral-500"}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${apiConnected ? "bg-[#14F195]" : "bg-neutral-600"}`}
              aria-hidden="true"
            />
            API
          </span>
        </header>

        <main className="lg:pl-64">
          <div className="mx-auto w-full max-w-6xl px-3 py-5 sm:px-5 sm:py-7 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
