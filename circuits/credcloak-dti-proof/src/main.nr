// CredCloak DTI Proof Circuit
// Proves: avg_balance >= min_balance AND dti_ratio <= max_dti
// WITHOUT revealing the actual balance or inflow/outflow amounts

fn main(
    // PRIVATE inputs — never leave the browser
    avg_balance_xlm: u64,      // borrower's average balance (in stroops, /10^7 = XLM)
    total_inflow: u64,         // total inflow over window (stroops)
    total_outflow: u64,        // total outflow over window (stroops)

    // PUBLIC inputs — go on-chain with the proof
    min_balance_threshold: pub u64,   // e.g. 1000000000 (100 XLM in stroops)
    max_dti_threshold: pub u64,       // e.g. 50 (percentage, 0-100)
    window_days: pub u64,             // e.g. 30
    borrower_commitment: pub Field    // Poseidon hash of borrower address (binding)
) {
    // --- Constraint 1: Average balance meets minimum ---
    // avg_balance_xlm >= min_balance_threshold
    assert(avg_balance_xlm >= min_balance_threshold);

    // --- Constraint 2: DTI ratio is within acceptable range ---
    // DTI = (total_outflow / total_inflow) * 100 <= max_dti
    // Avoid division: total_outflow * 100 <= max_dti * total_inflow
    assert(total_inflow > 0);  // prevent division by zero
    let dti_lhs = total_outflow * 100;
    let dti_rhs = max_dti_threshold * total_inflow;
    assert(dti_lhs <= dti_rhs);

    // --- Constraint 3: Window is valid (sanity check) ---
    assert(window_days >= 7);
    assert(window_days <= 90);

    // --- Constraint 4: Internal consistency ---
    // avg_balance must be plausible given inflow/outflow
    // (this makes the proof harder to fake with arbitrary inputs)
    let net_flow = total_inflow - total_outflow; // only valid if inflow > outflow
    // Allow ±50% variance from expected avg balance
    let lower = net_flow / 2;
    let upper = net_flow + (net_flow / 2);
    assert(avg_balance_xlm >= lower);
    assert(avg_balance_xlm <= upper + min_balance_threshold); // generous upper bound
}
