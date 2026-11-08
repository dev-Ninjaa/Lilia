//! Lilia Token-2022 transfer hook.
//!
//! The hook enforces that every transfer of a Lilia mint is accompanied by an
//! Ed25519-signed Permit v2 issued by the backend Sentinel authority. On-chain
//! state adds replay protection (a per-agent sequence), agent liveness, and
//! policy limits (amount, mint, version, expiry).

use anchor_lang::prelude::*;
use spl_discriminator::SplDiscriminate;
use spl_transfer_hook_interface::instruction::{
    ExecuteInstruction, InitializeExtraAccountMetaListInstruction,
};

pub mod errors;
pub mod instructions;
pub mod state;
pub mod utils;

use instructions::*;
use state::AnchorExtraAccountMeta;

declare_id!("51yqX5byrtqTYt1MS2cfo98UqPskzmbdW8SEBvj3FTbz");

#[program]
pub mod lilia {
    use super::*;

    pub fn initialize_sentinel_authority(
        ctx: Context<InitializeSentinelAuthority>,
        public_key: Pubkey,
    ) -> Result<()> {
        instructions::initialize_sentinel::handler(ctx, public_key)
    }

    pub fn update_sentinel_public_key(
        ctx: Context<UpdateSentinelPublicKey>,
        new_public_key: Pubkey,
    ) -> Result<()> {
        instructions::update_sentinel::handler(ctx, new_public_key)
    }

    pub fn register_agent(
        ctx: Context<RegisterAgent>,
        agent_id: [u8; 16],
        agent_identity_key: Pubkey,
    ) -> Result<()> {
        instructions::register_agent::handler(ctx, agent_id, agent_identity_key)
    }

    pub fn set_agent_status(ctx: Context<SetAgentStatus>, is_active: bool) -> Result<()> {
        instructions::set_agent_status::handler(ctx, is_active)
    }

    pub fn create_policy(
        ctx: Context<CreatePolicy>,
        policy_id: [u8; 16],
        max_transfer_amount: u64,
        allowed_mint: Pubkey,
        expires_at_slot: u64,
    ) -> Result<()> {
        instructions::create_policy::handler(
            ctx,
            policy_id,
            max_transfer_amount,
            allowed_mint,
            expires_at_slot,
        )
    }

    pub fn update_policy(
        ctx: Context<UpdatePolicy>,
        max_transfer_amount: u64,
        allowed_mint: Pubkey,
        expires_at_slot: u64,
        is_active: bool,
    ) -> Result<()> {
        instructions::update_policy::handler(
            ctx,
            max_transfer_amount,
            allowed_mint,
            expires_at_slot,
            is_active,
        )
    }

    #[instruction(discriminator = InitializeExtraAccountMetaListInstruction::SPL_DISCRIMINATOR_SLICE)]
    pub fn initialize_extra_account_meta_list(
        ctx: Context<InitializeExtraAccountMetaList>,
        metas: Vec<AnchorExtraAccountMeta>,
    ) -> Result<()> {
        instructions::initialize_extra_account_meta_list::handler(ctx, metas)
    }

    #[instruction(discriminator = ExecuteInstruction::SPL_DISCRIMINATOR_SLICE)]
    pub fn execute(ctx: Context<Execute>, amount: u64) -> Result<()> {
        instructions::execute::handler(ctx, amount)
    }
}
