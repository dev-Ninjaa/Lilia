import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { LILIA_PROGRAM_ID, SEEDS } from "./constants.ts";

export function findSentinelAuthority(programId: PublicKey = LILIA_PROGRAM_ID): PublicKey {
  return PublicKey.findProgramAddressSync([SEEDS.sentinel], programId)[0];
}

export function findAgentRegistry(
  transferAuthority: PublicKey | string,
  programId: PublicKey = LILIA_PROGRAM_ID,
): PublicKey {
  const authority =
    transferAuthority instanceof PublicKey ? transferAuthority : new PublicKey(transferAuthority);
  return PublicKey.findProgramAddressSync([SEEDS.agent, authority.toBuffer()], programId)[0];
}

export function findPolicy(
  transferAuthority: PublicKey | string,
  programId: PublicKey = LILIA_PROGRAM_ID,
): PublicKey {
  const authority =
    transferAuthority instanceof PublicKey ? transferAuthority : new PublicKey(transferAuthority);
  return PublicKey.findProgramAddressSync([SEEDS.policy, authority.toBuffer()], programId)[0];
}

export function findExtraAccountMetas(
  mint: PublicKey | string,
  programId: PublicKey = LILIA_PROGRAM_ID,
): PublicKey {
  const mintKey = mint instanceof PublicKey ? mint : new PublicKey(mint);
  return PublicKey.findProgramAddressSync(
    [SEEDS.extraAccountMetas, mintKey.toBuffer()],
    programId,
  )[0];
}

/** Derive the Token-2022 associated token account for `owner` and `mint`. */
export function deriveTokenAccount(
  mint: PublicKey | string,
  owner: PublicKey | string,
  tokenProgramId: PublicKey = TOKEN_2022_PROGRAM_ID,
): PublicKey {
  const mintKey = mint instanceof PublicKey ? mint : new PublicKey(mint);
  const ownerKey = owner instanceof PublicKey ? owner : new PublicKey(owner);
  return getAssociatedTokenAddressSync(
    mintKey,
    ownerKey,
    false,
    tokenProgramId,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
}
