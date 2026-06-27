export interface WalletState {
  address: string | null;
  isConnected: boolean;
  balance: string | null;
  network: 'testnet' | 'mainnet';
}

export interface StellarTransaction {
  id: string;
  hash: string;
  createdAt: string;
  type: 'received' | 'sent';
  amount: string;
  asset: string;
  counterparty: string;
  memo?: string;
  successful: boolean;
}

export interface FinancialStats {
  averageBalance: number;
  totalInflow: number;
  totalOutflow: number;
  dtiRatio: number;
  transactionCount: number;
  historyDays: number;
  windowDays: 30 | 60 | 90;
}

export interface LoanReadinessIndicator {
  label: string;
  value: string;
  status: 'pass' | 'warn' | 'fail';
  threshold: string;
  description: string;
}

export interface SendTransactionParams {
  destination: string;
  amount: string;
  memo?: string;
  sourceAddress: string;
}

export interface TransactionResult {
  success: boolean;
  hash?: string;
  error?: string;
  stellarLabUrl?: string;
}

export interface ReadinessClaim {
  borrower: string;
  statsHash: string;
  timestamp: number;
  dtiPass: boolean;
  balancePass: boolean;
  historyPass: boolean;
  zkVerified?: boolean;      // NEW
  proofHash?: string;        // NEW
}

export type ContractError = 
  | 'AlreadyRegistered' 
  | 'ThresholdNotMet' 
  | 'Unauthorized'
  | 'ContractCallFailed'
  | 'WalletNotConnected';

export interface ClaimResult {
  success: boolean;
  txHash?: string;
  timestamp?: number;
  error?: ContractError;
  errorMessage?: string;
  explorerUrl?: string;
}

export type TxStatus = 'idle' | 'signing' | 'submitting' | 'confirmed' | 'failed' | 'proving'; // Added proving state

export interface ContractEvent {
  id: string;
  type: 'claim_registered' | 'claim_zk_verified' | 'loan_approved' | 'loan_rejected' | 'loan_repaid'; // Expanded types
  borrower: string;
  timestamp: number;
  dtiPass?: boolean;
  balancePass?: boolean;
  amount?: string; // NEW: loan amount
  ledger: number;
}

export type LoanStatus = 'Pending' | 'Approved' | 'Rejected' | 'Repaid';

export interface LoanRequest {
  borrower: string;
  amount: string;          // in XLM (string to handle large decimals nicely)
  timestamp: number;
  status: LoanStatus;
}

