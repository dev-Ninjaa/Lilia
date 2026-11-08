"use client";

import React, { useEffect, useState } from "react";
import { Copy, Check, Code2, Cpu } from "lucide-react";
import { ApiError, initializeSentinel, integrationsStatus, rotateSentinel, solanaStatus } from "../lib/api";
import type { IntegrationsStatus, SolanaStatus } from "../lib/api";

export const IntegrationsView: React.FC = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationsStatus | null>(null);
  const [solana, setSolana] = useState<SolanaStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminBusy, setAdminBusy] = useState(false);
  const [sentinelKey, setSentinelKey] = useState("");

  useEffect(() => {
    Promise.all([integrationsStatus(), solanaStatus()])
      .then(([i, s]) => {
        setIntegrations(i);
        setSolana(s);
      })
      .catch((caught) => {
        if (caught instanceof ApiError) setError(`${caught.code}: ${caught.message}`);
        else setError("Could not load integration status.");
      });
  }, []);

  const sentinelAction = async (action: "initialize" | "rotate") => {
    setAdminBusy(true);
    setAdminError(null);
    try {
      if (action === "initialize") await initializeSentinel(sentinelKey.trim());
      else await rotateSentinel(sentinelKey.trim());
      setSentinelKey("");
      const [i, s] = await Promise.all([integrationsStatus(), solanaStatus()]);
      setIntegrations(i);
      setSolana(s);
    } catch (caught) {
      if (caught instanceof ApiError) setAdminError(`${caught.code}: ${caught.message}`);
      else setAdminError("Sentinel administration failed.");
    } finally {
      setAdminBusy(false);
    }
  };

  const handleCopy = (sec: string, text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedSection(sec);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const mcpConfig = `{
  "mcpServers": {
    "lilia": {
      "command": "bunx",
      "args": ["@lilia/mcp-server"],
      "env": {
        "LILIA_API_KEY": "YOUR_LILIA_API_KEY",
        "SOLANA_NETWORK": "devnet"
      }
    }
  }
}`;

  const curlExample = `curl -X POST http://localhost:4000/api/sentinel/evaluate \\
  -H "Authorization: Bearer YOUR_LILIA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agentId": "<agent UUID>",
    "recipient": "<recipient address>",
    "mint": "<Token-2022 mint>",
    "amount": "100"
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
            MCP: {integrations?.mcp.status ?? "…"}
          </span>
        </div>
      </div>

      {/* Live status */}
      <div className="rounded-2xl bg-[#111317] border border-white/[0.08] p-6 space-y-4">
        <h3 className="text-base font-bold text-white">Live integration status</h3>
        {error ? (
          <p className="text-xs font-mono text-red-400">{error}</p>
        ) : !integrations || !solana ? (
          <p className="text-xs font-mono text-neutral-500">Loading status…</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
            <div className="rounded-xl bg-black/40 border border-white/[0.05] p-3">
              <div className="text-neutral-500 mb-1">Solana RPC</div>
              <div className="text-white">{integrations.solanaRpc.status}</div>
              <div className="text-neutral-400 mt-1">{integrations.solanaRpc.note}</div>
              <div className="text-neutral-400 mt-1">
                Program: {solana.programId} · Commitment: {solana.commitment}
              </div>
              <div className="text-neutral-400">
                Sentinel: {solana.sentinelPublicKey ?? "not initialized"} · Slot: {solana.latestSlot ?? "—"}
              </div>
              <div className="text-neutral-400">Admin configured: {String(solana.adminConfigured)}</div>
            </div>
            <div className="rounded-xl bg-black/40 border border-white/[0.05] p-3">
              <div className="text-neutral-500 mb-1">Gemini</div>
              <div className="text-white">{integrations.gemini.status}</div>
              <div className="text-neutral-500 mt-2">Database</div>
              <div className="text-white">{integrations.database.status}</div>
              <div className="text-neutral-500 mt-2">MCP</div>
              <div className="text-white">{integrations.mcp.status}</div>
            </div>
          </div>
        )}
      </div>

      {/* Sentinel administration */}
      <div className="rounded-2xl bg-[#111317] border border-white/[0.08] p-6 space-y-4">
        <h3 className="text-base font-bold text-white">Sentinel administration</h3>
        <p className="text-xs text-neutral-400">
          Initialize or rotate the on-chain SentinelAuthority. Signed by the configured admin keypair.
        </p>
        {adminError && <p className="text-xs font-mono text-red-400">{adminError}</p>}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={sentinelKey}
            onChange={(e) => setSentinelKey(e.target.value)}
            placeholder="Base58 Sentinel public key"
            className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-white font-mono focus:outline-none focus:border-[#FF5533]"
          />
          <button
            onClick={() => void sentinelAction("initialize")}
            disabled={adminBusy || !sentinelKey.trim()}
            className="px-4 py-2 rounded-xl bg-[#FF5533] text-black font-semibold text-xs disabled:opacity-40 hover:bg-[#ff6847]"
          >
            Initialize
          </button>
          <button
            onClick={() => void sentinelAction("rotate")}
            disabled={adminBusy || !sentinelKey.trim()}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs disabled:opacity-40"
          >
            Rotate
          </button>
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
              Paste this configuration into your Claude Desktop or Cursor MCP settings. The MCP server is not implemented yet — the backend reports `not_implemented`.
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

      {/* MCP Tools Table (documented target, not implemented) */}
      <div className="rounded-2xl bg-[#111317] border border-white/[0.08] overflow-hidden">
        <div className="p-4 border-b border-white/[0.08] bg-black/40 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
            <Code2 className="w-4 h-4 text-[#FF5533]" />
            Planned MCP Tool Capabilities
          </h3>
          <span className="text-xs font-mono text-neutral-500">Not implemented</span>
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
