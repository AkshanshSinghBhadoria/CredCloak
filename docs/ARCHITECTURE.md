# 🏗️ CredCloak Architecture Documentation

## 🛰️ High-Level Ecosystem

CredCloak is a **ZK-powered loan readiness protocol** built on the Stellar blockchain. The architecture for the current Level 1 is split into three main layers:

```mermaid
graph TD
    User([User's Browser]) -->|Connect Wallet / Send Transaction| SWK[Stellar Wallets Kit]
    SWK -->| Freighter / Albedo / xBull / LOBSTR| Wallet[Wallet Extension / Web App]
    User -->|Ingest Payments & Balance| Horizon[Stellar Horizon API]
    User -->|Build Payment Transaction| SDK[@stellar/stellar-sdk]
    SDK -->|Request Signature| SWK
    Wallet -->|Submit Signed XDR| Horizon
```

### 1. The On-Chain Layer (Stellar Horizon API)
Stellar Horizon acts as the gateway to the Stellar blockchain. CredCloak queries Horizon to verify account data:
- **Balance Fetching**: Directly reads native XLM balances.
- **Payment Ingestion**: Reads the payments endpoint (`/accounts/{address}/payments`) to analyze transaction flows.
- **Transaction Submission**: Posts signed transaction envelopes to the network for on-chain settlement.

### 2. The Analytical Engine (React Hooks & Utilities)
Calculates key creditworthiness metrics entirely on the client side:
- **Financial Aggregation**: Computes total inflows and outflows across dynamic 30/60/90-day timeframes.
- **DTI Computation**: Automatically derives the Debt-to-Income ratio: `(Total Outflow ÷ Total Inflow) × 100`.
- **Average Balance Approximation**: Reconstructs payment timelines in reverse from the current balance to estimate average balances.
- **Readiness Scoring**: Maps financial statistics against thresholds to project loan eligibility indicators.

### 3. The Non-Custodial UI (Next.js Dashboard)
- **Stellar Wallets Kit**: Integrates `@creit.tech/stellar-wallets-kit` to support multiple browser extensions and web-based wallets like Albedo.
- **Reactive Interface**: Beautifully rendered dashboard panels, custom SVG-based gauges, and real-time transaction forms.

---

## 🔐 Security & Wallet Management
- **Non-Custodial Flow**: Users sign transactions in their own sandbox environment (Freighter extension or Albedo popup). CredCloak never handles private keys.
- **Offline Assembly**: Transactions are composed locally using `@stellar/stellar-sdk` and only the resulting transaction envelope (XDR) is sent to the wallet for signing.

---

## 🔄 Lifecycle of Ingestion & Analysis
1. **Connect**: User links public key via preferred wallet extension.
2. **Sync**: Dashboard calls Horizon to fetch current native balance and payment history.
3. **Compute**: Custom hooks process the payment history array, filtering native XLM movements and computing DTI and average balance.
4. **Render**: The UI updates to display average balance, net flow, DTI gauge, and three-tier readiness indicators.
5. **Transact**: The user sends XLM to a counterparty, signs via the wallet, and submits to Horizon, immediately clearing the transaction cache and refreshing the dashboard state.
