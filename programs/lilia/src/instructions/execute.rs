use anchor_lang::prelude::*;
use anchor_spl::{
    token_2022::{
        spl_token_2022::{
            extension::{
                transfer_hook::TransferHookAccount, BaseStateWithExtensions, StateWithExtensions,
            },
            state::Account as Token2022Account,
        },
        ID as TOKEN_2022_PROGRAM_ID,
    },
    token_interface::{Mint, TokenAccount},
};
use solana_instructions_sysvar::get_instruction_relative;
use spl_tlv_account_resolution::state::ExtraAccountMetaList;
use spl_transfer_hook_interface::instruction::{ExecuteInstruction, TransferHookInstruction};

use crate::errors::LiliaError;
use crate::state::{AgentRegistry, Policy, SentinelAuthority};
use crate::utils::ed25519::verify_instruction;
use crate::utils::pda::{AGENT_SEED, EXTRA_ACCOUNT_METAS_SEED, POLICY_SEED, SENTINEL_SEED};
use crate::utils::permit::PermitDataV2;

#[derive(Accounts)]
pub struct Execute<'info> {
    #[account(
        token::mint = mint,
        token::token_program = TOKEN_2022_PROGRAM_ID,
    )]
    pub source_account: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(mint::token_program = TOKEN_2022_PROGRAM_ID)]
    pub mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        token::mint = mint,
        token::token_program = TOKEN_2022_PROGRAM_ID,
    )]
    pub destination_account: Box<InterfaceAccount<'info, TokenAccount>>,

    /// CHECK: Source owner/delegate. Token-2022 has already verified that this
    /// account authorized the transfer; the handler additionally binds it to
    /// the permit and to the source token account.
    pub owner_delegate: UncheckedAccount<'info>,

    /// CHECK: TLV buffer validated by `ExtraAccountMetaList::check_account_infos`.
    #[account(
        seeds = [EXTRA_ACCOUNT_METAS_SEED, mint.key().as_ref()],
        bump
    )]
    pub extra_metas_account: UncheckedAccount<'info>,

    #[account(
        seeds = [SENTINEL_SEED],
        bump = sentinel_authority.bump
    )]
    pub sentinel_authority: Account<'info, SentinelAuthority>,

    #[account(
        mut,
        seeds = [AGENT_SEED, owner_delegate.key().as_ref()],
        bump = agent_registry.bump
    )]
    pub agent_registry: Account<'info, AgentRegistry>,

    #[account(
        seeds = [POLICY_SEED, owner_delegate.key().as_ref()],
        bump = policy.bump
    )]
    pub policy: Account<'info, Policy>,

    /// CHECK: Instructions sysvar, used to inspect the preceding Ed25519
    /// precompile instruction.
    #[account(address = solana_sdk_ids::sysvar::instructions::ID)]
    pub instructions_sysvar: UncheckedAccount<'info>,
}

#[event]
pub struct TransferAuthorized {
    pub transfer_authority: Pubkey,
    pub mint: Pubkey,
    pub source: Pubkey,
    pub destination: Pubkey,
    pub amount: u64,
    pub sequence: u64,
    pub policy_version: u32,
}

fn check_token_account_is_transferring(account_data: &[u8]) -> Result<()> {
    let token_account = StateWithExtensions::<Token2022Account>::unpack(account_data)?;
    let extension = token_account.get_extension::<TransferHookAccount>()?;
    require!(
        bool::from(extension.transferring),
        LiliaError::NotTransferring
    );
    Ok(())
}

