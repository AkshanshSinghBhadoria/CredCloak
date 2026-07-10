#[cfg(test)]
mod tests {
    use soroban_sdk::{testutils::*, Env, Address, Bytes, testutils::Address as _};
    use credcloak_registry::{CredCloakRegistry, CredCloakRegistryClient, ContractError};

    #[test]
    fn test_register_claim_success() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, CredCloakRegistry);
        let client = CredCloakRegistryClient::new(&env, &contract_id);
        let borrower = Address::generate(&env);
        env.ledger().set_timestamp(1000);

        let result = client.register_claim(
            &borrower,
            &Bytes::from_slice(&env, b"test_hash_12345678901234567890ab"),
            &true,   // dti_pass
            &true,   // balance_pass
            &true,   // history_pass
        );
        assert_eq!(result, 1000);

        // Verify claim was stored
        let claim = client.get_claim(&borrower);
        assert!(claim.is_some());
        let unwrapped = claim.unwrap();
        assert_eq!(unwrapped.dti_pass, true);
        assert_eq!(unwrapped.zk_verified, false);
    }

    #[test]
    fn test_register_claim_threshold_not_met() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, CredCloakRegistry);
        let client = CredCloakRegistryClient::new(&env, &contract_id);
        let borrower = Address::generate(&env);

        // DTI fails (dti_pass = false)
        let result = client.try_register_claim(
            &borrower,
            &Bytes::from_slice(&env, b"test_hash_12345678901234567890ab"),
            &false,  // dti_pass FAILS
            &true,
            &true,
        );
        assert_eq!(result, Err(Ok(ContractError::ThresholdNotMet)));
    }

    #[test]
    fn test_register_claim_cooldown_enforced() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, CredCloakRegistry);
        let client = CredCloakRegistryClient::new(&env, &contract_id);
        let borrower = Address::generate(&env);

        // First claim — succeeds
        client.register_claim(
            &borrower,
            &Bytes::from_slice(&env, b"test_hash_12345678901234567890ab"),
            &true, &true, &true,
        );

        // Second claim immediately — fails (cooldown)
        let result = client.try_register_claim(
            &borrower,
            &Bytes::from_slice(&env, b"test_hash_12345678901234567890ab"),
            &true, &true, &true,
        );
        assert_eq!(result, Err(Ok(ContractError::AlreadyRegistered)));
    }

    #[test]
    fn test_get_total_claims_increments() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, CredCloakRegistry);
        let client = CredCloakRegistryClient::new(&env, &contract_id);

        assert_eq!(client.get_total_claims(), 0);

        let borrower = Address::generate(&env);
        client.register_claim(
            &borrower,
            &Bytes::from_slice(&env, b"test_hash_12345678901234567890ab"),
            &true, &true, &true,
        );

        assert_eq!(client.get_total_claims(), 1);
    }

    #[test]
    fn test_mint_score_requires_zk_verified() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, CredCloakRegistry);
        let client = CredCloakRegistryClient::new(&env, &contract_id);
        let borrower = Address::generate(&env);
        env.ledger().set_timestamp(1000);

        client.register_claim(
            &borrower,
            &Bytes::from_slice(&env, b"test_hash_12345678901234567890ab"),
            &true, &true, &true,
        );

        // Not ZK-verified yet — mint should fail
        let result = client.try_mint_score(&borrower, &1000u64);
        assert_eq!(result, Err(Ok(ContractError::NotZkVerified)));

        assert_eq!(client.has_valid_score(&borrower), false);
    }

    #[test]
    fn test_mint_score_success_and_expiry() {
        use soroban_sdk::BytesN;

        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, CredCloakRegistry);
        let client = CredCloakRegistryClient::new(&env, &contract_id);
        let borrower = Address::generate(&env);
        env.ledger().set_timestamp(1000);

        client.register_claim(
            &borrower,
            &Bytes::from_slice(&env, b"test_hash_12345678901234567890ab"),
            &true, &true, &true,
        );

        client.upgrade_to_zk_verified(&borrower, &BytesN::from_array(&env, &[1u8; 32]));

        client.mint_score(&borrower, &1000u64);

        let claim = client.get_claim(&borrower).unwrap();
        assert_eq!(claim.score_minted, true);
        assert_eq!(claim.score_expiry, 1000 + 30 * 24 * 60 * 60);

        // Still within 30 days — score valid
        env.ledger().set_timestamp(1000 + 15 * 24 * 60 * 60);
        assert_eq!(client.has_valid_score(&borrower), true);

        // Past 30 days — score expired
        env.ledger().set_timestamp(1000 + 31 * 24 * 60 * 60);
        assert_eq!(client.has_valid_score(&borrower), false);
    }
}
