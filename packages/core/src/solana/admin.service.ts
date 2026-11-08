import { env } from "@lilia/api/config/env.ts";
import { AppError } from "@lilia/api/middleware/error-handler.ts";
import type { LiliaDatabase } from "@lilia/api/plugins/database.ts";
import { AgentService } from "@lilia/core/agent/agent.service.ts";
import { eventRecord } from "@lilia/core/events/event.service.ts";
import { PolicyService } from "@lilia/core/policy/policy.service.ts";
import { now } from "@lilia/core/shared.ts";
import {
  currentSlot,
  initializeSentinelOnChain,
  publishPolicyOnChain,
  registerAgentOnChain,
  setAgentStatusOnChain,
  updateSentinelOnChain,
} from "@lilia/core/solana/onchain.service.ts";
import {
  adminConfigured,
  isSolanaConfigured,
  liliaProgramId,
  sentinelPublicKeyBase58,
  slotForTimestamp,
  toRawAmount,
} from "@lilia/core/solana/solana-client.ts";
import { agents, policies, securityEvents } from "@lilia/db/schema/index.ts";
import { PublicKey } from "@solana/web3.js";
import { eq } from "drizzle-orm";

export class SolanaAdminService {
  private readonly agents: AgentService;
  private readonly policies: PolicyService;
  constructor(private readonly db: LiliaDatabase) {
    this.agents = new AgentService(db);
    this.policies = new PolicyService(db);
  }

  async status() {
    const configured = isSolanaConfigured();
    return {
      configured,
      programId: liliaProgramId().toBase58(),
      rpcUrl: configured ? env.SOLANA_RPC_URL : null,
      commitment: env.SOLANA_RPC_COMMITMENT,
      sentinelPublicKey: configured ? safeSentinelKey() : null,
      adminConfigured: adminConfigured(),
      latestSlot: configured ? await currentSlot() : null,
    };
  }

  async registerAgent(
    ownerId: string,
    agentId: string,
    input: { transferAuthority: string; agentIdentityKey: string },
  ) {
    const agent = await this.agents.requireOwned(ownerId, agentId);
    if (agent.onChainRegistryPda) {
      throw new AppError(
        409,
        "AGENT_ALREADY_REGISTERED",
        "Agent already has an on-chain registry account",
      );
    }
    const transferAuthority = new PublicKey(input.transferAuthority);
    const agentIdentityKey = new PublicKey(input.agentIdentityKey);
    const result = await registerAgentOnChain({ transferAuthority, agentIdentityKey, agentId });
    const timestamp = now();
    await this.db.transaction(async (tx) => {
      await tx
        .update(agents)
        .set({
          transferAuthority: transferAuthority.toBase58(),
          agentIdentityKey: agentIdentityKey.toBase58(),
          onChainRegistryPda: result.agentRegistryPda,
          onChainRegisteredAt: timestamp,
          registrationTxSignature: result.signature,
          authorizationSequence: "0",
          updatedAt: timestamp,
        })
        .where(eq(agents.id, agent.id));
      await tx.insert(securityEvents).values(
        eventRecord({
          agentId: agent.id,
          eventType: "agent.registered.onchain",
          severity: "info",
          description: "AgentRegistry account created on Solana.",
          metadata: {
            agentRegistryPda: result.agentRegistryPda,
            transferAuthority: transferAuthority.toBase58(),
            signature: result.signature,
          },
          source: "blockchain",
        }),
      );
    });
    return this.agents.get(ownerId, agent.id);
  }

  async setAgentStatus(ownerId: string, agentId: string, isActive: boolean) {
    const agent = await this.agents.requireOwned(ownerId, agentId);
    if (!agent.transferAuthority) {
      throw new AppError(409, "AGENT_NOT_ON_CHAIN", "Agent is not registered on-chain");
    }
    const result = await setAgentStatusOnChain({
      transferAuthority: new PublicKey(agent.transferAuthority),
      isActive,
    });
    const timestamp = now();
    await this.db.transaction(async (tx) => {
      await tx
        .update(agents)
        .set({ status: isActive ? "active" : "disabled", updatedAt: timestamp })
        .where(eq(agents.id, agent.id));
      await tx.insert(securityEvents).values(
        eventRecord({
          agentId: agent.id,
          eventType: "agent.status.onchain",
          severity: isActive ? "info" : "high",
          description: isActive
            ? "Agent was re-enabled on Solana."
            : "Agent was disabled on Solana.",
          metadata: { isActive, signature: result.signature },
          source: "blockchain",
        }),
      );
    });
    return this.agents.get(ownerId, agent.id);
  }

