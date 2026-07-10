// Wraps Vercel Analytics with CredCloak-specific events
import { track } from '@vercel/analytics';

export const Analytics = {
  walletConnected: (walletType: string) =>
    track('wallet_connected', { wallet: walletType }),

  claimRegistered: (dtiPass: boolean, balancePass: boolean) =>
    track('claim_registered', { dti_pass: dtiPass, balance_pass: balancePass }),

  proofGenerationStarted: () =>
    track('proof_generation_started'),

  proofGenerationCompleted: (durationMs: number) =>
    track('proof_generation_completed', { duration_ms: durationMs }),

  proofGenerationFailed: (reason: string) =>
    track('proof_generation_failed', { reason }),

  loanRequested: (amountXlm: number) =>
    track('loan_requested', { amount_xlm: amountXlm }),

  loanApproved: (amountXlm: number) =>
    track('loan_approved', { amount_xlm: amountXlm }),

  loanRepaid: () =>
    track('loan_repaid'),

  scoreMinted: () =>
    track('credcloak_score_minted'),

  feedbackSubmitted: (rating: number) =>
    track('feedback_submitted', { rating }),
};
