import { StellarTransaction } from '@/lib/types';

const HORIZON_TESTNET = (process.env.NEXT_PUBLIC_HORIZON_URL ?? 'https://horizon-testnet.stellar.org').trim();
const CACHE_TTL = 60_000;

interface HorizonPaymentRecord {
  id: string;
  transaction_hash: string;
  created_at: string;
  type: string;
  asset_type?: string;
  amount?: string;
  from?: string;
  to?: string;
}

export async function fetchAccountDetails(address: string): Promise<{ balance: string; sequence: string }> {
  const response = await fetch(`${HORIZON_TESTNET}/accounts/${address}`);
  if (!response.ok) {
    if (response.status === 404) throw new Error(`Account not found on Stellar testnet: ${address}`);
    if (response.status === 429) throw new Error('Horizon rate limit reached. Please wait a moment and retry.');
    throw new Error(`Failed to fetch account details (${response.status})`);
  }

  const data = await response.json();
  const xlmBalance = data.balances?.find((balance: { asset_type: string }) => balance.asset_type === 'native');

  return {
    balance: xlmBalance?.balance ?? '0',
    sequence: data.sequence,
  };
}

export async function fetchTransactions(address: string, limit = 200): Promise<StellarTransaction[]> {
  const cacheKey = `credcloak:txs:${address}:${limit}`;

  if (typeof window !== 'undefined') {
    const cached = window.sessionStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as { timestamp: number; transactions: StellarTransaction[] };
      if (Date.now() - parsed.timestamp < CACHE_TTL) return parsed.transactions;
    }
  }

  const response = await fetch(`${HORIZON_TESTNET}/accounts/${address}/payments?limit=${limit}&order=desc`);
  if (!response.ok) {
    if (response.status === 404) return [];
    if (response.status === 429) throw new Error('Horizon rate limit reached. Cached data will be used when available.');
    throw new Error('Failed to fetch transaction history from Horizon.');
  }

  const data = await response.json();
  const transactions = ((data._embedded?.records ?? []) as HorizonPaymentRecord[])
    .filter((record) => record.type === 'payment' && record.asset_type === 'native' && record.amount && record.from && record.to)
    .map((record): StellarTransaction => ({
      id: record.id,
      hash: record.transaction_hash,
      createdAt: record.created_at,
      type: record.to === address ? 'received' : 'sent',
      amount: record.amount ?? '0',
      asset: 'XLM',
      counterparty: record.to === address ? record.from ?? '' : record.to ?? '',
      successful: true,
    }));

  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), transactions }));
  }

  return transactions;
}

export async function fetchHistoricalBalances(
  _address: string,
  currentBalance: number,
  transactions: StellarTransaction[],
): Promise<{ date: string; balance: number }[]> {
  const points: { date: string; balance: number }[] = [];
  let runningBalance = currentBalance;

  const sorted = [...transactions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  sorted.forEach((tx) => {
    points.push({ date: tx.createdAt, balance: runningBalance });
    const amount = Number.parseFloat(tx.amount);
    runningBalance = tx.type === 'received' ? runningBalance - amount : runningBalance + amount;
  });

  return points.reverse();
}
