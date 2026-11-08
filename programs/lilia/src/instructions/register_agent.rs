use anchor_lang::prelude::*;

use crate::errors::LiliaError;
use crate::state::{AgentRegistry, SentinelAuthority};
use crate::utils::pda::{AGENT_SEED, SENTINEL_SEED};

#[derive(Accounts)]
pub struct RegisterAgent<'info> {
    #[account(
        init,
        payer = upgrade_authority,
        space = AgentRegistry::LEN,
        seeds = [AGENT_SEED, transfer_authority.key().as_ref()],
        bump
    )]
    pub agent_registry: Account<'info, AgentRegistry>,

    /// Wallet that will sign transfers for this agent. Its key is the PDA seed.
    /// CHECK: address is used as a seed and stored in the registry.
    pub transfer_authority: UncheckedAccount<'info>,

    #[account(
        seeds = [SENTINEL_SEED],
        bump = sentinel_authority.bump,
        has_one = upgrade_authority
    )]
    pub sentinel_authority: Account<'info, SentinelAuthority>,

    #[account(mut)]
    pub upgrade_authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[event]
pub struct AgentRegistered {
    pub agent_id: [u8; 16],
    pub agent_identity_key: Pubkey,
    pub transfer_authority: Pubkey,
    pub slot: u64,
}

pub fn handler(
    ctx: Context<RegisterAgent>,
    agent_id: [u8; 16],
    agent_identity_key: Pubkey,
) -> Result<()> {
    let registry = &mut ctx.accounts.agent_registry;
    let clock = Clock::get()?;

    require_keys_neq!(
        ctx.accounts.transfer_authority.key(),
        Pubkey::default(),
        LiliaError::UnauthorizedSigner
    );

    registry.agent_id = agent_id;
    registry.agent_identity_key = agent_identity_key;
    registry.transfer_authority = ctx.accounts.transfer_authority.key();
    registry.owner = ctx.accounts.upgrade_authority.key();
    registry.is_active = true;
    registry.next_authorization_sequence = 0;
    registry.registered_slot = clock.slot;
    registry.bump = ctx.bumps.agent_registry;

    emit!(AgentRegistered {
        agent_id,
        agent_identity_key,
        transfer_authority: registry.transfer_authority,
        slot: clock.slot,
    });
    Ok(())
}