  async publishPolicy(ownerId: string, policyId: string, mintDecimals: number) {
    const policy = await this.policies.requireOwned(ownerId, policyId);
    const agent = await this.agents.requireOwned(ownerId, policy.agentId);
    if (!agent.transferAuthority) {
      throw new AppError(
        409,
        "AGENT_NOT_ON_CHAIN",
        "Register the agent on-chain before publishing a policy",
      );
    }
    const existing = Boolean(policy.onChainPolicyPda);
    if (!existing && policy.policyVersion !== 1) {
      throw new AppError(
        409,
        "POLICY_VERSION_DRIFT",
        "A policy with backend version > 1 must be created before it can be published",
      );
    }
    if (existing && policy.onChainPolicyVersion !== policy.policyVersion - 1) {
      throw new AppError(
        409,
        "POLICY_VERSION_DRIFT",
        "On-chain policy version is out of sync; publish each backend revision in order",
      );
    }
    if (policy.expiresAt && Date.parse(policy.expiresAt) <= Date.now()) {
      throw new AppError(409, "POLICY_EXPIRED", "Expired policies cannot be published");
    }
    const slot = await currentSlot();
    const expiresAtSlot = policy.expiresAt ? slotForTimestamp(policy.expiresAt, slot) : 0n;
    const allowedMint = policy.allowedMint ? new PublicKey(policy.allowedMint) : PublicKey.default;
    const maxTransferAmount = toRawAmount(policy.maxTransferAmount, mintDecimals);

    const result = await publishPolicyOnChain({
      transferAuthority: new PublicKey(agent.transferAuthority),
      policyId: policy.id,
      maxTransferAmount,
      allowedMint,
      expiresAtSlot,
      isActive: policy.isActive,
      existing,
    });
    const timestamp = now();
    await this.db.transaction(async (tx) => {
      await tx
        .update(policies)
        .set({
          onChainPolicyPda: result.policyPda,
          onChainPolicyVersion: policy.policyVersion,
          publishTxSignature: result.signature,
          publishedAt: timestamp,
          updatedAt: timestamp,
        })
        .where(eq(policies.id, policy.id));
      await tx.insert(securityEvents).values(
        eventRecord({
          agentId: agent.id,
          eventType: existing ? "policy.updated.onchain" : "policy.created.onchain",
          severity: "info",
          description: existing ? "Policy was updated on Solana." : "Policy was created on Solana.",
          metadata: {
            policyId: policy.id,
            policyPda: result.policyPda,
            policyVersion: policy.policyVersion,
            signature: result.signature,
          },
          source: "blockchain",
        }),
      );
    });
    return this.policies.get(ownerId, policy.id);
  }

  async initializeSentinel(publicKey: string) {
    const result = await initializeSentinelOnChain(new PublicKey(publicKey));
    await this.db.insert(securityEvents).values(
      eventRecord({
        eventType: "sentinel.initialized.onchain",
        severity: "high",
        description: "SentinelAuthority account was initialized on Solana.",
        metadata: { ...result, publicKey },
        source: "blockchain",
      }),
    );
    return result;
  }

  async rotateSentinel(newPublicKey: string) {
    const result = await updateSentinelOnChain(new PublicKey(newPublicKey));
    await this.db.insert(securityEvents).values(
      eventRecord({
        eventType: "sentinel.rotated.onchain",
        severity: "critical",
        description: "SentinelAuthority public key was rotated on Solana.",
        metadata: { ...result, newPublicKey },
        source: "blockchain",
      }),
    );
    return result;
  }
}

function safeSentinelKey(): string | null {
  try {
    return sentinelPublicKeyBase58();
  } catch {
    return null;
  }
}
