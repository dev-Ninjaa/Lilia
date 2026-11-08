import { request } from "./client.api";
import type { BackendTransaction, EvaluateResult, PermitV2, PrepareV2Result, SubmitResult } from "./types.api";

export const listTransactions = (limit = 100) =>
  request<BackendTransaction[]>("GET", `/transactions?limit=${limit}`);

export const evaluate = (input: {
  agentId: string;
  policyId?: string;
  recipient: string;
  mint: string;
  amount: string;
}) => request<EvaluateResult>("POST", "/sentinel/evaluate", input);

export const authorizeV2 = (input: { assessmentId: string; expiresInSlots?: number }) =>
  request<PermitV2>("POST", "/v2/sentinel/authorize", input);

export const prepareV2 = (input: {
  permitId: string;
  sender: string;
  recipient: string;
  mint: string;
  amount: string;
}) => request<PrepareV2Result>("POST", "/transactions/prepare-v2", input);

export const submitTransaction = (input: {
  transactionId: string;
  signedTransaction: string;
}) => request<SubmitResult>("POST", "/transactions/submit", input);

export const recordSubmission = (input: {
  permitId: string;
  transactionSignature: string;
}) => request<SubmitResult>("POST", "/v2/transactions/record-submission", input);
