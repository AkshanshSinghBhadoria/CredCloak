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

## 📸 Screenshots

Here are the screenshots demonstrating the application's core functionality as required for the Level 1 submission:

### 1. Landing Page & Wallet Connection (Connected State)
The user can connect their wallet (Freighter, Albedo, xBull, or LOBSTR) via the unified wallet connection modal. Once connected, the user's public address is truncated and displayed.
![Wallet Connected State](./snapshots/1_LandingPage.PNG)

### 2. Account Overview & Balance Display
Once a wallet is successfully connected, its current XLM balance is fetched from the Stellar Testnet and displayed in both the header and the main statistics overview cards.
![Balance Displayed](./snapshots/2_Overview.PNG)

### 3. SVG Loan Readiness Gauge (DTI Meter Calibration)
The Readiness tab displays a dynamic SVG gauge showing the calculated Debt-to-Income (DTI) ratio. On load, the gauge runs a 2-second calibration sweep before stabilizing on the user's active DTI.
![Readiness Gauge & Score](./snapshots/3_Readiness.png)

### 4. Ingested Transaction History
The dashboard fetches and lists recent native payments from Horizon for the connected account, supporting dynamic statistics calculations for 30, 60, and 90-day windows.
![Transaction History](./snapshots/4_Transactions.png)

### 5. Successful Testnet Transaction & User Feedback
The "Send XLM" form handles local transaction composition, secure wallet signing, and submission. Once complete, it displays transaction feedback, success status, and a direct clickable link to the transaction detail on the Stellar Expert block explorer.
![Successful Testnet Transaction Result](./snapshots/5_TransactionFeedback.jpeg)

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
