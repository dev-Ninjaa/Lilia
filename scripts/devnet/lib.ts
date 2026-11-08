import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import {
  createLiliaProgram,
  deriveTokenAccount,
  findExtraAccountMetas,
} from "@lilia/solana/index.ts";
import {
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createInitializeMintInstruction,
  createInitializeTransferHookInstruction,
  createMintToInstruction,
  getMintLen,
} from "@solana/spl-token";
import {
  type Commitment,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

export const ROOT = resolve(import.meta.dir, "../..");
export const DEVNET_DIR = resolve(ROOT, ".devnet");
export const STATE_PATH = resolve(DEVNET_DIR, "state.json");
export const RPC_URL = process.env.SOLANA_RPC_URL?.trim() || "http://127.0.0.1:8899";
export const API_URL =
  process.env.DEVNET_API_URL?.trim() || `http://127.0.0.1:${process.env.PORT ?? 4000}`;
export const COMMITMENT = (process.env.SOLANA_RPC_COMMITMENT ?? "confirmed") as Commitment;
export const PROGRAM_ID = new PublicKey(
  process.env.LILIA_PROGRAM_ID ?? "51yqX5byrtqTYt1MS2cfo98UqPskzmbdW8SEBvj3FTbz",
);
export const MINT_DECIMALS = 6;
export const MINT_SUPPLY = "1000000";
export const TRANSFER_AMOUNT = "100";

export type DevnetState = {
  cluster: string;
  programId: string;
  mint: string;
  mintDecimals: number;
  transferAuthority: string;
  agentIdentityKey: string;
  recipient: string;
  agentId?: string;
  policyId?: string;
  sentinelAuthority?: string;
  extraMetas?: string;
};

export type PermitResponse = {
  id: string;
  transactionId: string;
  sequence: string;
  nonce: string;
  canonicalMessage: string;
  signature: string;
  expiresAtSlot: string;
  amount: string;
  mintDecimals: number;
  transferAuthority: string;
  sourceTokenAccount: string;
  destinationTokenAccount: string;
  mint: string;
  agentRegistryPda: string;
  policyPda: string;
  agentPublicKey: string;
  policyVersion: number;
};

export function connection(): Connection {
  return new Connection(RPC_URL, COMMITMENT);
}

export function loadState(): DevnetState {
  if (!existsSync(STATE_PATH)) {
    throw new Error(`Missing ${STATE_PATH}. Run: bun scripts/devnet/setup.ts`);
  }
  return JSON.parse(readFileSync(STATE_PATH, "utf8")) as DevnetState;
}

export function saveState(state: DevnetState): void {
  mkdirSync(DEVNET_DIR, { recursive: true });
  writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`);
}

export function keypairPath(name: string): string {
  return resolve(DEVNET_DIR, `${name}.json`);
}

export function adminKeypairPath(): string {
  const fromEnv = process.env.LILIA_ADMIN_KEYPAIR_PATH?.trim();
  return fromEnv ? resolve(ROOT, fromEnv) : resolve(homedir(), ".config/solana/id.json");
}

export function loadKeypair(path: string): Keypair {
  const secret = JSON.parse(readFileSync(path, "utf8")) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

/** Load a keypair from .devnet/, creating and persisting it on first use. */
export function ensureKeypair(name: string): Keypair {
  const path = keypairPath(name);
  if (existsSync(path)) return loadKeypair(path);
  mkdirSync(DEVNET_DIR, { recursive: true });
  const keypair = Keypair.generate();
  writeFileSync(path, JSON.stringify(Array.from(keypair.secretKey)), { mode: 0o600 });
  return keypair;
}

export function adminKeypair(): Keypair {
  const path = adminKeypairPath();
  if (!existsSync(path)) {
    throw new Error(`Admin keypair not found at ${path}. Set LILIA_ADMIN_KEYPAIR_PATH.`);
  }
  return loadKeypair(path);
}

export async function ensureFunded(keypair: Keypair, minSol = 2): Promise<number> {
  const conn = connection();
  const balance = await conn.getBalance(keypair.publicKey);
  if (balance >= minSol * LAMPORTS_PER_SOL) return balance;
  const missing = minSol * LAMPORTS_PER_SOL - balance;
  try {
    const signature = await conn.requestAirdrop(keypair.publicKey, missing);
    const latest = await conn.getLatestBlockhash(COMMITMENT);
    await conn.confirmTransaction({ signature, ...latest }, COMMITMENT);
  } catch {
    // Faucet closed (Devnet): top up from the admin wallet instead.
    const admin = loadKeypair(adminKeypairPath());
    if (admin.publicKey.equals(keypair.publicKey)) throw new Error("Admin wallet needs funding.");
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: admin.publicKey,
        toPubkey: keypair.publicKey,
        lamports: missing,
      }),
    );
    await sendAndConfirmTransaction(conn, tx, [admin], { commitment: COMMITMENT });
  }
  return conn.getBalance(keypair.publicKey);
}

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: { code?: string; message?: string; details?: unknown };
};

export async function api<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const key = process.env.LILIA_API_KEY?.trim();
  if (!key) throw new Error("LILIA_API_KEY is not set. Run from the repo root with .env present.");
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || payload.success === false) {
    const detail = payload.error
      ? `${payload.error.code ?? "ERROR"}: ${payload.error.message ?? ""}`
      : JSON.stringify(payload);
    throw new Error(`${method} ${path} -> ${response.status} ${detail}`);
  }
  return payload.data as T;
}

export async function requireApi(): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/api/health`);
    if (!response.ok) throw new Error(`health returned ${response.status}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Backend is not reachable at ${API_URL} (${message}). Start it with: bun run dev`,
    );
  }
}

