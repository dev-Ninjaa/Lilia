import {
  createPrivateKey,
  createPublicKey,
  sign as cryptoSign,
  timingSafeEqual,
} from "node:crypto";
import { env } from "../../../../apps/api/src/config/env.ts";
import { AppError } from "../../../../apps/api/src/middleware/error-handler.ts";

export function validateSigningConfiguration() {
  const privatePem = env.LILIA_SIGNING_PRIVATE_KEY;
  const publicPem = env.LILIA_SIGNING_PUBLIC_KEY;
  if (!privatePem && !publicPem) return;
  if (!privatePem || !publicPem) {
    throw new Error(
      "Configure both LILIA_SIGNING_PRIVATE_KEY and LILIA_SIGNING_PUBLIC_KEY, or neither",
    );
  }
  try {
    const privateKey = createPrivateKey(privatePem);
    const configuredPublic = createPublicKey(publicPem);
    if (
      privateKey.asymmetricKeyType !== "ed25519" ||
      configuredPublic.asymmetricKeyType !== "ed25519"
    ) {
      throw new Error("Both signing keys must be Ed25519 keys");
    }
    const derivedPublic = createPublicKey(privateKey).export({ type: "spki", format: "der" });
    const configuredDer = configuredPublic.export({ type: "spki", format: "der" });
    if (
      derivedPublic.length !== configuredDer.length ||
      !timingSafeEqual(derivedPublic, configuredDer)
    ) {
      throw new Error("Configured Ed25519 signing key pair does not match");
    }
  } catch (error) {
    throw new Error(
      `Invalid signing key configuration: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
}

export type PermitPayload = {
  domain: string;
  version: 1;
  agentId: string;
  agentPublicKey: string;
  policyId: string;
  policyVersion: number;
  sender: string;
  recipient: string;
  mint: string;
  amount: string;
  expiresAt: string;
  nonce: string;
};

export function canonicalPermit(payload: PermitPayload): string {
  return JSON.stringify({
    domain: payload.domain,
    version: payload.version,
    agentId: payload.agentId,
    agentPublicKey: payload.agentPublicKey,
    policyId: payload.policyId,
    policyVersion: payload.policyVersion,
    sender: payload.sender,
    recipient: payload.recipient,
    mint: payload.mint,
    amount: payload.amount,
    expiresAt: payload.expiresAt,
    nonce: payload.nonce,
  });
}

export class SigningService {
  sign(payload: string) {
    if (!env.LILIA_SIGNING_PRIVATE_KEY || !env.LILIA_SIGNING_PUBLIC_KEY) {
      throw new AppError(
        503,
        "SIGNING_NOT_CONFIGURED",
        "Authorization signing is unavailable until an Ed25519 key pair is configured",
      );
    }
    const signature = cryptoSign(
      null,
      Buffer.from(payload, "utf8"),
      createPrivateKey(env.LILIA_SIGNING_PRIVATE_KEY),
    );
    return { signature: signature.toString("base64url"), publicKey: env.LILIA_SIGNING_PUBLIC_KEY };
  }
}
