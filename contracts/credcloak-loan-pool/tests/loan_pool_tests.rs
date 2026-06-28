#[cfg(test)]
mod tests {
    use soroban_sdk::{testutils::*, Env, Address, Bytes, Vec, token, testutils::Address as _};
    use credcloak_registry::{CredCloakRegistry, CredCloakRegistryClient};
    use credcloak_loan_pool::{CredCloakLoanPool, CredCloakLoanPoolClient, PoolError, LoanStatus};

    #[test]
    fn test_loan_rejected_without_proof() {
        let env = Env::default();
        env.mock_all_auths();

        let registry_id = env.register_contract(None, CredCloakRegistry);
        let pool_id = env.register_contract(None, CredCloakLoanPool);
        
        let token_admin = Address::generate(&env);
        let token_id = env.register_stellar_asset_contract(token_admin);

        let pool_client = CredCloakLoanPoolClient::new(&env, &pool_id);
        let admin = Address::generate(&env);
        pool_client.initialize(&admin, &registry_id, &token_id);

        let borrower = Address::generate(&env);

        // Request loan with empty proof -> InvalidZKProof
        let result = pool_client.try_request_loan(
            &borrower,
            &100_000_000_i128,
            &Bytes::new(&env), // empty proof
            &Vec::new(&env),
        );
        assert_eq!(result, Err(Ok(PoolError::InvalidZKProof)));
    }

    #[test]
    fn test_loan_rejected_without_registry_claim() {
        let env = Env::default();
        env.mock_all_auths();

        let registry_id = env.register_contract(None, CredCloakRegistry);
        let pool_id = env.register_contract(None, CredCloakLoanPool);
        
        let token_admin = Address::generate(&env);
        let token_id = env.register_stellar_asset_contract(token_admin);

        let pool_client = CredCloakLoanPoolClient::new(&env, &pool_id);
        let admin = Address::generate(&env);
        pool_client.initialize(&admin, &registry_id, &token_id);

        let borrower = Address::generate(&env);

        // Valid proof but no registry claim -> NoActiveRegistryClaim
        let dummy_proof = Bytes::from_slice(&env, &[1; 32]);
        let result = pool_client.try_request_loan(
            &borrower,
            &100_000_000_i128,
            &dummy_proof,
            &Vec::new(&env),
        );
        assert_eq!(result, Err(Ok(PoolError::NoActiveRegistryClaim)));
    }

    #[test]
    fn test_loan_approved_with_valid_proof_and_claim() {
        let env = Env::default();
        env.mock_all_auths();

        let registry_id = env.register_contract(None, CredCloakRegistry);
        let pool_id = env.register_contract(None, CredCloakLoanPool);
        
        let token_admin = Address::generate(&env);
        let token_id = env.register_stellar_asset_contract(token_admin.clone());
        let token_client = token::StellarAssetClient::new(&env, &token_id);

        let registry_client = CredCloakRegistryClient::new(&env, &registry_id);
        let pool_client = CredCloakLoanPoolClient::new(&env, &pool_id);
        
        let admin = Address::generate(&env);
        pool_client.initialize(&admin, &registry_id, &token_id);

        let borrower = Address::generate(&env);

        // 1. Fund the loan pool
        let amount = 1_000_000_000_i128; // 100 XLM
        token_client.mint(&admin, &amount);
        pool_client.deposit(&admin, &amount);

        // 2. Register claim on Registry for borrower
        registry_client.register_claim(
            &borrower,
            &Bytes::from_slice(&env, b"test_hash_12345678901234567890ab"),
            &true,
            &true,
            &true,
        );

        // 3. Request loan with valid proof -> Success
        let borrow_amount = 200_000_000_i128; // 20 XLM
        let dummy_proof = Bytes::from_slice(&env, &[1; 32]);
        env.ledger().set_timestamp(1000);
        let result = pool_client.request_loan(
            &borrower,
            &borrow_amount,
            &dummy_proof,
            &Vec::new(&env),
        );
        assert_eq!(result, 1000);

        // 4. Verify loan state and balance transfers
        let loan = pool_client.get_loan(&borrower);
        assert!(loan.is_some());
        let unwrapped = loan.unwrap();
        assert_eq!(unwrapped.amount, borrow_amount);
        assert!(unwrapped.status == LoanStatus::Approved);

        let borrower_balance = token::Client::new(&env, &token_id).balance(&borrower);
        assert_eq!(borrower_balance, borrow_amount);
    }
}
