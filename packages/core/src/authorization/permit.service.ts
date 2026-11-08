import { createHash } from "node:crypto";
import { DEFAULT_PERMIT_TTL_SECONDS, PROTOCOL_DOMAIN } from "@lilia/api/config/constants.ts";
import { AppError } from "@lilia/api/middleware/error-handler.ts";
import type { LiliaDatabase } from "@lilia/api/plugins/database.ts";
import {
  type PermitPayload,
  SigningService,
  canonicalPermit,
} from "@lilia/core/authorization/signing.service.ts";
import { eventRecord } from "@lilia/core/events/event.service.ts";
import { now } from "@lilia/core/shared.ts";
import { permits, securityEvents, transactions } from "@lilia/db/schema/index.ts";

export class PermitService {
  private readonly signer = new SigningService();
  constructor(private readonly db: LiliaDatabase) {}
  async issue(input: {
    agentId: string;
    agentPublicKey: string;
    policyId: string;
    policyVersion: number;
    details: Record<string, unknown>;
    assessmentId: string;
  }) {
    const expiresAt = new Date(Date.now() + DEFAULT_PERMIT_TTL_SECONDS * 1000).toISOString();
    const payload: PermitPayload = {
      domain: PROTOCOL_DOMAIN,
      version: 1,
      agentId: input.agentId,
      agentPublicKey: input.agentPublicKey,
      policyId: input.policyId,
      policyVersion: input.policyVersion,
      sender: String(input.details.sender),
      recipient: String(input.details.recipient),
      mint: String(input.details.mint),
      amount: String(input.details.amount),
      expiresAt,
      nonce: crypto.randomUUID(),
    };
    const signedPayload = canonicalPermit(payload);
    const { signature, publicKey } = this.signer.sign(signedPayload);
    const permitHash = createHash("sha256").update(signedPayload, "utf8").digest("hex");
    const id = crypto.randomUUID();
    const transactionId = crypto.randomUUID();
    const createdAt = now();
    await this.db.transaction(async (tx) => {
      await tx.insert(permits).values({
        id,
        agentId: input.agentId,
        policyId: input.policyId,
        assessmentId: input.assessmentId,
        permitHash,
        signedPayload,
        signature,
        signerPublicKey: publicKey,
        expiresAt,
        status: "issued",
        createdAt,
      });
      await tx.insert(transactions).values({
        id: transactionId,
        agentId: input.agentId,
        policyId: input.policyId,
        permitId: id,
        sender: payload.sender,
        recipient: payload.recipient,
        mint: payload.mint,
        amount: payload.amount,
        status: "authorized",
        transactionSignature: null,
        failureReason: null,
        createdAt,
        updatedAt: createdAt,
      });
      await tx.insert(securityEvents).values(
        eventRecord({
          agentId: input.agentId,
          eventType: "authorization.issued",
          severity: "info",
          description:
            "A backend-signed authorization permit was issued; it is not on-chain enforced.",
          transactionId,
          metadata: { permitId: id, assessmentId: input.assessmentId, expiresAt },
        }),
      );
    });
    return {
      id,
      ...payload,
      signedPayload,
      signature,
      signerPublicKey: publicKey,
      permitHash,
      status: "issued",
    };
  }
}
