use anchor_lang::prelude::*;

pub const SENTINEL_SEED: &[u8] = b"sentinel";
pub const AGENT_SEED: &[u8] = b"agent";
pub const POLICY_SEED: &[u8] = b"policy";
pub const EXTRA_ACCOUNT_METAS_SEED: &[u8] = b"extra-account-metas";

pub fn sentinel_address() -> Pubkey {
    Pubkey::find_program_address(&[SENTINEL_SEED], &crate::ID).0
}

pub fn agent_address(transfer_authority: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[AGENT_SEED, transfer_authority.as_ref()], &crate::ID).0
}

pub fn policy_address(transfer_authority: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[POLICY_SEED, transfer_authority.as_ref()], &crate::ID).0
}

pub fn extra_metas_address(mint: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[EXTRA_ACCOUNT_METAS_SEED, mint.as_ref()], &crate::ID).0
}
