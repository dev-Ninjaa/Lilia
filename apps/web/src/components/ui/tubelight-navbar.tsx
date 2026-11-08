"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type React from "react";
import { useEffect, useState } from "react";

export interface NavItem {
  name: string;
  url: string;
  icon?: LucideIcon;
  id?: string;
}

interface NavBarProps {
  items: NavItem[];
  className?: string;
  activeId?: string;
  onSelect?: (id: string) => void;
  brandSlot?: React.ReactNode;
  actionSlot?: React.ReactNode;
}

export function TubelightNavBar({
  items,
  className,
  activeId,
  onSelect,
  brandSlot,
  actionSlot,
}: NavBarProps) {
  const [activeTab, setActiveTab] = useState(activeId || items[0]?.name);

  useEffect(() => {
    if (activeId) {
      setActiveTab(activeId);
    }
  }, [activeId]);

  return (
    <div
      className={cn(
        "fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-4xl",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2.5 p-1.5 md:p-2 rounded-full bg-[#0a0a0e]/80 border border-white/[0.09] backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.08)]">
        {/* Brand Slot (Logo / Wordmark) */}
        {brandSlot && <div className="flex items-center pl-2 pr-1 shrink-0">{brandSlot}</div>}

        {/* Center Nav Items */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {items.map((item) => {
            const Icon = item.icon;
            const itemId = item.id || item.name;
            const isActive = activeTab === itemId || activeTab === item.name;

            const content = (
              <>
                {Icon && (
                  <Icon
                    size={15}
                    strokeWidth={2}
                    className={cn(
                      "shrink-0 transition-colors",
                      isActive ? "text-[#ff6b4a]" : "text-neutral-400 group-hover:text-white",
                    )}
                  />
                )}
                <span className="hidden sm:inline tracking-tight text-xs md:text-sm font-medium">
                  {item.name}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="tubelight-lamp"
                    className="absolute inset-0 w-full bg-gradient-to-b from-[#ff6b4a]/15 to-transparent rounded-full -z-10"
                    initial={false}
                    transition={{
                      type: "spring",
                      stiffness: 350,
                      damping: 30,
                    }}
                  >
                    {/* The warm tubelight lamp glow emitter */}
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#ff6b4a] rounded-t-full shadow-[0_0_12px_#ff6b4a]">
                      <div className="absolute w-12 h-5 bg-[#ff6b4a]/40 rounded-full blur-md -top-2 -left-2" />
                      <div className="absolute w-8 h-4 bg-[#ff2f3a]/40 rounded-full blur-sm -top-1" />
                      <div className="absolute w-4 h-4 bg-[#ffb347]/50 rounded-full blur-[2px] top-0 left-2" />
                    </div>
                  </motion.div>
                )}
              </>
            );

            if (onSelect) {
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => {
                    setActiveTab(itemId);
                    onSelect(itemId);
                  }}
                  className={cn(
                    "relative group cursor-pointer px-3 md:px-4 py-1.5 md:py-2 rounded-full transition-all flex items-center gap-1.5 select-none",
                    "text-neutral-400 hover:text-white",
                    isActive && "text-white font-semibold bg-white/[0.04]",
                  )}
                >
                  {content}
                </button>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.url}
                onClick={() => setActiveTab(itemId)}
                className={cn(
                  "relative group cursor-pointer px-3 md:px-4 py-1.5 md:py-2 rounded-full transition-all flex items-center gap-1.5 select-none",
                  "text-neutral-400 hover:text-white",
                  isActive && "text-white font-semibold bg-white/[0.04]",
                )}
              >
                {content}
              </Link>
            );
          })}
        </div>

        {/* Action Slot (Wallet / Control Center button) */}
        {actionSlot && <div className="flex items-center gap-2 pr-1 shrink-0">{actionSlot}</div>}
      </div>
    </div>
  );
}
