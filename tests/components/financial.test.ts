import { computeFinancialStats, computeLoanReadiness } from '@/lib/financial';
import { StellarTransaction } from '@/lib/types';

describe('Financial Math Utilities', () => {
  const mockTransactions: StellarTransaction[] = [
    {
      id: '1',
      hash: 'h1',
      createdAt: new Date().toISOString(),
      type: 'received',
      amount: '150.00',
      asset: 'XLM',
      counterparty: 'addr1',
      successful: true,
    },
    {
      id: '2',
      hash: 'h2',
      createdAt: new Date().toISOString(),
      type: 'sent',
      amount: '50.00',
      asset: 'XLM',
      counterparty: 'addr2',
      successful: true,
    },
  ];

  it('should compute inflows, outflows, DTI, and estimated average balance correctly', () => {
    const stats = computeFinancialStats(mockTransactions, 100, 30);
    expect(stats.totalInflow).toBe(150);
    expect(stats.totalOutflow).toBe(50);
    expect(stats.dtiRatio).toBe((50 / 150) * 100);
    expect(stats.averageBalance).toBe(50); // currentBalance (100) - netFlow (100) / 2 = 50
  });

  it('should compute correct loan readiness flags for the DTI, history, and balance indicators', () => {
    const stats = computeFinancialStats(mockTransactions, 200, 30);
    const readiness = computeLoanReadiness(stats);
    
    // Average balance is 200 - (100)/2 = 150 XLM (passes threshold >= 100)
    const avgBal = readiness.find(r => r.label === 'Average Balance');
    expect(avgBal?.status).toBe('pass');

    // DTI ratio is 33.3% (passes threshold <= 35%)
    const dti = readiness.find(r => r.label === 'DTI Ratio');
    expect(dti?.status).toBe('pass');
  });
});
