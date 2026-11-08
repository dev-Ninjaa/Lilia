pub mod agent_registry;
pub mod policy;
pub mod sentinel_authority;

pub use agent_registry::*;
pub use policy::*;
pub use sentinel_authority::*;

use anchor_lang::prelude::*;
use spl_tlv_account_resolution::account::ExtraAccountMeta;

/// Anchor-friendly mirror of the SPL `ExtraAccountMeta` pod layout.
///
/// The SPL initialize instruction sends a length-prefixed list of these
/// structs. The program ignores the supplied list and installs its canonical
/// list, but the type is still required to deserialize the instruction.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct AnchorExtraAccountMeta {
    pub discriminator: u8,
    pub address_config: [u8; 32],
    pub is_signer: bool,
    pub is_writable: bool,
}

impl From<AnchorExtraAccountMeta> for ExtraAccountMeta {
    fn from(meta: AnchorExtraAccountMeta) -> Self {
        Self {
            discriminator: meta.discriminator,
            address_config: meta.address_config,
            is_signer: meta.is_signer.into(),
            is_writable: meta.is_writable.into(),
        }
    }
}
