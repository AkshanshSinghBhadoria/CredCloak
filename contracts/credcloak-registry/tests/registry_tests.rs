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
}