/** Create a Token-2022 mint with the Lilia transfer hook extension. */
export async function createHookMint(input: {
  payer: Keypair;
  mintAuthority: PublicKey;
  decimals?: number;
}): Promise<PublicKey> {
  const conn = connection();
  const mintKeypair = Keypair.generate();
  const decimals = input.decimals ?? MINT_DECIMALS;
  const space = getMintLen([ExtensionType.TransferHook]);
  const lamports = await conn.getMinimumBalanceForRentExemption(space);
  const transaction = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: input.payer.publicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space,
      lamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    createInitializeTransferHookInstruction(
      mintKeypair.publicKey,
      input.mintAuthority,
      PROGRAM_ID,
      TOKEN_2022_PROGRAM_ID,
    ),
    createInitializeMintInstruction(
      mintKeypair.publicKey,
      decimals,
      input.mintAuthority,
      null,
      TOKEN_2022_PROGRAM_ID,
    ),
  );
  await sendAndConfirmTransaction(conn, transaction, [input.payer, mintKeypair], {
    commitment: COMMITMENT,
  });
  return mintKeypair.publicKey;
}

export async function ensureAta(input: {
  payer: Keypair;
  mint: PublicKey;
  owner: PublicKey;
  mintAuthority: Keypair;
  supply?: string;
}): Promise<PublicKey> {
  const conn = connection();
  const ata = deriveTokenAccount(input.mint, input.owner);
  const info = await conn.getAccountInfo(ata);
  const transaction = new Transaction();
  if (!info) {
    transaction.add(
      createAssociatedTokenAccountIdempotentInstruction(
        input.payer.publicKey,
        ata,
        input.owner,
        input.mint,
        TOKEN_2022_PROGRAM_ID,
      ),
    );
  }
  if (input.supply) {
    transaction.add(
      createMintToInstruction(
        input.mint,
        ata,
        input.mintAuthority.publicKey,
        BigInt(input.supply) * 10n ** BigInt(MINT_DECIMALS),
        [],
        TOKEN_2022_PROGRAM_ID,
      ),
    );
  }
  if (transaction.instructions.length > 0) {
    await sendAndConfirmTransaction(conn, transaction, [input.payer, input.mintAuthority], {
      commitment: COMMITMENT,
    });
  }
  return ata;
}

export async function initializeExtraMetas(input: {
  payer: Keypair;
  mint: PublicKey;
}): Promise<PublicKey> {
  const conn = connection();
  const pda = findExtraAccountMetas(input.mint, PROGRAM_ID);
  const info = await conn.getAccountInfo(pda);
  if (info) return pda;
  const program = createLiliaProgram(conn, input.payer, COMMITMENT);
  await program.methods
    .initializeExtraAccountMetaList([])
    .accounts({
      extraMetasAccount: pda,
      mint: input.mint,
      mintAuthority: input.payer.publicKey,
      systemProgram: SystemProgram.programId,
      payer: input.payer.publicKey,
    })
    .rpc({ commitment: COMMITMENT });
  return pda;
}

export function solscanUrl(signature: string): string {
  return `https://solscan.io/tx/${signature}?cluster=devnet`;
}

export function clusterLabel(): string {
  return RPC_URL.includes("devnet") ? "devnet" : RPC_URL;
}
