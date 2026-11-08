"use client";

import React, { useMemo, useState } from "react";
import {
  ApiError,
  authorizeV2,
  evaluate,
  prepareV2,
  submitTransaction,
  type EvaluateResult,
  type PermitV2,
  type PrepareV2Result,
} from "../lib/api";
import type { Agent, Policy } from "../lib/types";
import { CheckCircle2, XCircle, ArrowRight, RefreshCw, Terminal } from "lucide-react";

interface TransferConsoleProps {
  agents: Agent[];
  policies: Policy[];
  onSubmitted?: () => void;
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return `${error.code}: ${error.message}`;
  return error instanceof Error ? error.message : "Unexpected error.";
}

export const TransferConsole: React.FC<TransferConsoleProps> = ({
  agents,
  policies,
  onSubmitted,
}) => {
  const [agentId, setAgentId] = useState("");
  const [policyId, setPolicyId] = useState("");
  const [recipient, setRecipient] = useState("");
  const [mint, setMint] = useState("");
  const [amount, setAmount] = useState("100");
  const [expiresInSlots, setExpiresInSlots] = useState("300");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluateResult | null>(null);
  const [permit, setPermit] = useState<PermitV2 | null>(null);
  const [prepared, setPrepared] = useState<PrepareV2Result | null>(null);
  const [signedTransaction, setSignedTransaction] = useState("");
  const [submittedSignature, setSubmittedSignature] = useState<string | null>(null);

  const activeAgents = useMemo(() => agents.filter((a) => a.status === "active"), [agents]);
  const agentPolicies = useMemo(
    () => policies.filter((p) => p.agentId === (agentId || activeAgents[0]?.id)),
    [agentId, activeAgents, policies],
  );
  const effectiveAgentId = agentId || activeAgents[0]?.id || "";
  const effectivePolicyId = policyId || agentPolicies[0]?.id || "";

  const reset = () => {
    setEvaluation(null);
    setPermit(null);
    setPrepared(null);
    setSubmittedSignature(null);
    setSignedTransaction("");
    setError(null);
  };

  const stepEvaluate = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await evaluate({
        agentId: effectiveAgentId,
        policyId: effectivePolicyId || undefined,
        recipient,
        mint,
        amount,
      });
      setEvaluation(result);
      setPermit(null);
      setPrepared(null);
      setSubmittedSignature(null);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const stepAuthorize = async () => {
    if (!evaluation) return;
    setBusy(true);
    setError(null);
    try {
      const result = await authorizeV2({
        assessmentId: evaluation.id,
        expiresInSlots: Number(expiresInSlots) || undefined,
      });
      setPermit(result);
      setPrepared(null);
      setSubmittedSignature(null);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const stepPrepare = async () => {
    if (!permit) return;
    setBusy(true);
    setError(null);
    try {
      const result = await prepareV2({
        permitId: permit.id,
        sender: permit.transferAuthority,
        recipient,
        mint,
        amount,
      });
      setPrepared(result);
      setSubmittedSignature(null);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const stepSubmit = async () => {
    if (!prepared) return;
    setBusy(true);
    setError(null);
    try {
      const result = await submitTransaction({
        transactionId: prepared.transactionId,
        signedTransaction: signedTransaction.trim(),
      });
      setSubmittedSignature(result.signature);
      onSubmitted?.();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="pb-6 border-b border-white/[0.08]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono font-semibold uppercase text-neutral-400">
            End-to-end flow
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
          <Terminal className="w-7 h-7 text-[#ff6b4a]" />
          Transfer Console
        </h2>
        <p className="text-xs text-neutral-400 mt-1">
          Evaluate → authorize (Permit v2) → prepare (Token-2022 transaction) → submit a signed wire transaction.
        </p>
      </div>

      {/* Inputs */}
      <div className="rounded-2xl bg-[#111317] border border-white/[0.08] p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <label className="space-y-1">
          <span className="text-xs font-mono text-neutral-400">Agent</span>
          <select
            value={effectiveAgentId}
            onChange={(e) => { setAgentId(e.target.value); setPolicyId(""); reset(); }}
            className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-white font-mono focus:outline-none focus:border-[#FF5533]"
          >
            {activeAgents.map((a) => (
              <option key={a.id} value={a.id} className="bg-[#111317]">{a.name}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-mono text-neutral-400">Policy</span>
          <select
            value={effectivePolicyId}
            onChange={(e) => { setPolicyId(e.target.value); reset(); }}
            className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-white font-mono focus:outline-none focus:border-[#FF5533]"
          >
            {agentPolicies.map((p) => (
              <option key={p.id} value={p.id} className="bg-[#111317]">
                {p.name} (max {p.maxTransferAmount})
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-mono text-neutral-400">Amount (decimal)</span>
          <input
            value={amount}
            onChange={(e) => { setAmount(e.target.value); reset(); }}
            className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-white font-mono focus:outline-none focus:border-[#FF5533]"
          />
        </label>
        <label className="space-y-1 md:col-span-2">
          <span className="text-xs font-mono text-neutral-400">Recipient</span>
          <input
            value={recipient}
            onChange={(e) => { setRecipient(e.target.value); reset(); }}
            placeholder="Recipient address"
            className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-white font-mono focus:outline-none focus:border-[#FF5533]"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-mono text-neutral-400">Mint</span>
          <input
            value={mint}
            onChange={(e) => { setMint(e.target.value); reset(); }}
            placeholder="Token-2022 mint"
            className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-white font-mono focus:outline-none focus:border-[#FF5533]"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-mono text-neutral-400">Permit TTL (slots)</span>
          <input
            value={expiresInSlots}
            onChange={(e) => setExpiresInSlots(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-white font-mono focus:outline-none focus:border-[#FF5533]"
          />
        </label>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs font-mono text-red-300">
          {error}
        </div>
      )}

      {/* Steps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-[#111317] border border-white/[0.08] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">1 · Evaluate</h3>
            <button
              onClick={() => void stepEvaluate()}
              disabled={busy || !effectiveAgentId || !recipient || !mint || !amount}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF5533] text-black font-bold text-xs disabled:opacity-40 hover:bg-[#ff856b]"
            >
              {busy && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              Run
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {evaluation && (
            <div className="font-mono text-xs space-y-1.5 text-neutral-300">
              <div className={evaluation.decision === "approved" ? "text-[#14F195] font-bold" : "text-red-400 font-bold"}>
                {evaluation.decision.toUpperCase()} · risk {evaluation.riskScore}/100 ({evaluation.riskLevel})
              </div>
              <div className="text-neutral-500">assessment {evaluation.id}</div>
              {evaluation.reasons.map((r) => (
                <div key={r.ruleId} className="text-neutral-400">
                  - [{r.severity}] {r.ruleId}: {r.message}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-[#111317] border border-white/[0.08] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">2 · Authorize (Permit v2)</h3>
            <button
              onClick={() => void stepAuthorize()}
              disabled={busy || !evaluation || evaluation.decision !== "approved"}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF5533] text-black font-bold text-xs disabled:opacity-40 hover:bg-[#ff856b]"
            >
              {busy && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              Sign
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {permit && (
            <div className="font-mono text-xs space-y-1.5 text-neutral-300 break-all">
              <div className="text-[#14F195] font-bold">Sequence {permit.sequence} · expires slot {permit.expiresAtSlot}</div>
              <div className="text-neutral-500">permit {permit.id}</div>
              <div className="text-neutral-500">signature {permit.signature.slice(0, 32)}…</div>
              <div className="text-neutral-500">registry {permit.agentRegistryPda.slice(0, 16)}… policy {permit.policyPda.slice(0, 16)}…</div>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-[#111317] border border-white/[0.08] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">3 · Prepare</h3>
            <button
              onClick={() => void stepPrepare()}
              disabled={busy || !permit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF5533] text-black font-bold text-xs disabled:opacity-40 hover:bg-[#ff856b]"
            >
              {busy && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              Build
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {prepared && (
            <div className="font-mono text-xs space-y-1.5 text-neutral-300">
              <div className="text-[#14F195] font-bold">Prepared · blockhash {prepared.blockhash.slice(0, 16)}…</div>
              <div className="text-neutral-500">transaction {prepared.transactionId}</div>
              <div className="text-neutral-500 break-all">wire (unsigned, base64) {prepared.transaction.slice(0, 48)}…</div>
              <div className="text-neutral-500">Sign it with the transfer-authority keypair, then submit below.</div>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-[#111317] border border-white/[0.08] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">4 · Submit signed wire</h3>
            <button
              onClick={() => void stepSubmit()}
              disabled={busy || !prepared || !signedTransaction.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF5533] text-black font-bold text-xs disabled:opacity-40 hover:bg-[#ff856b]"
            >
              {busy && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              Submit
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <textarea
            value={signedTransaction}
            onChange={(e) => setSignedTransaction(e.target.value)}
            rows={3}
            placeholder="Paste base64 signed transaction here"
            className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-[11px] text-white font-mono focus:outline-none focus:border-[#FF5533] break-all"
          />
          {submittedSignature && (
            <div className="flex items-center gap-2 font-mono text-xs text-[#14F195] break-all">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Confirmed: {submittedSignature}
            </div>
          )}
          {prepared && !submittedSignature && (
            <div className="flex items-center gap-2 font-mono text-xs text-neutral-500">
              <XCircle className="w-4 h-4" />
              Awaiting signed wire transaction.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
