#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, 
    Address, Bytes, BytesN, Env, Symbol, symbol_short
};

// ---- Storage Keys ----
const CLAIMS_KEY: Symbol = symbol_short!("CLAIMS");
const TOTAL_KEY: Symbol = symbol_short!("TOTAL");

// ---- Data Structures ----
#[contracttype]
#[derive(Clone)]
pub struct ReadinessClaim {
    pub borrower: Address,
    pub stats_hash: Bytes,      // SHA256 of (avg_balance + dti + window_days)
    pub timestamp: u64,
    pub dti_pass: bool,
    pub balance_pass: bool,
    pub history_pass: bool,
    pub zk_verified: bool,      // NEW
    pub proof_hash: Option<BytesN<32>>, // NEW
    pub score_minted: bool,     // NEW (Level 4)
    pub score_expiry: u64,      // NEW (Level 4) — 0 if never minted
}

// ---- Error Codes ----
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ContractError {
    AlreadyRegistered = 1,      // Claim exists within 30-day cooldown
    ThresholdNotMet = 2,        // Stats don't pass minimum thresholds
    Unauthorized = 3,           // Caller is not the borrower
    NotZkVerified = 4,          // Claim exists but is not yet ZK-verified
}

// ---- Contract ----
#[contract]
pub struct CredCloakRegistry;

#[contractimpl]
impl CredCloakRegistry {

    /// Register a loan readiness claim on-chain.
    /// Called when user's financial stats pass minimum thresholds.
    pub fn register_claim(
        env: Env,
        borrower: Address,
        stats_hash: Bytes,
        dti_pass: bool,
        balance_pass: bool,
        history_pass: bool,
    ) -> Result<u64, ContractError> {

        // 1. Require borrower authorization
        borrower.require_auth();

        // 2. Check thresholds — reject if any core metric fails
        if !dti_pass || !balance_pass {
            return Err(ContractError::ThresholdNotMet);
        }

        // 3. Check cooldown — one claim per 30 days
        let claim_key = (CLAIMS_KEY, borrower.clone());
        if let Some(existing) = env.storage().persistent()
            .get::<_, ReadinessClaim>(&claim_key) {
            let cooldown: u64 = 30 * 24 * 60 * 60; // 30 days in seconds
            if env.ledger().timestamp() - existing.timestamp < cooldown {
                return Err(ContractError::AlreadyRegistered);
            }
        }

        // 4. Build and store the claim
        let timestamp = env.ledger().timestamp();
        let claim = ReadinessClaim {
            borrower: borrower.clone(),
            stats_hash,
            timestamp,
            dti_pass,
            balance_pass,
            history_pass,
            zk_verified: false,
            proof_hash: None,
            score_minted: false,
            score_expiry: 0,
        };
        env.storage().persistent().set(&claim_key, &claim);

        // 5. Increment total claims counter
        let total: u64 = env.storage().instance()
            .get(&TOTAL_KEY).unwrap_or(0);
        env.storage().instance().set(&TOTAL_KEY, &(total + 1));

        // 6. Emit event — frontend listens to this
        env.events().publish(
            (symbol_short!("claim"), Symbol::new(&env, "registered")),
            (borrower.clone(), timestamp, dti_pass, balance_pass)
        );

        Ok(timestamp)
    }

    /// Upgrade a plain claim to ZK-verified status.
    /// Called after a borrower successfully registers a proof with the LoanPool.
    pub fn upgrade_to_zk_verified(
        env: Env,
        borrower: Address,
        proof_hash: BytesN<32>,
    ) -> Result<(), ContractError> {
        borrower.require_auth();
        let claim_key = (CLAIMS_KEY, borrower.clone());
        let mut claim = env.storage().persistent()
            .get::<_, ReadinessClaim>(&claim_key)
            .ok_or(ContractError::Unauthorized)?;

        claim.zk_verified = true;
        claim.proof_hash = Some(proof_hash);
        env.storage().persistent().set(&claim_key, &claim);

        env.events().publish(
            (symbol_short!("claim"), Symbol::new(&env, "zk_verified")),
            (borrower.clone(), env.ledger().timestamp())
        );

        Ok(())
    }

    /// Get the latest claim for a borrower.
    pub fn get_claim(
        env: Env,
        borrower: Address,
    ) -> Option<ReadinessClaim> {
        let claim_key = (CLAIMS_KEY, borrower);
        env.storage().persistent().get(&claim_key)
    }

    /// Get total number of claims ever registered.
    pub fn get_total_claims(env: Env) -> u64 {
        env.storage().instance().get(&TOTAL_KEY).unwrap_or(0)
    }

    /// Check if a borrower has an active (non-expired) claim.
    pub fn has_active_claim(env: Env, borrower: Address) -> bool {
        let claim_key = (CLAIMS_KEY, borrower);
        if let Some(claim) = env.storage().persistent()
            .get::<_, ReadinessClaim>(&claim_key) {
            let cooldown: u64 = 30 * 24 * 60 * 60;
            return env.ledger().timestamp() - claim.timestamp < cooldown;
        }
        false
    }

    /// Alias of has_active_claim for simpler inter-contract calls
    pub fn has_claim(env: Env, borrower: Address) -> bool {
        Self::has_active_claim(env, borrower)
    }

    /// Mint a CredCloak Score soulbound token to borrower's wallet.
    /// Called automatically after a successful loan approval.
    /// Non-transferable — stored against the borrower address permanently.
    pub fn mint_score(
        env: Env,
        borrower: Address,
        proof_timestamp: u64,
    ) -> Result<(), ContractError> {
        borrower.require_auth();

        let claim_key = (CLAIMS_KEY, borrower.clone());
        let mut claim = env.storage().persistent()
            .get::<_, ReadinessClaim>(&claim_key)
            .ok_or(ContractError::Unauthorized)?;

        if !claim.zk_verified {
            return Err(ContractError::NotZkVerified);
        }

        // Score valid for 30 days from proof timestamp
        let expiry = proof_timestamp + (30 * 24 * 60 * 60);
        claim.score_minted = true;
        claim.score_expiry = expiry;
        env.storage().persistent().set(&claim_key, &claim);

        // Emit score minted event
        env.events().publish(
            (symbol_short!("score"), Symbol::new(&env, "minted")),
            (borrower.clone(), proof_timestamp, expiry)
        );

        Ok(())
    }

    /// Read-only: check if address has a valid, non-expired CredCloak Score.
    /// Any external protocol can call this.
    pub fn has_valid_score(env: Env, borrower: Address) -> bool {
        let claim_key = (CLAIMS_KEY, borrower);
        if let Some(claim) = env.storage().persistent()
            .get::<_, ReadinessClaim>(&claim_key) {
            return claim.score_minted
                && claim.zk_verified
                && env.ledger().timestamp() < claim.score_expiry;
        }
        false
    }
}
