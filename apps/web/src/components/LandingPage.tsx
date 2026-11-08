"use client";

import { HeroSection } from "@/components/HeroSection";
import { SimulationLab } from "@/components/SimulationLab";
import { CardSticky, ContainerScroll } from "@/components/ui/cards-stack";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Code2,
  Cpu,
  KeyRound,
  Layers,
  Lock,
  ShieldCheck,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";
import type React from "react";

interface LandingPageProps {
  onLaunchApp: () => void;
}

const DEFENSE_LAYERS = [
  {
    id: "layer-1",
    phaseNumber: "01",
    tag: "Pre-Flight Intent Evaluation",
    title: "Deterministic Spending Velocity Bounds",
    subtitle: "Before any transaction reaches the Solana mempool",
    description:
      "When untrusted AI code prepares a transfer instruction, the Sentinel intercepts the intent before signature broadcast. Proposed transfers are evaluated against owner policies, 24-hour spending velocity curves, and destination allowlists. If an agent tries to transfer 1,000 USDC when its daily cap is 500 USDC, the request is halted at latency under 10ms with zero on-chain gas spent.",
    metrics: [
      { label: "Evaluation Latency", value: "<10ms" },
      { label: "Permit Expiration (TTL)", value: "60 Seconds" },
      { label: "Policy Nonce", value: "Replay-Immune" },
    ],
    codeSnippet: `// Sentinel Pre-Flight Intent Rule
const intent = await sentinel.evaluateIntent({
  agentId: "ag-alpha-trading",
  amount: 450_000_000, // 450 USDC
  recipient: "9xQ2dJ8vK...4a1M",
});
// Status: APPROVED -> Ed25519 Permit Signed`,
    glowColor: "from-[#ff6b4a]/20 via-[#ff2f3a]/5 to-transparent",
    accentBorder: "border-[#ff6b4a]/40",
    badgeColor: "text-[#ff6b4a] bg-[#ff6b4a]/10 border-[#ff6b4a]/25",
  },
  {
    id: "layer-2",
    phaseNumber: "02",
    tag: "Contextual Threat Interception",
    title: "AI-Assisted Adversarial Payload Scoring",
    subtitle: "Neutralizing indirect prompt injections and hallucinated destinations",
    description:
      "Autonomous agents frequently parse external untrusted input—Discord triggers, automated webhook payloads, and market tweets. Adversaries exploit this via indirect prompt injection to force drain transfers. Lilia's Sentinel runs contextual risk scoring to flag anomalies, contract drain patterns, and newly deployed scam sinks, terminating the permit authorization pipeline instantly.",
    metrics: [
      { label: "Threat Intercept Time", value: "Instantaneous" },
      { label: "Drain Interceptions", value: "100% Guaranteed" },
      { label: "Permit State", value: "Permanently Refused" },
    ],
    codeSnippet: `// Adversarial Prompt Injection Blocked
{
  "event": "PROMPT_INJECTION_FLAGGED",
  "threatType": "INDIRECT_INJECTION_DRAIN",
  "agent": "arb-sentinel-04",
  "anomalyScore": 0.98,
  "verdict": "PERMIT_REFUSED_REASON_DRAIN_PATTERN"
}`,
    glowColor: "from-[#ff2f3a]/25 via-[#ff6b4a]/5 to-transparent",
    accentBorder: "border-[#ff2f3a]/40",
    badgeColor: "text-[#ff2f3a] bg-[#ff2f3a]/10 border-[#ff2f3a]/25",
  },
  {
    id: "layer-3",
    phaseNumber: "03",
    tag: "Consensus-Level Hook Enforcement",
    title: "Solana Token-2022 Transfer Hook Verification",
    subtitle: "The mathematically unbypassable validator barrier",
    description:
      "Even if an attacker gains physical custody of the agent's private key and crafts a raw transaction directly to an RPC node, they cannot move funds. The mint is governed by a Solana Token-2022 Transfer Hook. At the validator consensus level, the hook contract inspects transaction accounts for an authentic, unexpired Sentinel permit. If absent or invalid, the transaction aborts deterministically.",
    metrics: [
      { label: "SVM Validation", value: "On-Chain Native" },
      { label: "Validator Rollback", value: "Deterministic" },
      { label: "Bypass Possibility", value: "Zero (Consensus)" },
    ],
    codeSnippet: `// Solana Program: process_transfer_hook
pub fn process_transfer_hook(ctx: Context<TransferHook>) -> Result<()> {
    let permit = ctx.accounts.sentinel_permit.load()?;
    require!(permit.is_valid_and_unexpired(Clock::get()?.unix_timestamp), SecurityError::InvalidPermit);
    require!(permit.authorized_agent == ctx.accounts.source.owner, SecurityError::UnauthorizedAgent);
    Ok(())
}`,
    glowColor: "from-[#14F195]/15 via-[#ffb347]/5 to-transparent",
    accentBorder: "border-[#14F195]/40",
    badgeColor: "text-[#14F195] bg-[#14F195]/10 border-[#14F195]/25",
  },
  {
    id: "layer-4",
    phaseNumber: "04",
    tag: "Model Context Protocol Integration",
    title: "Native Tooling for Claude, Cursor, and Python Agents",
    subtitle: "Zero friction integration without rewriting your agents",
    description:
      "Lilia exposes its entire verification lifecycle as 7 standard Model Context Protocol (MCP) tools. Claude Desktop, Cursor, LangChain, or custom autonomous Python agents can negotiate permissions, request permits, and simulate transaction outcomes natively in their context window before ever attempting an on-chain execution.",
    metrics: [
      { label: "Supported Runtimes", value: "Bun, Node, Python" },
      { label: "MCP Tools Exposed", value: "7 Core Primitives" },
      { label: "Devnet Ready", value: "Instant Connection" },
    ],
    codeSnippet: `// claude_desktop_config.json
{
  "mcpServers": {
    "lilia": {
      "command": "bunx",
      "args": ["@lilia/mcp"],
      "env": { "SOLANA_NETWORK": "devnet" }
    }
  }
}`,
    glowColor: "from-[#ffb347]/20 via-[#ff6b4a]/5 to-transparent",
    accentBorder: "border-[#ffb347]/40",
    badgeColor: "text-[#ffb347] bg-[#ffb347]/10 border-[#ffb347]/25",
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onLaunchApp }) => {
  return (
    <div
      style={{ background: "#07080a", color: "#ffffff" }}
      className="selection:bg-[#ff6b4a] selection:text-black overflow-hidden"
    >
      {/* ── HERO SECTION ────────────────────────────────────────── */}
      <HeroSection onLaunchApp={onLaunchApp} />

      {/* ── SECTIONS with Subtle Varied Aurora Backdrops ─────────── */}
      <div className="relative w-full">
        {/* Subtle Section 1 Aurora Blade: Angled Left Blade */}
        <div
          className="pointer-events-none absolute top-12 -left-48 w-[650px] h-[350px] rounded-full blur-[110px] opacity-25"
          style={{
            background:
              "linear-gradient(115deg, rgba(255, 47, 58, 0.7) 0%, rgba(255, 107, 74, 0.4) 60%, transparent 100%)",
          }}
          aria-hidden="true"
        />

        {/* Subtle Section 2 Aurora Blade: Mid-Right Blade */}
        <div
          className="pointer-events-none absolute top-[900px] -right-40 w-[700px] h-[380px] rounded-full blur-[120px] opacity-20"
          style={{
            background:
              "linear-gradient(75deg, transparent 0%, rgba(255, 179, 71, 0.4) 40%, rgba(255, 47, 58, 0.6) 100%)",
          }}
          aria-hidden="true"
        />

        {/* Subtle Section 3 Aurora Blade: Lower Floor Glow */}
        <div
          className="pointer-events-none absolute bottom-[600px] left-1/4 w-[800px] h-[320px] rounded-full blur-[130px] opacity-15"
          style={{
            background:
              "linear-gradient(90deg, rgba(255, 107, 74, 0.5) 0%, rgba(255, 47, 58, 0.4) 50%, rgba(255, 179, 71, 0.3) 100%)",
          }}
          aria-hidden="true"
        />

        <div className="max-w-6xl mx-auto px-4 md:px-8 space-y-36 relative z-10 pt-16 pb-24">
          {/* ── THE THESIS: WHY SIGNATURES FAIL (Paul Graham Framing) ── */}
          <section id="problem" className="relative">
            <div className="p-8 sm:p-14 rounded-3xl bg-[#0c0d12]/85 border border-white/[0.09] backdrop-blur-2xl shadow-[0_24px_70px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.06)] relative overflow-hidden">
              {/* Internal subtle glow */}
              <div
                className="absolute -top-32 -right-24 w-[420px] h-[340px] rounded-full pointer-events-none opacity-20 blur-3xl"
                style={{
                  background: "radial-gradient(circle, #ff6b4a 0%, #ff2f3a 50%, transparent 80%)",
                }}
              />

              <div className="max-w-3xl relative z-10">
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#ff6b4a] inline-flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ff6b4a]" />
                  The Fundamental Flaw in Agentic Web3
                </span>

                <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mt-3 mb-8 leading-[1.12]">
                  A private key is an all-or-nothing weapon.
                </h2>

                <div className="space-y-5 text-base sm:text-lg text-neutral-300 leading-relaxed font-sans font-normal">
                  <p>
                    In traditional systems architecture, you would never grant an autonomous,
                    probabilistic background worker root administrative access to the primary
                    database without rate limits, allowlists, and boundary verification.
                  </p>
                  <p>
                    Yet across Web3, teams give autonomous LLM agents unchecked access to private
                    keys. When an agent parses an untrusted prompt injection, experiences semantic
                    hallucination, or miscalculates slippage, it signs an irreversible transaction.
                    Blockchain validators don&apos;t know the agent was deceived; they only see a
                    valid cryptographic signature and finalize the drain.
                  </p>
                  <p className="text-white font-medium border-l-2 border-[#ff6b4a] pl-4 py-1 bg-white/[0.02] rounded-r-lg">
                    Lilia decouples signing capability from settlement authority. Transactions
                    cannot settle without an authorized Ed25519 permit issued by our Sentinel and
                    deterministically verified by the Solana Token-2022 Transfer Hook at the
                    validator level.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ── CARDS-STACK SECTION: DEFENSE IN DEPTH ────────────── */}
          <section id="firewall" className="relative">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#ff6b4a] inline-flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ffb347]" />
                Architectural Specification
              </span>
              <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mt-3">
                Defense in Depth: From Model Intent to Block Settlement
              </h2>
              <p className="text-sm sm:text-base text-neutral-400 mt-4 leading-relaxed">
                Four decoupled security rings designed so that a total failure at any layer is
                caught and neutralized by the next.
              </p>
            </div>

            {/* Sticky Cards Stack inspired by cards-stack.tsx */}
            <ContainerScroll className="space-y-12">
              {DEFENSE_LAYERS.map((layer, index) => (
                <CardSticky
                  key={layer.id}
                  index={index}
                  incrementY={36}
                  incrementZ={16}
                  className="w-full rounded-3xl bg-[#0b0c10]/95 border border-white/[0.1] backdrop-blur-3xl shadow-[0_30px_90px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.08)] p-6 sm:p-10 transition-all"
                >
                  <div className="flex flex-col lg:flex-row items-start justify-between gap-8">
                    {/* Left Column: Description & Insights */}
                    <div className="flex-1 space-y-6">
                      <div className="flex items-center justify-between gap-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider border ${layer.badgeColor}`}
                        >
                          {layer.phaseNumber} · {layer.tag}
                        </span>
                        <span className="text-xs font-mono text-neutral-500">
                          Layer {index + 1} of 4
                        </span>
                      </div>

                      <div>
                        <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                          {layer.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-[#ffb347] font-mono mt-1 font-medium">
                          {layer.subtitle}
                        </p>
                      </div>

                      <p className="text-neutral-300 text-sm sm:text-base leading-relaxed">
                        {layer.description}
                      </p>

                      {/* Technical Metrics Pill Grid */}
                      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/[0.08]">
                        {layer.metrics.map((m) => (
                          <div key={m.label} className="space-y-1">
                            <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                              {m.label}
                            </div>
                            <div className="text-xs sm:text-sm font-mono font-bold text-white">
                              {m.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right Column: Sleek Glassmorphic Code Terminal */}
                    <div className="w-full lg:w-[45%] shrink-0">
                      <div className="rounded-2xl bg-[#050608] border border-white/[0.08] shadow-inner p-4 font-mono text-xs overflow-x-auto relative group">
                        <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06] text-[11px] text-neutral-500">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                            <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                          </div>
                          <span>solana::lilia_guard</span>
                        </div>
                        <pre className="text-neutral-200 leading-relaxed text-[11px] overflow-x-auto selection:bg-[#ff6b4a] selection:text-black">
                          <code>{layer.codeSnippet}</code>
                        </pre>
                      </div>
                    </div>
                  </div>
                </CardSticky>
              ))}
            </ContainerScroll>
          </section>

          {/* ── LIVE INTERACTIVE SIMULATION SUITE ────────────────── */}
          <section id="simulation" className="relative">
            <div className="p-8 sm:p-12 rounded-3xl bg-[#0b0c10]/90 border border-white/[0.09] backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,0,0,0.7)] relative overflow-hidden">
              <div className="mb-8">
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#ff6b4a] inline-flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#14F195]" />
                  Live 48-Hour Hackathon Demo Harness
                </span>
                <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white mt-2">
                  Execute Real Transaction Scenarios on Solana Devnet
                </h2>
                <p className="text-sm text-neutral-400 mt-2">
                  Test prompt injection interception, spending velocity threshold halts, and
                  consensus rollbacks in real time.
                </p>
              </div>

              <SimulationLab />
            </div>
          </section>

          {/* ── MODEL CONTEXT PROTOCOL (MCP) INTEGRATION ─────────── */}
          <section id="mcp" className="relative">
            <div className="p-8 sm:p-12 rounded-3xl bg-[#0b0c10]/90 border border-white/[0.09] backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,0,0,0.7)] grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ffb347]/10 border border-[#ffb347]/20 text-[#ffb347] text-xs font-mono font-bold mb-4">
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Model Context Protocol (MCP) Ready</span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white mb-4">
                  Integrate with Claude, Cursor, and Autonomous Agents in Minutes
                </h2>
                <p className="text-sm sm:text-base text-neutral-400 leading-relaxed mb-6 font-sans">
                  Lilia requires zero changes to your agent reasoning loop. Our MCP server exposes 7
                  core security tools (`evaluate_transaction`, `request_authorization`,
                  `prepare_transfer`, etc.) directly into any MCP-compatible framework.
                </p>
                <div className="space-y-3 font-mono text-xs sm:text-sm text-neutral-300">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[#14F195] font-bold">✓</span>
                    <span>Works with Claude Desktop, Cursor, and custom Python/Node agents</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-[#14F195] font-bold">✓</span>
                    <span>Enforces agent identity and principal authorization checks</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-[#14F195] font-bold">✓</span>
                    <span>Zero duplicate logic: Shared Sentinel engine for REST and MCP</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-[#050608] border border-white/[0.08] p-5 font-mono text-xs overflow-x-auto shadow-inner">
                <div className="text-neutral-500 text-[11px] mb-2">
                  {/* claude_desktop_config.json */}
                </div>
                <pre className="text-[#ffb347] leading-relaxed text-[11px]">
                  {`{
  "mcpServers": {
    "lilia": {
      "command": "bunx",
      "args": ["@lilia/mcp"],
      "env": {
        "LILIA_API_KEY": "lilia_sec_live_9xQ2...",
        "SOLANA_NETWORK": "devnet"
      }
    }
  }
}`}
                </pre>
              </div>
            </div>
          </section>

          {/* ── FINAL CALL TO ACTION ────────────────────────────── */}
          <section className="text-center py-12 max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-4 leading-tight">
              Autonomous agents. <br className="hidden sm:inline" />
              <span
                style={{
                  background: "linear-gradient(135deg, #ffb347 0%, #ff6b4a 50%, #ff2f3a 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Bounded authority.
              </span>
            </h2>
            <p className="text-neutral-400 text-sm sm:text-base max-w-xl mx-auto mb-8 leading-relaxed">
              Give autonomous agents the ability to operate on-chain without handing over an
              unconstrained private key.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={onLaunchApp}
                className="group flex items-center gap-2.5 px-8 py-3.5 rounded-full text-sm font-semibold transition-all active:scale-[0.98] cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, #ff6b4a, #ff2f3a)",
                  color: "#ffffff",
                  boxShadow: "0 0 35px rgba(255,107,74,0.45), inset 0 1px 0 rgba(255,255,255,0.2)",
                }}
              >
                <span>Launch Lilia Control Center</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <a
                href="#problem"
                className="px-6 py-3.5 rounded-full text-sm font-medium text-neutral-300 border border-white/[0.12] hover:text-white hover:border-white/[0.25] transition-all"
              >
                Read Protocol Whitepaper
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
