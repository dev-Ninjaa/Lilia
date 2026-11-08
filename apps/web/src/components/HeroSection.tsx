"use client";

import React from "react";
import { ArrowRight, Terminal, Shield, Sparkles, Code2 } from "lucide-react";

/* ─── Inline SVG glyphs ─────────────────────────────────────── */
function SearchGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function DeployIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function OpenIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}

/* ─── SVG Film Grain Filter ─────────────────────────────────── */
function FilmGrain() {
  return (
    <svg
      style={{ position: "absolute", width: 0, height: 0 }}
      aria-hidden="true"
    >
      <defs>
        <filter id="film-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
          <feBlend in="SourceGraphic" mode="overlay" result="blend" />
          <feComposite in="blend" in2="SourceGraphic" operator="in" />
        </filter>
      </defs>
    </svg>
  );
}

/* ─── Component ─────────────────────────────────────────────── */
interface HeroSectionProps {
  onLaunchApp: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onLaunchApp }) => {
  return (
    <section
      className="relative flex flex-col items-center justify-start overflow-hidden pt-28 pb-20 px-4 md:px-8"
      style={{ minHeight: "100dvh", background: "#07080a" }}
    >
      {/* Film grain SVG filter definition */}
      <FilmGrain />

      {/* Living Animated Aurora light-blades */}
      <div className="aurora-bg" aria-hidden="true">
        <div className="aurora-blade aurora-blade-1" />
        <div className="aurora-blade aurora-blade-2" />
        <div className="aurora-blade aurora-blade-3" />
        <div className="aurora-blade aurora-blade-4" />
        <div className="aurora-blade aurora-blade-5" />

        {/* SVG film-grain overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.08,
            filter: "url(#film-grain)",
            background: "rgba(255,255,255,0.03)",
            zIndex: 5,
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Hero content */}
      <div className="relative z-10 flex flex-col items-center text-center w-full max-w-4xl mx-auto">
        {/* Eyebrow chip: Paul Graham insight prompt */}
        <div
          className="inline-flex items-center gap-2 mb-6"
          style={{
            padding: "5px 14px",
            borderRadius: "999px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.12)",
            backdropFilter: "blur(16px)",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #ffb347, #ff2f3a)",
              display: "inline-block",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              color: "#e2e8f0",
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: "0.02em",
              fontFamily: "var(--font-geist-mono), monospace",
            }}
          >
            Solana Token-2022 Transfer Hook Architecture
          </span>
        </div>

        {/* H1 — Paul Graham 30-year veteran pitch */}
        <h1
          className="hero-headline"
          style={{
            fontSize: "clamp(38px, 5.5vw, 64px)",
            fontWeight: 600,
            lineHeight: 1.1,
            color: "#ffffff",
            maxWidth: 820,
            marginBottom: 22,
            letterSpacing: "-0.025em",
          }}
        >
          Signatures prove who signed.{" "}
          <br className="hidden sm:inline" />
          Not whether they were{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #ffb347 0%, #ff6b4a 50%, #ff2f3a 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            deceived
          </span>
          .
        </h1>

        {/* Subtitle: Paul Graham framing on why unchecked agent keys are lethal */}
        <p
          style={{
            fontSize: 17,
            fontWeight: 400,
            color: "rgba(255,255,255,0.65)",
            lineHeight: 1.65,
            maxWidth: 640,
            marginBottom: 32,
            letterSpacing: "0.005em",
          }}
        >
          When you hand an autonomous AI agent an unbounded private key, you haven&apos;t built
          an independent operator—you&apos;ve given root treasury access to software susceptible to prompt injection.
          Lilia enforces mathematical spending caps and recipient allowlists directly on the validator level.
        </p>

        {/* PURPOSEFUL PRIMARY ACTIONS (Explore Protocol moved above!) */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 mb-5">
          <a
            href="#problem"
            className="group inline-flex items-center gap-2.5 px-6 py-3 rounded-full text-sm font-semibold transition-all active:scale-[0.98]"
            style={{
              background: "#e6e6e6",
              color: "#18181b",
              boxShadow:
                "0 0 0 1.5px rgba(0,0,0,0.9), 0 0 20px rgba(255,255,255,0.2), inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(0,0,0,0.18)",
            }}
          >
            <Shield className="w-4 h-4 text-[#ff2f3a]" />
            <span>Explore The Protocol</span>
            <ArrowRight className="w-4 h-4 text-neutral-600 group-hover:translate-x-0.5 transition-transform" />
          </a>

          <a
            href="#simulation"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium transition-all active:scale-[0.98]"
            style={{
              background: "rgba(255,255,255,0.06)",
              color: "#ffffff",
              border: "1px solid rgba(255,255,255,0.14)",
              backdropFilter: "blur(12px)",
            }}
          >
            <Terminal className="w-4 h-4 text-[#ffb347]" />
            <span>Run Simulation Lab</span>
          </a>

          <button
            onClick={onLaunchApp}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium transition-all active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, rgba(255,107,74,0.18), rgba(255,47,58,0.1))",
              color: "#ff6b4a",
              border: "1px solid rgba(255,107,74,0.35)",
              backdropFilter: "blur(12px)",
            }}
          >
            <Sparkles className="w-4 h-4 text-[#ff6b4a]" />
            <span>Open Sentinel App</span>
          </button>
        </div>

        {/* GeistMono install/spec caption */}
        <p
          style={{
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: 12,
            color: "#9c9c9d",
            marginBottom: 42,
            letterSpacing: "0.01em",
          }}
        >
          <span style={{ opacity: 0.7 }}>bunx @lilia/mcp-server</span>
          <span style={{ opacity: 0.35, margin: "0 10px" }}>·</span>
          <span style={{ opacity: 0.6 }}>Deterministic Solana Token-2022 Transfer Hook</span>
        </p>

        {/* Dark-glass command bar / launcher mockup */}
        <div
          style={{
            width: "100%",
            maxWidth: 620,
            borderRadius: 14,
            background: "rgba(10, 10, 14, 0.76)",
            border: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(28px)",
            boxShadow:
              "0 0 0 1px rgba(0,0,0,0.6), 0 24px 64px rgba(0,0,0,0.65), 0 0 45px rgba(255,107,74,0.08)",
            overflow: "hidden",
            textAlign: "left",
          }}
        >
          {/* Search / input row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <span style={{ color: "#9c9c9d", flexShrink: 0 }}>
              <SearchGlyph />
            </span>
            <span style={{ flex: 1, fontSize: 13, color: "#ffffff", fontWeight: 400 }}>
              evaluate_intent: agent-alpha transfer 450 USDC
              <span
                className="caret-blink"
                style={{
                  display: "inline-block",
                  width: 2,
                  height: 15,
                  background: "#ff6b4a",
                  marginLeft: 3,
                  verticalAlign: "middle",
                  borderRadius: 1,
                }}
              />
            </span>
            {/* Command mode pill */}
            <span
              style={{
                padding: "3px 10px",
                borderRadius: 999,
                background: "rgba(255,107,74,0.14)",
                border: "1px solid rgba(255,107,74,0.3)",
                color: "#ff6b4a",
                fontSize: 11,
                fontFamily: "var(--font-geist-mono), monospace",
                fontWeight: 500,
                flexShrink: 0,
              }}
            >
              Transfer Hook
            </span>
          </div>

          {/* Result rows */}
          {[
            {
              icon: <ShieldIcon />,
              label: "Verify Policy Bound",
              arg: "max: 500 USDC / 24h",
              shortcut: "PASS",
              active: true,
            },
            {
              icon: <DeployIcon />,
              label: "Evaluate Recipient Nonce",
              arg: "allowlist: verified",
              shortcut: "0ms",
              active: false,
            },
            {
              icon: <KeyIcon />,
              label: "Sign Ed25519 Permit",
              arg: "valid: 60s ttl",
              shortcut: "ED25519",
              active: false,
            },
            {
              icon: <OpenIcon />,
              label: "Execute On-Chain Settlement",
              arg: "solana::token_2022",
              shortcut: "COMMITTED",
              active: false,
            },
          ].map((row, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 16px",
                background: row.active
                  ? "linear-gradient(90deg, rgba(255,107,74,0.15) 0%, rgba(255,47,58,0.08) 100%)"
                  : "transparent",
                borderLeft: row.active
                  ? "2px solid rgba(255,107,74,0.85)"
                  : "2px solid transparent",
              }}
            >
              <span
                style={{
                  color: row.active ? "#ff6b4a" : "#9c9c9d",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {row.icon}
              </span>
              <span
                style={{
                  flex: 1,
                  fontSize: 13,
                  color: row.active ? "#ffffff" : "rgba(255,255,255,0.7)",
                  fontWeight: row.active ? 500 : 400,
                }}
              >
                {row.label}{" "}
                <span
                  style={{
                    fontFamily: "var(--font-geist-mono), monospace",
                    fontSize: 12,
                    color: row.active ? "rgba(255,179,71,0.95)" : "#9c9c9d",
                    fontWeight: 400,
                  }}
                >
                  {row.arg}
                </span>
              </span>
              {/* Status indicator chip */}
              <span
                style={{
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontSize: 11,
                  color: row.active ? "#ffb347" : "#9c9c9d",
                  padding: "2px 7px",
                  borderRadius: 5,
                  background: row.active
                    ? "rgba(255,107,74,0.16)"
                    : "rgba(255,255,255,0.05)",
                  border: `1px solid ${row.active ? "rgba(255,107,74,0.35)" : "rgba(255,255,255,0.08)"}`,
                  flexShrink: 0,
                }}
              >
                {row.shortcut}
              </span>
            </div>
          ))}

          {/* Footer strip */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "9px 16px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(0,0,0,0.35)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: 11,
                color: "#9c9c9d",
                letterSpacing: "0.01em",
              }}
            >
              Consensus guard active · Ed25519 verified
            </span>
            <span
              style={{
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: 11,
                color: "rgba(255,107,74,0.8)",
                fontWeight: 600,
                letterSpacing: "0.08em",
              }}
            >
              LILIA PROTOCOL
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
