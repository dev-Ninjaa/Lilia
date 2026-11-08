use anchor_lang::prelude::*;

use crate::errors::LiliaError;
use crate::state::{AgentRegistry, SentinelAuthority};
use crate::utils::pda::{AGENT_SEED, SENTINEL_SEED};

#[derive(Accounts)]
pub struct SetAgentStatus<'info> {
    #[account(
        mut,
        seeds = [AGENT_SEED, transfer_authority.key().as_ref()],
        bump = agent_registry.bump
    )]
    pub agent_registry: Account<'info, AgentRegistry>,

    /// CHECK: seed component; must match the registry.
    pub transfer_authority: UncheckedAccount<'info>,

    #[account(
        seeds = [SENTINEL_SEED],
        bump = sentinel_authority.bump,
        has_one = upgrade_authority
    )]
    pub sentinel_authority: Account<'info, SentinelAuthority>,

    pub upgrade_authority: Signer<'info>,
}

#[event]
pub struct AgentStatusChanged {
    pub transfer_authority: Pubkey,
    pub is_active: bool,
}

pub fn handler(ctx: Context<SetAgentStatus>, is_active: bool) -> Result<()> {
    require_keys_eq!(
        ctx.accounts.agent_registry.transfer_authority,
        ctx.accounts.transfer_authority.key(),
        LiliaError::TransferAuthorityMismatch
    );

    ctx.accounts.agent_registry.is_active = is_active;

    emit!(AgentStatusChanged {
        transfer_authority: ctx.accounts.transfer_authority.key(),
        is_active,
    });
    Ok(())
}
