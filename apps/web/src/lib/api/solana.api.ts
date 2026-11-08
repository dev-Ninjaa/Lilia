import { request } from "./client.api";
import type { IntegrationsStatus, SolanaStatus } from "./types.api";

export const solanaStatus = () => request<SolanaStatus>("GET", "/solana/status");

export const integrationsStatus = () =>
  request<IntegrationsStatus>("GET", "/integrations");

export const initializeSentinel = (publicKey: string) =>
  request<Record<string, unknown>>("POST", "/solana/sentinel/initialize", { publicKey });

export const rotateSentinel = (newPublicKey: string) =>
  request<Record<string, unknown>>("POST", "/solana/sentinel/rotate", { newPublicKey });
