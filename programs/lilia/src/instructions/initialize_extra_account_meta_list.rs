use anchor_lang::prelude::*;
use anchor_spl::token_interface::Mint;
use spl_tlv_account_resolution::{
    account::ExtraAccountMeta, seeds::Seed, state::ExtraAccountMetaList,
};
use spl_transfer_hook_interface::instruction::ExecuteInstruction;

use crate::errors::LiliaError;
use crate::state::AnchorExtraAccountMeta;
use crate::utils::pda::{AGENT_SEED, EXTRA_ACCOUNT_METAS_SEED, POLICY_SEED, SENTINEL_SEED};

/// Number of extra accounts the hook always resolves.
pub const CANONICAL_EXTRA_META_COUNT: usize = 4;

#[derive(Accounts)]
pub struct InitializeExtraAccountMetaList<'info> {
    /// CHECK: TLV buffer owned by this program; created here.
    #[account(
        init,
        payer = payer,
        space = ExtraAccountMetaList::size_of(CANONICAL_EXTRA_META_COUNT).unwrap(),
        seeds = [EXTRA_ACCOUNT_METAS_SEED, mint.key().as_ref()],
        bump
    )]
    pub extra_metas_account: UncheckedAccount<'info>,

    #[account(mint::token_program = anchor_spl::token_2022::ID)]
    pub mint: Box<InterfaceAccount<'info, Mint>>,

    pub mint_authority: Signer<'info>,

    pub system_program: Program<'info, System>,

    #[account(mut)]
    pub payer: Signer<'info>,
}

#[event]
pub struct ExtraAccountMetaListInitialized {
    pub mint: Pubkey,
    pub count: u8,
}

/// Canonical extra accounts, in the exact order Token-2022 appends them to the
/// hook instruction:
///
/// 5. SentinelAuthority PDA (`["sentinel"]`)
/// 6. AgentRegistry PDA (`["agent", transfer_authority]`), writable
/// 7. Policy PDA (`["policy", transfer_authority]`)
/// 8. Instructions sysvar
///
/// Account index 3 in the hook instruction is the source owner/delegate, i.e.
/// the transfer authority, so both PDAs are derived from it.
pub fn canonical_extra_account_metas() -> Result<Vec<ExtraAccountMeta>> {
    Ok(vec![
        ExtraAccountMeta::new_with_seeds(
            &[Seed::Literal {
                bytes: SENTINEL_SEED.to_vec(),
            }],
            false,
            false,
        )?,
        ExtraAccountMeta::new_with_seeds(
            &[
                Seed::Literal {
                    bytes: AGENT_SEED.to_vec(),
                },
                Seed::AccountKey { index: 3 },
            ],
            false,
            true,
        )?,
        ExtraAccountMeta::new_with_seeds(
            &[
                Seed::Literal {
                    bytes: POLICY_SEED.to_vec(),
                },
                Seed::AccountKey { index: 3 },
            ],
            false,
            false,
        )?,
        ExtraAccountMeta::new_with_pubkey(
            &solana_sdk_ids::sysvar::instructions::ID,
            false,
            false,
        )?,
    ])
}

/// Installs the canonical extra account meta list.
///
/// The caller-supplied list is intentionally ignored: accepting arbitrary
/// metas would let the mint authority redirect the hook to attacker-controlled
/// accounts. Only the mint authority may initialize the list.
pub fn handler(
    ctx: Context<InitializeExtraAccountMetaList>,
    _metas: Vec<AnchorExtraAccountMeta>,
) -> Result<()> {
    let mint = &ctx.accounts.mint;
    let mint_authority = mint
        .mint_authority
        .ok_or(LiliaError::UnauthorizedSigner)?;
    require_keys_eq!(
        ctx.accounts.mint_authority.key(),
        mint_authority,
        LiliaError::UnauthorizedSigner
    );

    let metas = canonical_extra_account_metas()?;
    let mut data = ctx.accounts.extra_metas_account.try_borrow_mut_data()?;
    ExtraAccountMetaList::init::<ExecuteInstruction>(&mut data, &metas)?;

    emit!(ExtraAccountMetaListInitialized {
        mint: mint.key(),
        count: metas.len() as u8,
    });
    Ok(())
}
