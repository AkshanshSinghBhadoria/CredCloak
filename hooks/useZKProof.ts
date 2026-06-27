'use client';
import { useState, useCallback } from 'react';
import { generateDTIProof, ZKProof } from '@/lib/zk';
import { FinancialStats } from '@/lib/types';

export type ZKProofStep =
  | 'idle'
  | 'computing_inputs'   // Reading Horizon data
  | 'generating_proof'   // Noir circuit running
  | 'proof_ready'        // Proof generated, ready to submit
  | 'submitting'         // Submitting to Soroban contract
  | 'verified'           // Contract verified the proof
  | 'failed';

export function useZKProof() {
  const [step, setStep] = useState<ZKProofStep>('idle');
  const [proof, setProof] = useState<ZKProof | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressMsg, setProgressMsg] = useState('');

  const generate = useCallback(async (
    stats: FinancialStats,
    borrowerAddress: string,
    thresholds: { minBalance: number; maxDti: number }
  ) => {
    setStep('computing_inputs');
    setError(null);
    setProgressMsg('Reading your on-chain history...');

    try {
      setStep('generating_proof');
      setProgressMsg('Generating ZK proof in browser (this takes ~3-15 seconds)...');

      const zkProof = await generateDTIProof(stats, borrowerAddress, thresholds);

      setProof(zkProof);
      setStep('proof_ready');
      setProgressMsg(`Proof generated in ${(zkProof.generationTimeMs / 1000).toFixed(1)}s`);
    } catch (err: any) {
      setStep('failed');
      setError(err.message ?? 'Proof generation failed');
    }
  }, []);

  const reset = useCallback(() => {
    setStep('idle');
    setProof(null);
    setError(null);
    setProgressMsg('');
  }, []);

  return { step, setStep, proof, error, setError, progressMsg, generate, reset };
}