pub fn handler(ctx: Context<Execute>, amount: u64) -> Result<()> {
    // The hook must only run while Token-2022 is actually moving tokens.
    check_token_account_is_transferring(
        &ctx.accounts.source_account.to_account_info().try_borrow_data()?,
    )?;
    check_token_account_is_transferring(
        &ctx.accounts
            .destination_account
            .to_account_info()
            .try_borrow_data()?,
    )?;

    // Validate that the extra accounts were resolved exactly as configured.
    {
        let data = ctx.accounts.extra_metas_account.try_borrow_data()?;
        ExtraAccountMetaList::check_account_infos::<ExecuteInstruction>(
            &ctx.accounts.to_account_infos(),
            &TransferHookInstruction::Execute { amount }.pack(),
            &ctx.program_id,
            &data,
        )?;
    }

    // The Ed25519 precompile must be the instruction immediately before the
    // transfer. The precompile verifies the signature; we verify that its
    // message/public-key offsets are canonical and that the signer is the
    // configured Sentinel authority.
    let ed25519_instruction = get_instruction_relative(
        -1,
        &ctx.accounts.instructions_sysvar.to_account_info(),
    )
    .map_err(|_| error!(LiliaError::InvalidEd25519Position))?;
    let permit_bytes = verify_instruction(
        &ed25519_instruction,
        &ctx.accounts.sentinel_authority.public_key,
    )?;
    let permit = PermitDataV2::deserialize(&permit_bytes)?;

    let clock = Clock::get()?;
    require!(
        clock.slot <= permit.expires_at_slot,
        LiliaError::PermitExpired
    );

    let authority_key = ctx.accounts.owner_delegate.key();

    require_keys_eq!(
        permit.transfer_authority,
        authority_key,
        LiliaError::TransferAuthorityMismatch
    );
    require_keys_eq!(
        permit.source_token_account,
        ctx.accounts.source_account.key(),
        LiliaError::SourceMismatch
    );
    require_keys_eq!(
        permit.destination_token_account,
        ctx.accounts.destination_account.key(),
        LiliaError::DestinationMismatch
    );
    require_keys_eq!(
        permit.mint,
        ctx.accounts.mint.key(),
        LiliaError::MintMismatch
    );
    require_eq!(
        permit.mint_decimals,
        ctx.accounts.mint.decimals,
        LiliaError::InvalidMintDecimals
    );
    require_eq!(permit.amount, amount, LiliaError::AmountMismatch);

    // Defense in depth: Token-2022 already checked this, but the permit must
    // name an account that actually controls the source token account.
    {
        let source = &ctx.accounts.source_account;
        let delegate = anchor_lang::solana_program::program_option::COption::Some(authority_key);
        require!(
            source.owner == authority_key || source.delegate == delegate,
            LiliaError::TransferAuthorityMismatch
        );
    }

    // Agent state and replay protection.
    {
        let registry = &ctx.accounts.agent_registry;
        require_keys_eq!(
            registry.key(),
            permit.agent_registry_pda,
            LiliaError::AgentRegistryMismatch
        );
        require_keys_eq!(
            registry.agent_identity_key,
            permit.agent_identity_key,
            LiliaError::AgentIdentityMismatch
        );
        require_keys_eq!(
            registry.transfer_authority,
            permit.transfer_authority,
            LiliaError::TransferAuthorityMismatch
        );
        require!(registry.is_active, LiliaError::AgentDisabled);
        require_eq!(
            registry.next_authorization_sequence,
            permit.sequence(),
            LiliaError::InvalidSequence
        );
    }

    // Policy enforcement.
    {
        let policy = &ctx.accounts.policy;
        require_keys_eq!(
            policy.key(),
            permit.policy_pda,
            LiliaError::PolicyMismatch
        );
        require_keys_eq!(
            policy.agent_registry,
            ctx.accounts.agent_registry.key(),
            LiliaError::PolicyMismatch
        );
        require!(policy.is_active, LiliaError::PolicyInactive);
        require_eq!(
            policy.policy_version,
            permit.policy_version,
            LiliaError::PolicyVersionMismatch
        );
        require!(
            policy.expires_at_slot == 0 || clock.slot <= policy.expires_at_slot,
            LiliaError::PolicyInactive
        );
        require!(
            policy.allowed_mint == Pubkey::default() || policy.allowed_mint == permit.mint,
            LiliaError::MintNotAllowed
        );
        require!(
            permit.amount <= policy.max_transfer_amount,
            LiliaError::AmountExceedsPolicy
        );
    }

    // Consume the sequence. This is the replay guard: the same signed permit
    // can never satisfy the counter check twice.
    {
        let registry = &mut ctx.accounts.agent_registry;
        registry.next_authorization_sequence = registry
            .next_authorization_sequence
            .checked_add(1)
            .ok_or(LiliaError::SequenceOverflow)?;
    }

    emit!(TransferAuthorized {
        transfer_authority: authority_key,
        mint: permit.mint,
        source: permit.source_token_account,
        destination: permit.destination_token_account,
        amount,
        sequence: permit.sequence(),
        policy_version: permit.policy_version,
    });
    Ok(())
}
