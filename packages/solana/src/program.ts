import { AnchorProvider, type Idl, Program, Wallet } from "@anchor-lang/core";
import type { Commitment, Connection, Keypair } from "@solana/web3.js";
import idl from "./idl/lilia.json";

/**
 * Create an Anchor client for the Lilia program.
 *
 * `NodeWallet` implements the Anchor `Wallet` interface with generic
 * `signTransaction`/`signAllTransactions`, which keeps the client usable for
 * both legacy and versioned transactions.
 */
export function createLiliaProgram(
  connection: Connection,
  payer: Keypair,
  commitment: Commitment = "confirmed",
) {
  const provider = new AnchorProvider(connection, new Wallet(payer), { commitment });
  return new Program(idl as unknown as Idl, provider);
}
