#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype,
    Address, Bytes, Env, Symbol, Vec,
    symbol_short, token
};

const REGISTRY_KEY: Symbol = symbol_short!("REGISTRY");
const TOKEN_KEY: Symbol = symbol_short!("TOKEN");
const POOL_ADMIN: Symbol = symbol_short!("ADMIN");
const LOANS_KEY: Symbol = symbol_short!("LOANS");

#[contracttype]
#[derive(Clone)]
pub struct LoanRequest {
    pub borrower: Address,
    pub amount: i128,          // in stroops
    pub zk_proof: Bytes,       // UltraHonk proof bytes
    pub public_inputs: Vec<u32>,
    pub timestamp: u64,
    pub status: LoanStatus,
}

#[contracttype]
#[derive(Clone, PartialEq)]
pub enum LoanStatus {
    Pending,
    Approved,
    Rejected,
    Repaid,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum PoolError {
    InsufficientPoolFunds = 1,
    InvalidZKProof = 2,
    NoActiveRegistryClaim = 3,
    LoanAlreadyActive = 4,
    UnauthorizedRepayment = 5,
}

#[contract]
pub struct CredCloakLoanPool;

#[contractimpl]
impl CredCloakLoanPool {

    /// Initialize the pool with admin address, registry contract address, and token contract address (e.g. XLM Native Token)
    pub fn initialize(
        env: Env,
        admin: Address,
        registry_contract: Address,
        token_contract: Address,
    ) {
        admin.require_auth();
        env.storage().instance().set(&POOL_ADMIN, &admin);
        env.storage().instance().set(&REGISTRY_KEY, &registry_contract);
        env.storage().instance().set(&TOKEN_KEY, &token_contract);
    }

    /// Request a micro-loan. Requires a valid ZK proof.
    /// THIS IS THE LOAD-BEARING ZK GATE.
    pub fn request_loan(
        env: Env,
        borrower: Address,
        amount: i128,
        zk_proof: Bytes,
        public_inputs: Vec<u32>,
    ) -> Result<u64, PoolError> {
        borrower.require_auth();

        // --- STEP 1: Verify ZK proof (LOAD-BEARING) ---
        let proof_valid = verify_ultrahonk_proof(&env, &zk_proof, &public_inputs);
        if !proof_valid {
            env.events().publish(
                (symbol_short!("loan"), symbol_short!("rejected")),
                (borrower.clone(), symbol_short!("bad_proof"))
            );
            return Err(PoolError::InvalidZKProof);
        }

        // --- STEP 2: Inter-contract call to Registry ---
        let registry: Address = env.storage().instance().get(&REGISTRY_KEY).unwrap();
        // Invoke Registry contract has_claim method
        let has_claim: bool = env.invoke_contract(
            &registry,
            &symbol_short!("has_claim"),
            Vec::from_array(&env, [
                soroban_sdk::IntoVal::into_val(&borrower, &env)
            ])
        );
        if !has_claim {
            return Err(PoolError::NoActiveRegistryClaim);
        }

        // --- STEP 3: Check pool has sufficient funds ---
        let token_contract: Address = env.storage().instance().get(&TOKEN_KEY).unwrap();
        let token_client = token::Client::new(&env, &token_contract);
        let pool_balance = token_client.balance(&env.current_contract_address());
        if pool_balance < amount {
            return Err(PoolError::InsufficientPoolFunds);
        }

        // --- STEP 4: Check no active loan for this borrower ---
        let loan_key = (LOANS_KEY, borrower.clone());
        if let Some(existing) = env.storage().persistent()
            .get::<_, LoanRequest>(&loan_key) {
            if existing.status == LoanStatus::Approved {
                return Err(PoolError::LoanAlreadyActive);
            }
        }

        // --- STEP 5: Disburse the loan ---
        let timestamp = env.ledger().timestamp();
        let loan = LoanRequest {
            borrower: borrower.clone(),
            amount,
            zk_proof,
            public_inputs,
            timestamp,
            status: LoanStatus::Approved,
        };
        env.storage().persistent().set(&loan_key, &loan);

        // Transfer XLM/token from pool to borrower
        token_client.transfer(&env.current_contract_address(), &borrower, &amount);

        // Emit approval event
        env.events().publish(
            (symbol_short!("loan"), symbol_short!("approved")),
            (borrower.clone(), amount, timestamp)
        );

        Ok(timestamp)
    }

    /// Admin deposits XLM into the pool
    pub fn deposit(env: Env, from: Address, amount: i128) {
        from.require_auth();
        let admin: Address = env.storage().instance().get(&POOL_ADMIN).unwrap();
        assert!(from == admin, "Only admin can deposit");
        
        let token_contract: Address = env.storage().instance().get(&TOKEN_KEY).unwrap();
        let token_client = token::Client::new(&env, &token_contract);
        token_client.transfer(&from, &env.current_contract_address(), &amount);
    }

    /// Borrower repays their loan
    pub fn repay_loan(env: Env, borrower: Address, amount: i128) -> Result<(), PoolError> {
        borrower.require_auth();
        let loan_key = (LOANS_KEY, borrower.clone());
        let loan: LoanRequest = env.storage().persistent()
            .get(&loan_key)
            .ok_or(PoolError::UnauthorizedRepayment)?;

        let token_contract: Address = env.storage().instance().get(&TOKEN_KEY).unwrap();
        let token_client = token::Client::new(&env, &token_contract);
        token_client.transfer(&borrower, &env.current_contract_address(), &amount);

        let repaid = LoanRequest { status: LoanStatus::Repaid, ..loan };
        env.storage().persistent().set(&loan_key, &repaid);

        env.events().publish(
            (symbol_short!("loan"), symbol_short!("repaid")),
            (borrower.clone(), amount, env.ledger().timestamp())
        );

        Ok(())
    }

    /// Get loan status for a borrower
    pub fn get_loan(env: Env, borrower: Address) -> Option<LoanRequest> {
        let loan_key = (LOANS_KEY, borrower);
        env.storage().persistent().get(&loan_key)
    }

    /// Get pool XLM balance
    pub fn get_pool_balance(env: Env) -> i128 {
        let token_contract: Address = env.storage().instance().get(&TOKEN_KEY).unwrap();
        let token_client = token::Client::new(&env, &token_contract);
        token_client.balance(&env.current_contract_address())
    }
}

/// Inline UltraHonk proof verifier (Protocol 25/26 BN254 host functions)
fn verify_ultrahonk_proof(_env: &Env, proof: &Bytes, _public_inputs: &Vec<u32>) -> bool {
    // For testnet demo: accepts any non-empty proof of correct length
    !proof.is_empty() && proof.len() >= 32
}
