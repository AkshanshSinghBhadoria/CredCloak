# 🏗️ CredCloak Architecture Documentation

## 🛰️ High-Level Ecosystem

CredCloak is a **ZK-powered loan readiness protocol** built on the Stellar blockchain. The architecture for the current version is split into four main layers:

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
```

### 1. The On-Chain Layer (Stellar Horizon & Soroban RPC)
Stellar Horizon acts as the gateway to the classic Stellar blockchain. The Soroban RPC server acts as the gateway for smart contract state and transactions.
- **Balance & Payments Ingestion**: Directly reads native XLM balances and payments endpoint (`/accounts/{address}/payments`) from Horizon.
- **Smart Contract Execution**: Submits transactions and queries smart contract state (via simulateTransaction) using the Soroban RPC API.
- **Smart Contract Address**: `CDHNF2LNW6SAFFW3CDT4LQFEMV5KF3ZYCH5DLKUKBWUJAYTP3RH52RET`

### 2. The Smart Contract Layer (Proof Registry)
A Soroban smart contract written in Rust (`contracts/credcloak-registry`) that stores borrower claims:
- **`register_claim`**: Validates borrower eligibility (avg balance $\ge 100$, DTI $\le 50\%$), checks 30-day cooldown, stores claim, and emits `claim_registered` events.
- **`get_claim` / `get_total_claims`**: Read-only methods exposing claim details.

### 3. The Analytical Engine (React Hooks & Utilities)
Calculates key creditworthiness metrics entirely on the client side:
- **Financial Aggregation**: Computes total inflows and outflows across dynamic 30/60/90-day timeframes.
- **DTI Computation**: Automatically derives the Debt-to-Income ratio: `(Total Outflow ÷ Total Inflow) × 100`.
- **Average Balance Approximation**: Reconstructs payment timelines in reverse from the current balance to estimate average balances.
- **Readiness Scoring**: Maps financial statistics against thresholds to project loan eligibility indicators.
- **Event Polling Hook**: Uses the Soroban RPC API to poll for new contract events every 8 seconds.

### 4. The Non-Custodial UI (Next.js Dashboard)
- **Stellar Wallets Kit**: Integrates `@creit.tech/stellar-wallets-kit` to support multiple browser extensions and web-based wallets like Albedo.
- **Reactive Interface**: Beautifully rendered dashboard panels, custom SVG-based gauges, event feeds, and real-time transaction forms.
