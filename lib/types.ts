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
