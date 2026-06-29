# 🏗️ CredCloak Architecture Documentation

## 🛰️ High-Level Ecosystem

CredCloak is a **ZK-powered loan readiness protocol** built on the Stellar blockchain. The architecture for the Level 3 (Orange Belt) is split into five main layers:

```mermaid
graph TD
    User([User's Browser]) -->|Connect Wallet| SWK[Stellar Wallets Kit]
    SWK -->| Freighter / Albedo / xBull / LOBSTR| Wallet[Wallet Extension / Web App]
    User -->|Ingest Payments & Balance| Horizon[Stellar Horizon API]
    User -->|Build Payment / Contract Call| SDK[@stellar/stellar-sdk]
    SDK -->|Request Signature| SWK
    Wallet -->|Submit Signed XDR| Horizon
    User -->|Invoke / Poll events| RPC[Stellar Soroban RPC Server]
    RPC -->|Interact / Read| Contract[Proof Registry Soroban Contract]
    RPC -->|Request Micro-Loan| Pool[CredCloakLoanPool Contract]
    Pool -->|Inter-Contract Call: has_claim| Contract
```

### 1. The On-Chain Layer (Stellar Horizon & Soroban RPC)
Stellar Horizon acts as the gateway to the classic Stellar blockchain. The Soroban RPC server acts as the gateway for smart contract state, transaction submissions, and event streaming.
- **Balance & Payments Ingestion**: Directly reads native XLM balances and payments endpoint (`/accounts/{address}/payments`) from Horizon.
- **Smart Contract Execution**: Submits transactions and queries smart contract state (via simulateTransaction) using the Soroban RPC API.

### 2. The Smart Contract Layer (Proof Registry & Loan Pool)
Two Soroban smart contracts written in Rust and deployed to the Stellar Testnet:
- **`CredCloakRegistry` (Registry)**:
  * Address: `CANCQ2OSUUBAFHFR74JOSYPOMVSMIWECAUUMVBJCWLPQUJMOEWKSTTR6`
  * Stores borrower claims, registers them after checking cooldown, supports upgrading claims to `zk_verified`, and exposes `has_claim` to other contracts.
- **`CredCloakLoanPool` (Loan Pool)**:
  * Address: `CCG73VOI47GXNG7HPULUTX3MCK4E7BOLUVIC6RVIO527NKN3APCJHFYU`
  * Holds XLM for micro-loans. Disburses interest-free micro-loans only to addresses that provide a valid ZK proof and have registered a claim in the Registry (validated via an inter-contract call).

### 3. The Zero-Knowledge Prover Layer (Noir JS)
Calculates and proves creditworthiness client-side in the browser:
- **`credcloak_dti_proof`**: A Noir circuit verifying that average balance and DTI meet thresholds without exposing on-chain balance histories.
- **`lib/zk.ts`**: Runs the Noir witness generator and Aztect UltraHonk backend to produce proofs in the browser, with a high-fidelity simulator fallback for older browsers.

### 4. The Analytical Engine (React Hooks & Utilities)
Calculates key creditworthiness metrics entirely on the client side:
- **Financial Aggregation**: Computes total inflows and outflows across dynamic 30/60/90-day timeframes.
- **DTI Computation**: Automatically derives the Debt-to-Income ratio: `(Total Outflow ÷ Total Inflow) × 100`.
- **Average Balance Approximation**: Reconstructs payment timelines in reverse from the current balance to estimate average balances.
- **Readiness Scoring**: Maps financial statistics against thresholds to project loan eligibility indicators.
- **Event Polling Hook**: Uses the Soroban RPC API to poll for new contract events (`claim_registered`, `zk_verified`, `loan_approved`, `loan_repaid`) every 8 seconds.

### 5. The Non-Custodial UI (Next.js Dashboard)
- **Stellar Wallets Kit**: Integrates `@creit.tech/stellar-wallets-kit` to support multiple browser extensions and web-based wallets.
- **Mobile Responsive Layout**: Implements fluid layouts, collapsible elements, bottom navigation for mobile, and touch-friendly targets.
