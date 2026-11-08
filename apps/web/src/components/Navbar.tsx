"use client";

import { ArrowRight, Menu, X } from "lucide-react";
import Link from "next/link";
import type React from "react";
import { useState } from "react";

function GithubIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
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

type NavbarProps = {
  launchHref?: string;
};

export const Navbar: React.FC<NavbarProps> = ({ launchHref = "/console/overview" }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: "Product", href: "#the-problem" },
    { name: "How It Works", href: "#how-it-works" },
    { name: "Simulation", href: "#simulation-lab" },
    { name: "Integrations", href: "#integrations" },
    { name: "Docs", href: "https://github.com/dev-Ninjaa/Lilia#readme", external: true },
  ];

  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-5xl">
      <div className="flex items-center justify-between gap-4 px-4 sm:px-5 py-2 rounded-full bg-[#0a0a0e]/80 border border-white/[0.09] backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.08)]">
        {/* Left: Brand + Badge */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Link href="/" className="flex items-center gap-2 group">
            <DiamondGlyph />
            <span className="font-bold tracking-wider text-xs sm:text-sm text-white group-hover:text-neutral-200 transition-colors">
              LILIA
            </span>
          </Link>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-white/[0.04] text-[10px] font-mono text-neutral-400 border border-white/[0.07]">
            Solana
          </span>
        </div>

        {/* Center: Clean Nav Links */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noopener noreferrer" : undefined}
              className="text-xs sm:text-sm font-medium text-neutral-400 hover:text-white transition-colors duration-150"
            >
              {link.name}
            </a>
          ))}
        </nav>

        {/* Right: GitHub Icon + Launch App Button */}
        <div className="flex items-center gap-3 shrink-0">
          <a
            href="https://github.com/dev-Ninjaa/Lilia"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub Repository"
            className="hidden sm:flex p-1.5 text-neutral-400 hover:text-white transition-colors"
          >
            <GithubIcon className="w-4 h-4" />
          </a>

          <Link
            href={launchHref}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white text-black hover:bg-neutral-200 transition-all shadow-sm active:scale-[0.98]"
          >
            <span className="hidden sm:inline">Launch App</span>
            <span className="sm:hidden">App</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1 text-neutral-400 hover:text-white"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="mt-2 p-4 rounded-2xl bg-[#0a0a0e]/95 border border-white/[0.09] backdrop-blur-2xl flex flex-col gap-2.5 md:hidden shadow-2xl">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noopener noreferrer" : undefined}
              className="text-sm font-medium text-neutral-300 hover:text-white py-1 px-2 rounded-lg hover:bg-white/[0.04]"
            >
              {link.name}
            </a>
          ))}
          <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between px-2">
            <a
              href="https://github.com/dev-Ninjaa/Lilia"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-neutral-400 hover:text-white"
            >
              <GithubIcon className="w-4 h-4" />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
