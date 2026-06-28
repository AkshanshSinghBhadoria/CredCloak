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
}

// ---- Error Codes ----
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ContractError {
    AlreadyRegistered = 1,      // Claim exists within 30-day cooldown
    ThresholdNotMet = 2,        // Stats don't pass minimum thresholds
    Unauthorized = 3,           // Caller is not the borrower
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
}
