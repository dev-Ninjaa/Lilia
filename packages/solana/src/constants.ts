import { PublicKey } from "@solana/web3.js";

/** Domain separator bound into every Permit v2 message. */
export const PERMIT_V2_DOMAIN = "lilia.authorization.v2";
/** Domain field is null-padded to 30 bytes. */
export const PERMIT_V2_DOMAIN_LENGTH = 30;
/** Exact canonical permit length. */
export const PERMIT_V2_LENGTH = 308;
/** Supported permit version. */
export const PERMIT_V2_VERSION = 2;
/** Token-2022 mint decimals are limited to 18. */
export const MAX_MINT_DECIMALS = 18;

/** Program ID generated for local development and Devnet deployment. */
export const LILIA_PROGRAM_ID = new PublicKey("51yqX5byrtqTYt1MS2cfo98UqPskzmbdW8SEBvj3FTbz");

export const SEEDS = {
  sentinel: Buffer.from("sentinel", "utf8"),
  agent: Buffer.from("agent", "utf8"),
  policy: Buffer.from("policy", "utf8"),
  extraAccountMetas: Buffer.from("extra-account-metas", "utf8"),
} as const;
