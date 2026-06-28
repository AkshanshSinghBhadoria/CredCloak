.PHONY: build test deploy clean test-frontend ci

# Build all contracts
build:
	cd contracts/credcloak-registry && stellar contract build
	cd contracts/credcloak-loan-pool && stellar contract build

# Test all contracts
test:
	cd contracts/credcloak-registry && cargo test
	cd contracts/credcloak-loan-pool && cargo test

# Deploy registry contract to testnet
deploy-registry:
	stellar contract deploy \
		--wasm contracts/credcloak-registry/target/wasm32v1-none/release/credcloak_registry.wasm \
		--source deployer \
		--network testnet

# Deploy loan pool contract to testnet
deploy-pool:
	stellar contract deploy \
		--wasm contracts/credcloak-loan-pool/target/wasm32v1-none/release/credcloak_loan_pool.wasm \
		--source deployer \
		--network testnet

# Deploy both
deploy: deploy-registry deploy-pool

# Clean build artifacts
clean:
	cd contracts/credcloak-registry && cargo clean
	cd contracts/credcloak-loan-pool && cargo clean

# Run frontend tests
test-frontend:
	npm run test

# Full CI run locally
ci: test test-frontend build
