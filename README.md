# CredCloak 🛡️ | Stellar Journey to Mastery - Level 1

**CredCloak** is a privacy-first loan readiness protocol on Stellar. It analyzes on-chain transaction history to compute and visualize creditworthiness metrics—such as average balance, inflows, outflows, and debt-to-income (DTI) ratio—empowering users to preview their credit health before generating private zero-knowledge proofs in future versions.

---

## ⚪ Level 1 - WHITE BELT (SUBMISSION)

This release implements the core data ingestion, analysis, and transactional foundation on the Stellar Testnet:
- **Multi-Wallet Integration**: Seamless connection with Freighter, Albedo, xBull, and LOBSTR extensions/apps via Stellar Wallets Kit.
- **On-Chain Financial Analysis**: Ingests payment histories directly from Stellar Horizon API to compute inflow, outflow, and average balance across 30, 60, and 90-day windows.
- **Interactive DTI Gauge**: Custom SVG-based semicircle gauge visualizing the Debt-to-Income ratio with real-time zone feedback (Green, Amber, Red).
- **Loan Readiness Snapshot**: Evaluates user financial stats against benchmarks (minimum balance, DTI limits, and transaction history length) to preview loan eligibility.
- **Background Friendbot Funding**: An automated, single-click testnet funding feature for new/unfunded accounts, alongside manual tools via Stellar Lab.
- **Secure Non-Custodial Payments**: Composes payment transactions locally using `@stellar/stellar-sdk` and signs them securely via the user's wallet.

---

## 🚀 Mastery Journey

### ⚪ Level 1: White Belt - Ingestion & In-Browser Analysis (Current)
* Project scaffolding and environment setup.
* Multi-wallet connection (Freighter, Albedo, xBull, LOBSTR) and session state.
* Horizon API integration for payment history ingestion and statistics computation.
* SVG DTI Gauge visualization and eligibility checks.
* Automated Friendbot funding and non-custodial transaction submission.
* [View White Belt Documentation](./docs/WHITE_BELT.md)

### 🟡 Level 2: Yellow Belt - Smart Contract Escrow (Planned)
* First deployment of Soroban Smart Contracts.
* Implementing deposit pools and loan contract logic.
* On-chain state tracking of loan applications.

### 🟠 Level 3: Orange Belt - ZK Proof Generation (Planned)
* Compiling zero-knowledge circuits using Noir.
* Generating client-side ZK proofs of average balance and DTI thresholds.
* Gating smart contract interactions using on-chain verification.

---

## 🏗️ Technical Architecture
CredCloak follows a robust three-layered client-side approach:
1. **Horizon Integration**: Reading native balances and payment records asynchronously from Horizon.
2. **Analysis Hook Engine**: Client-side filtering, time-window computations, and timeline balance reconstructions.
3. **Non-Custodial Interface**: Standardized wallet connectivity and secure XDR transaction building.
- [Full ARCHITECTURE.md](./docs/ARCHITECTURE.md)

---

## 🛠️ Project Structure
- `app/dashboard/page.tsx`: The main statistics and transactions workspace dashboard.
- `hooks/useWallet.tsx`: Multi-wallet connection provider and session store.
- `hooks/useTransactions.ts`: Handles fetching and session caching of payments.
- `lib/financial.ts`: Timeline analysis, DTI computation, and format utilities.
- `lib/stellar.ts`: Offline transaction building and explorer linking.
- `docs/`: Blueprint documents for implementation and design.

---

## ⚙️ Setup & Installation

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- A browser wallet extension (e.g., [Freighter Wallet](https://www.freighter.app/)).
- Set wallet extension network to **Testnet**.

### 2. Run Locally
```bash
# Install dependencies
npm install

# Copy configuration
cp .env.local.example .env.local

# Run development server
npm run dev
```
Open [http://127.0.0.1:3000](http://127.0.0.1:3000) in your browser.
