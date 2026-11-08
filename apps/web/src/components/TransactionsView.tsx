"use client";

import type { Transaction } from "@/lib/types";
import { Check, Code, Copy, ExternalLink, Search } from "lucide-react";
import type React from "react";
import { useState } from "react";

interface TransactionsViewProps {
  transactions: Transaction[];
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({ transactions }) => {
  const [search, setSearch] = useState("");
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [copied, setCopied] = useState(false);

  const filtered = transactions.filter(
    (t) =>
      t.agentName.toLowerCase().includes(search.toLowerCase()) ||
      t.sender.toLowerCase().includes(search.toLowerCase()) ||
      t.recipient.toLowerCase().includes(search.toLowerCase()) ||
      t.txSignature?.toLowerCase().includes(search.toLowerCase()),
  );

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-semibold uppercase text-neutral-400">
              Audit & Execution Telemetry
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Transaction Monitor & Permit Inspector
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Every transaction intent, Sentinel permit assessment, and Solana Transfer Hook execution
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by agent, address, or tx hash..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#FF5533]"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-2xl bg-[#111317] border border-white/[0.08] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-black/40 text-neutral-400 border-b border-white/[0.08]">
              <tr>
                <th className="py-3 px-4 font-semibold">Timestamp</th>
                <th className="py-3 px-4 font-semibold">Agent</th>
                <th className="py-3 px-4 font-semibold">Amount</th>
                <th className="py-3 px-4 font-semibold">Destination</th>
                <th className="py-3 px-4 font-semibold">Sentinel Permit</th>
                <th className="py-3 px-4 font-semibold">On-Chain Hook Status</th>
                <th className="py-3 px-4 font-semibold text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05] text-neutral-300">
              {filtered.map((tx) => (
                // biome-ignore lint/a11y/useKeyWithClickEvents: rows also expose an Inspect button for keyboard users
                <tr
                  key={tx.id}
                  onClick={() => setSelectedTx(tx)}
                  className="hover:bg-white/[0.02] cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 text-neutral-500">
                    {tx.createdAt.split("T")[1]?.replace("Z", "")}
                  </td>

                  <td className="py-3 px-4 font-sans font-semibold text-white">{tx.agentName}</td>

                  <td className="py-3 px-4">
                    <span className="font-bold text-white">{tx.amount}</span>{" "}
                    <span className="text-neutral-500">{tx.mintSymbol}</span>
                  </td>

                  <td className="py-3 px-4 text-neutral-400">
                    {tx.recipient.length > 20
                      ? `${tx.recipient.substring(0, 10)}...${tx.recipient.substring(tx.recipient.length - 4)}`
                      : tx.recipient}
                  </td>

                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        tx.sentinelDecision === "APPROVED"
                          ? "bg-emerald-500/10 text-[#14F195]"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {tx.sentinelDecision === "APPROVED" ? "PERMIT_SIGNED" : "PERMIT_REFUSED"}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        tx.executionStatus === "EXECUTED"
                          ? "bg-emerald-500/20 text-[#14F195]"
                          : tx.executionStatus === "PENDING"
                            ? "bg-blue-500/20 text-blue-400"
                            : tx.executionStatus === "REJECTED_ON_CHAIN"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {tx.executionStatus}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-right">
                    {tx.txSignature && (
                      <a
                        href={`https://explorer.solana.com/tx/${tx.txSignature}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="mr-3 inline-flex items-center gap-1 text-xs text-[#14F195] hover:underline font-sans font-semibold"
                      >
                        Proof <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTx(tx);
                      }}
                      className="text-xs text-[#FF5533] hover:underline font-sans font-semibold"
                    >
                      Inspect →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Cryptographic Permit Sheet */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl rounded-2xl bg-[#111317] border border-white/[0.15] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Code className="w-5 h-5 text-[#FF5533]" />
                  Cryptographic Permit Inspector
                </h3>
                <span className="text-xs font-mono text-neutral-500">ID: {selectedTx.id}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="text-neutral-400 hover:text-white text-lg font-mono"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 font-mono text-xs">
              {/* Summary Status Box */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  selectedTx.executionStatus === "EXECUTED"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-[#14F195]"
                    : selectedTx.executionStatus === "PENDING"
                      ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                      : selectedTx.executionStatus === "REJECTED_ON_CHAIN"
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                        : "bg-red-500/10 border-red-500/30 text-red-400"
                }`}
              >
                <div>
                  <div className="font-bold text-sm">
                    {selectedTx.executionStatus === "EXECUTED"
                      ? "Token-2022 Transfer Confirmed on Devnet"
                      : selectedTx.executionStatus === "PENDING"
                        ? "Prepared / submitted, awaiting confirmation"
                        : selectedTx.executionStatus === "REJECTED_ON_CHAIN"
                          ? "On-Chain Transfer Hook Reverted Transaction"
                          : "Sentinel Pre-emptively Blocked Transfer"}
                  </div>
                  <div className="text-[11px] opacity-90 mt-0.5">
                    {selectedTx.riskReason || "Verified against active owner policy."}
                  </div>
                </div>
              </div>

              {/* JSON Payload Inspection */}
              <div>
                <div className="flex items-center justify-between text-neutral-400 mb-1">
                  <span>Transaction record (backend):</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        JSON.stringify(
                          {
                            id: selectedTx.id,
                            status: selectedTx.backendStatus,
                            flowVersion: selectedTx.flowVersion,
                            agentId: selectedTx.agentId,
                            permitId: selectedTx.permitId,
                            amount: String(selectedTx.amount),
                            mint: selectedTx.mint,
                            recipient: selectedTx.recipient,
                            slot: selectedTx.slot,
                            blockhash: selectedTx.blockhash,
                            signature: selectedTx.txSignature ?? null,
                          },
                          null,
                          2,
                        ),
                      )
                    }
                    className="flex items-center gap-1 hover:text-white text-[11px]"
                  >
                    {copied ? (
                      <Check className="w-3 h-3 text-[#14F195]" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{copied ? "Copied" : "Copy Payload"}</span>
                  </button>
                </div>

                <pre className="p-3.5 rounded-xl bg-black/60 border border-white/[0.08] text-[#14F195] overflow-x-auto text-[11px] leading-relaxed">
                  {JSON.stringify(
                    {
                      id: selectedTx.id,
                      status: selectedTx.backendStatus,
                      flowVersion: selectedTx.flowVersion,
                      agentId: selectedTx.agentId,
                      permitId: selectedTx.permitId,
                      amount: String(selectedTx.amount),
                      mint: selectedTx.mint,
                      recipient: selectedTx.recipient,
                      slot: selectedTx.slot,
                      blockhash: selectedTx.blockhash,
                      signature: selectedTx.txSignature ?? null,
                    },
                    null,
                    2,
                  )}
                </pre>
              </div>

              {/* Details List */}
              <div className="space-y-2 bg-black/40 p-3 rounded-xl border border-white/[0.05]">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Transaction Purpose:</span>
                  <span className="text-white text-right max-w-xs">{selectedTx.purpose}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Sender Token Account:</span>
                  <span className="text-neutral-300">{selectedTx.sender}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Recipient Target:</span>
                  <span className="text-neutral-300">{selectedTx.recipient}</span>
                </div>
                {selectedTx.txSignature && (
                  <div className="pt-2 border-t border-white/[0.05]">
                    <div className="text-neutral-500 mb-1">Solana Devnet Signature:</div>
                    <a
                      href={`https://explorer.solana.com/tx/${selectedTx.txSignature}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#FF5533] hover:underline flex items-center gap-1 text-[11px] break-all"
                    >
                      <span>{selectedTx.txSignature}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedTx(null)}
                  className="px-5 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200"
                >
                  Close Inspector
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
