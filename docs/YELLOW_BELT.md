# 🟡 CredCloak — Level 2 (Yellow Belt) Documentation
## Soroban Smart Contract & Real-Time Event Integration

This document outlines the design, implementation, and deployment of the on-chain Proof Registry for CredCloak.

---

## 🏗️ Smart Contract Specification

The smart contract is located at `contracts/credcloak-registry/src/lib.rs`. It acts as the anchor point for loan readiness claims, ensuring that borrower statements are recorded securely on-chain and can be verified by downstream protocols.

### Data structures
```rust
pub struct ReadinessClaim {
    pub borrower: Address,
    pub stats_hash: Bytes,      // SHA256 commitment of the borrower's stats
    pub timestamp: u64,
    pub dti_pass: bool,
    pub balance_pass: bool,
    pub history_pass: bool,
}
```

### Storage layout
- `CLAIMS_KEY` (persistent): Maps a borrower's `Address` to their `ReadinessClaim`.
- `TOTAL_KEY` (instance): Stores the global counter of all registered claims.

### Function interface
1. **`register_claim`**: Validates eligibility (average balance $\ge 100$ XLM, DTI $\le 50\%$), enforces a 30-day resubmission cooldown, writes the claim to persistent storage, increments the global claims counter, and emits a `claim_registered` event.
2. **`get_claim`**: Reads the active claim of a given borrower address.
3. **`get_total_claims`**: Reads the global claims counter.
4. **`has_active_claim`**: Checks if the borrower has a claim registered within the 30-day cooldown period.

---

## 🛰️ Testnet Deployment Details

*   **Contract Address**: `CDHNF2LNW6SAFFW3CDT4LQFEMV5KF3ZYCH5DLKUKBWUJAYTP3RH52RET`
*   **WASM Upload Transaction**: `212cf2f6e9c8439b728838e48106e17b0c6cf90d52af7170f8c7b092a1dd640f`
*   **Contract Instantiation Transaction**: `ffc3d4e79b1ebb855ae2248c688d1ed1efbbf3b5e1463a000ed5d3eafa01d290`
*   **Stellar Network**: Testnet

---

## 🛠️ Error Handling

The application handles three specific contract errors defined on-chain:
1.  **`AlreadyRegistered`** (Error Code `1`): Triggered when a borrower tries to register another claim before the 30-day cooldown expires. Surfaced as: *"You already have an active claim. It refreshes in X days."*
2.  **`ThresholdNotMet`** (Error Code `2`): Triggered if the DTI or balance checks fail on-chain. Surfaced as: *"Your financial stats do not meet the minimum thresholds yet."*
3.  **`Unauthorized`** (Error Code `3`): Triggered when the transaction signature does not match the borrower address. Surfaced as: *"Wallet mismatch. Please connect the correct wallet."*

---

## 📡 Live Event Feed

The frontend polls the Soroban RPC endpoint every 8 seconds for new events matching the contract address. When a `claim_registered` event is detected, it is parsed and dynamically appended to the on-chain activity stream showing the borrower address (truncated) and their threshold passes (DTI/Balance).
