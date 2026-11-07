"use client";

import React, { useState } from "react";
import { Terminal, Copy, Check, ExternalLink, Code2, Cpu, ArrowUpRight } from "lucide-react";

export const IntegrationsView: React.FC = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopy = (sec: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sec);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const mcpConfig = `{
  "mcpServers": {
    "lilia": {
      "command": "bunx",
      "args": ["@lilia/mcp-server"],
      "env": {
        "LILIA_API_KEY": "lilia_sec_live_9xQ2dJ8vK4a1M",
        "SOLANA_NETWORK": "devnet"
      }
    }
  }
}`;

  const curlExample = `curl -X POST http://localhost:4000/api/sentinel/evaluate \\
  -H "Authorization: Bearer YOUR_LILIA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agentId": "agent-alpha-01",
    "sender": "7FvB5hK...9q1X",
    "recipient": "AgentBeta_3KmA9hR7z2p8L",
    "mint": "Token22zP...M1ntUsdc92x4",
    "amount": 500,
    "purpose": "Liquidity pool rebalance"
  }'`;

  const mcpTools = [
    {
      name: "evaluate_transaction",
      description: "Evaluate a proposed token transfer against owner policy rules and risk heuristics.",
      scope: "Off-Chain Sentinel",
    },
    {
      name: "request_authorization",
      description: "Request a cryptographically signed Ed25519 authorization permit for an approved transaction.",
      scope: "Permit Authority",
    },
    {
      name: "prepare_transfer",
      description: "Construct the exact Solana Token-2022 instruction set including required Transfer Hook accounts.",
      scope: "Blockchain Prep",
    },
    {
      name: "simulate_transfer",
      description: "Execute a hypothetical transfer simulation against Devnet to predict hook execution outcome.",
      scope: "Simulation Lab",
    },
    {
      name: "get_transaction_status",
      description: "Retrieve verified on-chain execution status and explorer signatures for an authorized transaction.",
      scope: "Observer",
    },
    {
      name: "get_agent",
      description: "Retrieve registered agent identity, active status, public keys, and assigned policies.",
      scope: "Registry",
    },
    {
      name: "get_policy",
      description: "Inspect spending limits, velocity allowances, and allowlisted recipient public keys.",
      scope: "Policy Engine",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-semibold uppercase text-neutral-400">
              Developer & Agent Infrastructure
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Cpu className="w-7 h-7 text-[#FF5533]" />
            MCP Server & REST Integration Hub
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Connect Claude Code, Cursor, ElizaOS, or custom Python/TypeScript agents directly to Lilia Sentinel
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 font-mono text-xs font-bold">
            Model Context Protocol Ready
          </span>
        </div>
      </div>

      {/* Model Context Protocol (MCP) Setup Box */}
      <div className="rounded-2xl bg-[#111317] border border-white/[0.08] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
              Claude Desktop & Cursor MCP Configuration
            </h3>
            <p className="text-xs text-neutral-400">
              Paste this configuration into your Claude Desktop or Cursor MCP settings to empower your agents with transaction security tools.
            </p>
          </div>

          <button
            onClick={() => handleCopy("mcp", mcpConfig)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-mono text-white transition-all self-start sm:self-auto"
          >
            {copiedSection === "mcp" ? (
              <Check className="w-3.5 h-3.5 text-[#14F195]" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copiedSection === "mcp" ? "Copied" : "Copy Config"}</span>
          </button>
        </div>

        <pre className="p-4 rounded-xl bg-black border border-white/[0.08] text-purple-300 font-mono text-xs overflow-x-auto">
          {mcpConfig}
        </pre>
      </div>

      {/* 7 Core MVP MCP Tools Table */}
      <div className="rounded-2xl bg-[#111317] border border-white/[0.08] overflow-hidden">
        <div className="p-4 border-b border-white/[0.08] bg-black/40 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
            <Code2 className="w-4 h-4 text-[#FF5533]" />
            Discovered MCP Tool Capabilities (Official TypeScript SDK)
          </h3>
          <span className="text-xs font-mono text-neutral-500">7 Core Tools Live</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-black/20 text-neutral-400 border-b border-white/[0.05]">
              <tr>
                <th className="py-3 px-4 font-semibold">Tool Name</th>
                <th className="py-3 px-4 font-semibold">Description</th>
                <th className="py-3 px-4 font-semibold text-right">Execution Scope</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05] text-neutral-300">
              {mcpTools.map((tool) => (
                <tr key={tool.name} className="hover:bg-white/[0.02]">
                  <td className="py-3 px-4 font-bold text-[#FF5533]">
                    {tool.name}()
                  </td>
                  <td className="py-3 px-4 text-neutral-300 max-w-md font-sans text-xs">
                    {tool.description}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="px-2 py-0.5 rounded bg-white/[0.05] text-neutral-400 text-[10px]">
                      {tool.scope}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fastify REST API Section */}
      <div className="rounded-2xl bg-[#111317] border border-white/[0.08] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#14F195]"></span>
              Direct Fastify REST Endpoint
            </h3>
            <p className="text-xs text-neutral-400">
              Evaluate transaction intent and request signed Ed25519 permits directly from backend services.
            </p>
          </div>

          <button
            onClick={() => handleCopy("curl", curlExample)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-mono text-white transition-all self-start sm:self-auto"
          >
            {copiedSection === "curl" ? (
              <Check className="w-3.5 h-3.5 text-[#14F195]" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copiedSection === "curl" ? "Copied" : "Copy cURL"}</span>
          </button>
        </div>

        <pre className="p-4 rounded-xl bg-black border border-white/[0.08] text-[#14F195] font-mono text-xs overflow-x-auto">
          {curlExample}
        </pre>
      </div>
    </div>
  );
};
