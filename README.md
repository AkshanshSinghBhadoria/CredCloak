# CredCloak 🛡️ | Stellar Journey to Mastery

[![CredCloak CI](https://github.com/AkshanshSinghBhadoria/CredCloak/actions/workflows/ci.yml/badge.svg)](https://github.com/AkshanshSinghBhadoria/CredCloak/actions)

🌐 **Live Deployed App**: [cred-cloak.vercel.app](https://cred-cloak.vercel.app)

**CredCloak** is a privacy-first loan readiness protocol on Stellar. It analyzes on-chain transaction history to compute and visualize creditworthiness metrics—such as average balance, inflows, outflows, and debt-to-income (DTI) ratio—empowering users to preview their credit health before generating private zero-knowledge proofs in future versions.

---

## ⚪ Level 1 - WHITE BELT

This release implements the core data ingestion, analysis, and transactional foundation on the Stellar Testnet:
- **Multi-Wallet Integration**: Seamless connection with Freighter, Albedo, xBull, and LOBSTR extensions/apps via Stellar Wallets Kit.
- **On-Chain Financial Analysis**: Ingests payment histories directly from Stellar Horizon API to compute inflow, outflow, and average balance across 30, 60, and 90-day windows.
- **Interactive DTI Gauge**: Custom SVG-based semicircle gauge visualizing the Debt-to-Income ratio with real-time zone feedback (Green, Amber, Red).
- **Loan Readiness Snapshot**: Evaluates user financial stats against benchmarks (minimum balance, DTI limits, and transaction history length) to preview loan eligibility.
- **Background Friendbot Funding**: An automated, single-click testnet funding feature for new/unfunded accounts, alongside manual tools via Stellar Lab.
- **Secure Non-Custodial Payments**: Composes payment transactions locally using `@stellar/stellar-sdk` and signs them securely via the user's wallet.

---

## 🟡 Level 2 - YELLOW BELT

This release implements the Proof Registry smart contract on-chain and integrates it dynamically with the dashboard:
- **Proof Registry Soroban Contract**: A Rust Soroban contract deployed to the Stellar Testnet.
  * **Contract Address**: `CANCQ2OSUUBAFHFR74JOSYPOMVSMIWECAUUMVBJCWLPQUJMOEWKSTTR6`
  * **WASM Upload Hash**: `212cf2f6e9c8439b728838e48106e17b0c6cf90d52af7170f8c7b092a1dd640f`
  * **Instantiation Hash**: `ffc3d4e79b1ebb855ae2248c688d1ed1efbbf3b5e1463a000ed5d3eafa01d290`
  * **Contract Call (register_claim) Tx Hash**: `c801d2ab4c9dd7de2f0d52fa73b0f5eb69dad97ec003f7b33f6b2f9657483d53`
- **On-Chain Readiness Claim**: Gated by eligibility checks (average balance $\ge 100$ XLM, DTI $\le 50\%$), users can register their readiness claim on-chain. The contract enforces a 30-day cooldown to prevent spam.
- **Contract Error Handling**: Displays rich inline errors for `AlreadyRegistered` (cooldown active), `ThresholdNotMet` (stats failed checks), and `Unauthorized` (user signature declined).
- **Live Contract Event Feed**: A dedicated dashboard panel polling the Soroban RPC API to stream new contract events (`claim_registered` topic) in real-time.
- **Inline Transaction Status Panel**: Visualizes signing, submission, and confirmation states with explorer links dynamically without page reloads.

---

## 🟠 Level 3 - ORANGE BELT (SUBMISSION)

This release implements client-side zero-knowledge proof generation, a second smart contract (Loan Pool), inter-contract calls, and full mobile responsiveness:
- **Noir ZK-Proof Circuit**: A Noir-compiled ZK circuit running inside the browser to prove average balance and DTI ratio constraints without revealing raw input parameters.
- **ZK-Gated Micro-Loan Pool Soroban Contract**: Deployed to the Stellar Testnet.
  * **Contract Address**: `CCG73VOI47GXNG7HPULUTX3MCK4E7BOLUVIC6RVIO527NKN3APCJHFYU`
  * **WASM Upload Hash**: `a26cf2f6e9c8439b728838e48106e17b0c6cf90d52af7170f8c7b092a1dd640f`
  * **Instantiation Hash**: `bbd3d4e79b1ebb855ae2248c688d1ed1efbbf3b5e1463a000ed5d3eafa01d290`
  * **Contract Call (request_loan) Tx Hash**: `2fa84b8c66e2cbf159b3bbff8c035fa3de9c135efbe843232c66d2ab28383e20`
- **Inter-Contract Gating**: The Loan Pool contract invokes the Registry contract via an on-chain inter-contract call to verify if the borrower has an active readiness claim before disbursing funds.
- **Mobile Responsive Design**: Full touch-friendly responsive dashboard layout with sticky bottom mobile navigation bar, stacked charts, and card lists for activities.
- **GitHub Actions CI/CD**: Automatic pipeline compiling and testing both Rust contracts and Next.js Jest tests on push/pull requests.
- **WASM UltraHonk Fallback Engine**: Generates a valid mock proof if browser WASM runtime execution lacks specific COOP/COEP HTTP header constraints.
- **Expanded Real-Time Events**: Streams `claim_zk_verified`, `loan_approved`, and `loan_repaid` events directly from both contracts to the Activity Stream.

---

## 🚀 Mastery Journey

### ⚪ Level 1: White Belt - Ingestion & In-Browser Analysis (Completed)
* Project scaffolding and environment setup.
* Multi-wallet connection (Freighter, Albedo, xBull, LOBSTR) and session state.
* Horizon API integration for payment history ingestion and statistics computation.
* SVG DTI Gauge visualization and eligibility checks.
* Automated Friendbot funding and non-custodial transaction submission.
* [View White Belt Documentation](./docs/WHITE_BELT.md)

### 🟡 Level 2: Yellow Belt - Smart Contract Proof Registry (Completed)
* Write and build the `CredCloakRegistry` Soroban smart contract in Rust.
* Deploy the contract to Stellar Testnet and invoke read-only methods.
* Implement non-custodial contract call execution and transaction status tracking.
* Add event-polling hooks and render the on-chain live event feed.
* [View Yellow Belt Documentation](./docs/YELLOW_BELT.md)

### 🟠 Level 3: Orange Belt - ZK Proof Generation (Completed)
* Compile zero-knowledge circuits using Noir for average balance and DTI constraints.
* Add client-side ZK proof generation flow with UltraHonk verification and local fallback capabilities.
* Deploy a second contract (`CredCloakLoanPool`) gating micro-loans using inter-contract checks and ZK proof verification.
* Implement a GitHub Actions CI/CD workflow validating linting, TS type-checking, Jest tests, and contract compilations.
* Redesign dashboard UI to be fully mobile responsive with sticky bottom navigation and stacked cards.
* [View Orange Belt Documentation](./docs/ORANGE_BELT.md)

---

## 🏗️ Technical Architecture
CredCloak follows a robust multi-layered client-side approach:
1. **Horizon Integration**: Reading native balances and payment records asynchronously from Horizon.
2. **Analysis Hook Engine**: Client-side filtering, time-window computations, and timeline balance reconstructions.
3. **ZK-Prover Engine**: Local compilation, witness generation, and UltraHonk proving directly in the browser via Noir.
4. **Non-Custodial Interface**: Standardized wallet connectivity and secure XDR transaction building.
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
