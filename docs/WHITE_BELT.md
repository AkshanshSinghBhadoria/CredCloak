# CredCloak 🛡️ | Stellar Journey to Mastery - Level 1

**CredCloak** is a privacy-first loan readiness protocol on Stellar. This project is a submission for **Level 1 (White Belt)**, establishing the foundation of Freighter and multi-wallet connectivity, on-chain transaction ingestion, and financial health statistics visualization.

## 🥋 Level 1 Requirements & Implementation

To successfully complete Level 1, this project implements the following core standards:

### 1. Wallet Setup & Connection
- [x] **Multi-Wallet Support**: Integrated `@creit.tech/stellar-wallets-kit` supporting Freighter, Albedo, xBull, and LOBSTR.
- [x] **Session Lifecycle**: Users can securely connect their public keys, redirecting them to the dashboard, and disconnect to clear all memory and cache.
- [x] **Stellar Testnet**: Configured to run exclusively on the Stellar Testnet environment.

### 2. Balance & Financial Stats Ingestion
- [x] **Live Ingestion**: Real-time balance and transaction history retrieval from the Stellar Horizon API.
- [x] **Time Window Filtering**: Recalculates stats dynamically based on 30, 60, and 90-day windows.
- [x] **Calculated Metrics**:
  * **Average Balance**: Approximated using the current balance and net flows over the selected period.
  * **Total Inflow & Outflow**: Sum of native XLM payments received or sent.
  * **Debt-to-Income (DTI) Ratio**: Calculated as `(Total Outflows ÷ Total Inflows) × 100`.
- [x] **DTI Gauge**: A responsive, custom SVG semicircle gauge indicating DTI health zones: Green (Healthy: 0–35%), Amber (Warning: 35–50%), and Red (Danger: 50%+).

### 3. Loan Readiness Snapshot
- [x] **Validation Benchmarks**: Calculates and checks three readiness indicators:
  * **Average Balance**: Pass threshold is `≥ 100 XLM` (Warn: `≥ 50 XLM`, Fail: `< 50 XLM`).
  * **DTI Ratio**: Pass threshold is `≤ 35%` (Warn: `≤ 50%`, Fail: `> 50%`).
  * **History Length**: Pass threshold is `≥ 30 days` (Warn: `≥ 14 days`, Fail: `< 14 days`).
- [x] **Future Preview**: Displays a disabled "Generate ZK Proof" button with a tooltip indicating it is coming in a future update.

### 4. Transaction Flow
- [x] **Send XLM Form**: Form with validation for destination address (56 characters starting with G), positive amount, and optional memo (max 28 characters).
- [x] **Non-Custodial Signing**: Builds the transaction via `@stellar/stellar-sdk` and signs securely using the user's connected wallet.
- [x] **Submission & Links**: Submits transactions to the Horizon network and returns immediate success feedback with direct links to the transaction on **Stellar Expert**.
- [x] **Testnet Funding Integration**: Features a background "Fund Account Automatically" button invoking Friendbot to instantly grant 10,000 Testnet XLM to new/unfunded accounts, alongside manual links to the **Stellar Laboratory**.

---

## 🛠️ Tech Stack
- **Framework**: Next.js 14 (App Router) + TypeScript
- **Blockchain**: `@stellar/stellar-sdk` + `@creit.tech/stellar-wallets-kit`
- **Styling**: Tailwind CSS (with custom security/trust-focused dark mode design tokens)
- **Network**: Stellar Testnet

---

## ⚙️ Setup & Installation

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- A Stellar wallet browser extension installed (e.g., [Freighter](https://www.freighter.app/)).

### 2. Running Locally
```bash
# Install dependencies
npm install

# Set up local environment variables
cp .env.local.example .env.local

# Run the development server
npm run dev
```
Open [http://127.0.0.1:3000](http://127.0.0.1:3000) in your browser.

---

Built for the **Stellar Journey to Mastery** • 2026
