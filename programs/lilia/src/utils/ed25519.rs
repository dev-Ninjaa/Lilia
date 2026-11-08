use anchor_lang::prelude::*;
use solana_instruction::Instruction;

use crate::errors::LiliaError;
use crate::utils::permit::PERMIT_LEN;

/// Canonical inline layout produced by `Ed25519Program.createInstructionWithPublicKey`:
/// 16-byte header, 32-byte public key, message, 64-byte signature.
const HEADER_LEN: usize = 16;
const PUBLIC_KEY_OFFSET: usize = HEADER_LEN;
const MESSAGE_OFFSET: usize = PUBLIC_KEY_OFFSET + 32;
const SIGNATURE_OFFSET: usize = MESSAGE_OFFSET + PERMIT_LEN;
const TOTAL_LEN: usize = SIGNATURE_OFFSET + 64;

/// Verify that the instruction is a canonical single-signature Ed25519
/// precompile instruction and return its message.
///
/// The precompile itself performs signature verification. This function binds
/// the message and public key to the canonical offsets so a caller cannot point
/// the precompile at unrelated bytes, and checks that the signer is the
/// configured Sentinel authority.
pub fn verify_instruction(instruction: &Instruction, sentinel_key: &Pubkey) -> Result<[u8; PERMIT_LEN]> {
    require_keys_eq!(
        instruction.program_id,
        solana_sdk_ids::ed25519_program::ID,
        LiliaError::InvalidEd25519Instruction
    );

    let data = &instruction.data;
    require!(data.len() == TOTAL_LEN, LiliaError::InvalidEd25519Instruction);

    let num_signatures = u16::from_le_bytes([data[0], data[1]]);
    require_eq!(num_signatures, 1, LiliaError::InvalidEd25519Instruction);

    let signature_offset = u16::from_le_bytes([data[4], data[5]]) as usize;
    let signature_instruction_index = u16::from_le_bytes([data[6], data[7]]);
    let public_key_offset = u16::from_le_bytes([data[8], data[9]]) as usize;
    let public_key_instruction_index = u16::from_le_bytes([data[10], data[11]]);
    let message_offset = u16::from_le_bytes([data[12], data[13]]) as usize;
    let message_size = u16::from_le_bytes([data[14], data[15]]) as usize;

    require_eq!(
        signature_instruction_index,
        u16::MAX,
        LiliaError::InvalidEd25519Instruction
    );
    require_eq!(
        public_key_instruction_index,
        u16::MAX,
        LiliaError::InvalidEd25519Instruction
    );
    require_eq!(
        public_key_offset,
        PUBLIC_KEY_OFFSET,
        LiliaError::InvalidEd25519Instruction
    );
    require_eq!(
        message_offset,
        MESSAGE_OFFSET,
        LiliaError::InvalidEd25519Instruction
    );
    require_eq!(
        message_size,
        PERMIT_LEN,
        LiliaError::InvalidEd25519Instruction
    );
    require_eq!(
        signature_offset,
        SIGNATURE_OFFSET,
        LiliaError::InvalidEd25519Instruction
    );

    let public_key: [u8; 32] = data[PUBLIC_KEY_OFFSET..PUBLIC_KEY_OFFSET + 32]
        .try_into()
        .unwrap();
    require!(
        public_key == sentinel_key.to_bytes(),
        LiliaError::UnauthorizedSigner
    );

    let message: [u8; PERMIT_LEN] = data[MESSAGE_OFFSET..MESSAGE_OFFSET + PERMIT_LEN]
        .try_into()
        .unwrap();
    Ok(message)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn canonical_instruction(sentinel: &Pubkey, message: [u8; PERMIT_LEN]) -> Instruction {
        let mut data = vec![0u8; TOTAL_LEN];
        data[0..2].copy_from_slice(&1u16.to_le_bytes());
        data[4..6].copy_from_slice(&(SIGNATURE_OFFSET as u16).to_le_bytes());
        data[6..8].copy_from_slice(&u16::MAX.to_le_bytes());
        data[8..10].copy_from_slice(&(PUBLIC_KEY_OFFSET as u16).to_le_bytes());
        data[10..12].copy_from_slice(&u16::MAX.to_le_bytes());
        data[12..14].copy_from_slice(&(MESSAGE_OFFSET as u16).to_le_bytes());
        data[14..16].copy_from_slice(&(PERMIT_LEN as u16).to_le_bytes());
        data[PUBLIC_KEY_OFFSET..PUBLIC_KEY_OFFSET + 32].copy_from_slice(&sentinel.to_bytes());
        data[MESSAGE_OFFSET..MESSAGE_OFFSET + PERMIT_LEN].copy_from_slice(&message);
        Instruction {
            program_id: solana_sdk_ids::ed25519_program::ID,
            accounts: vec![],
            data,
        }
    }

    #[test]
    fn accepts_canonical_instruction() {
        let sentinel = Pubkey::new_from_array([7u8; 32]);
        let message = [9u8; PERMIT_LEN];
        let ix = canonical_instruction(&sentinel, message);
        assert_eq!(verify_instruction(&ix, &sentinel).unwrap(), message);
    }

    #[test]
    fn rejects_wrong_signer() {
        let sentinel = Pubkey::new_from_array([7u8; 32]);
        let attacker = Pubkey::new_from_array([8u8; 32]);
        let ix = canonical_instruction(&attacker, [9u8; PERMIT_LEN]);
        assert!(verify_instruction(&ix, &sentinel).is_err());
    }

    #[test]
    fn rejects_non_canonical_offsets() {
        let sentinel = Pubkey::new_from_array([7u8; 32]);
        let mut ix = canonical_instruction(&sentinel, [9u8; PERMIT_LEN]);
        ix.data[12] = 49;
        assert!(verify_instruction(&ix, &sentinel).is_err());
    }

    #[test]
    fn rejects_wrong_program() {
        let sentinel = Pubkey::new_from_array([7u8; 32]);
        let mut ix = canonical_instruction(&sentinel, [9u8; PERMIT_LEN]);
        ix.program_id = Pubkey::new_from_array([1u8; 32]);
        assert!(verify_instruction(&ix, &sentinel).is_err());
    }
}
