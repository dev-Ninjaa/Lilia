import { BN } from "@anchor-lang/core";
import { env } from "@lilia/api/config/env.ts";
import { AppError } from "@lilia/api/middleware/error-handler.ts";
import {
  adminKeypair,
  getConnection,
  liliaProgramId,
  solanaCommitment,
  uuidToBytes16,
} from "@lilia/core/solana/solana-client.ts";
import {
  createLiliaProgram,
  findAgentRegistry,
  findPolicy,
  findSentinelAuthority,
} from "@lilia/solana/index.ts";
import { PublicKey, SystemProgram } from "@solana/web3.js";

type InstructionBuilder = {
  accounts(accounts: Record<string, PublicKey>): InstructionBuilder;
  rpc(options?: { commitment?: "processed" | "confirmed" | "finalized" }): Promise<string>;
};

type InstructionMethods = Record<string, (...args: unknown[]) => InstructionBuilder>;

function program() {
  const connection = getConnection();
  const payer = adminKeypair();
  return createLiliaProgram(connection, payer, solanaCommitment());
}

function methods(): InstructionMethods {
  return program().methods as unknown as InstructionMethods;
}

function rpcOptions() {
  return { commitment: solanaCommitment() };
}

export type RegisterAgentOnChainInput = {
  transferAuthority: PublicKey;
  agentIdentityKey: PublicKey;
  /** Backend agent UUID, converted to the program's 16-byte id. */
  agentId: string;
};

export async function registerAgentOnChain(input: RegisterAgentOnChainInput) {
  const admin = adminKeypair();
  const programId = liliaProgramId();
  const agentRegistry = findAgentRegistry(input.transferAuthority, programId);
  const signature = await methods()
    .registerAgent(uuidToBytes16(input.agentId), input.agentIdentityKey)
    .accounts({
      agentRegistry,
      transferAuthority: input.transferAuthority,
      sentinelAuthority: findSentinelAuthority(programId),
      upgradeAuthority: admin.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc(rpcOptions());
  return { signature, agentRegistryPda: agentRegistry.toBase58() };
}

export async function setAgentStatusOnChain(input: {
  transferAuthority: PublicKey;
  isActive: boolean;
}) {
  const admin = adminKeypair();
  const programId = liliaProgramId();
  const signature = await methods()
    .setAgentStatus(input.isActive)
    .accounts({
      agentRegistry: findAgentRegistry(input.transferAuthority, programId),
      transferAuthority: input.transferAuthority,
      sentinelAuthority: findSentinelAuthority(programId),
      upgradeAuthority: admin.publicKey,
    })
    .rpc(rpcOptions());
  return { signature };
}

export type PublishPolicyInput = {
  transferAuthority: PublicKey;
  policyId: string;
  maxTransferAmount: bigint;
  allowedMint: PublicKey;
  expiresAtSlot: bigint;
  isActive: boolean;
  /** True when the policy already exists on-chain and must be updated. */
  existing: boolean;
};

export async function publishPolicyOnChain(input: PublishPolicyInput) {
  const admin = adminKeypair();
  const programId = liliaProgramId();
  const policy = findPolicy(input.transferAuthority, programId);
  const accounts = {
    policy,
    agentRegistry: findAgentRegistry(input.transferAuthority, programId),
    transferAuthority: input.transferAuthority,
    sentinelAuthority: findSentinelAuthority(programId),
    upgradeAuthority: admin.publicKey,
  };
  const signature = input.existing
    ? await methods()
        .updatePolicy(
          new BN(input.maxTransferAmount.toString()),
          input.allowedMint,
          new BN(input.expiresAtSlot.toString()),
          input.isActive,
        )
        .accounts(accounts)
        .rpc(rpcOptions())
    : await methods()
        .createPolicy(
          uuidToBytes16(input.policyId),
          new BN(input.maxTransferAmount.toString()),
          input.allowedMint,
          new BN(input.expiresAtSlot.toString()),
        )
        .accounts({ ...accounts, systemProgram: SystemProgram.programId })
        .rpc(rpcOptions());
  return { signature, policyPda: policy.toBase58() };
}

export async function initializeSentinelOnChain(publicKey: PublicKey) {
  const admin = adminKeypair();
  const programId = liliaProgramId();
  const signature = await methods()
    .initializeSentinelAuthority(publicKey)
    .accounts({
      sentinelAuthority: findSentinelAuthority(programId),
      upgradeAuthority: admin.publicKey,
      payer: admin.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc(rpcOptions());
  return { signature, sentinelAuthorityPda: findSentinelAuthority(programId).toBase58() };
}

export async function updateSentinelOnChain(newPublicKey: PublicKey) {
  const admin = adminKeypair();
  const programId = liliaProgramId();
  const signature = await methods()
    .updateSentinelPublicKey(newPublicKey)
    .accounts({
      sentinelAuthority: findSentinelAuthority(programId),
      upgradeAuthority: admin.publicKey,
    })
    .rpc(rpcOptions());
  return { signature };
}

/** Read the current on-chain authorization sequence for an agent. */
export async function readAuthorizationSequence(transferAuthority: PublicKey): Promise<bigint> {
  const connection = getConnection();
  const programId = liliaProgramId();
  const registry = findAgentRegistry(transferAuthority, programId);
  const client = createLiliaProgram(connection, adminKeypair(), solanaCommitment());
  const accounts = client.account as unknown as Record<
    string,
    { fetch(address: PublicKey): Promise<Record<string, unknown>> }
  >;
  const account = accounts.agentRegistry;
  if (!account) {
    throw new AppError(500, "IDL_ERROR", "AgentRegistry account is missing from the IDL");
  }
  const data = await account.fetch(registry);
  const sequence = data.nextAuthorizationSequence;
  if (typeof sequence === "bigint") return sequence;
  if (typeof sequence === "number") return BigInt(sequence);
  if (typeof sequence === "string") return BigInt(sequence);
  if (sequence && typeof sequence === "object" && "toString" in sequence) {
    return BigInt(String(sequence));
  }
  throw new AppError(500, "ACCOUNT_DECODE_ERROR", "AgentRegistry sequence could not be decoded");
}

/** Return the current confirmed slot, or throw the standard 503 when unconfigured. */
export async function currentSlot(): Promise<number> {
  return getConnection().getSlot(solanaCommitment());
}

export function solanaProgramId(): PublicKey {
  return new PublicKey(env.LILIA_PROGRAM_ID);
}
