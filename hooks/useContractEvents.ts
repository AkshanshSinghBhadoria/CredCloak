'use client';

import { useState, useEffect, useCallback } from 'react';
import * as StellarSdk from '@stellar/stellar-sdk';
import { ContractEvent } from '@/lib/types';

const SOROBAN_RPC = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || 'CDHNF2LNW6SAFFW3CDT4LQFEMV5KF3ZYCH5DLKUKBWUJAYTP3RH52RET';
const LOAN_POOL_ADDRESS = process.env.NEXT_PUBLIC_LOAN_POOL_ADDRESS || 'CDHNF2LNW6SAFFW3CDT4LQFEMV5KF3ZYCH5DLKUKBWUJAYTP3RH52RET'; // Fallback to same valid contract address format
const POLL_INTERVAL = 8000; // 8 seconds

export function useContractEvents() {
  const [events, setEvents] = useState<ContractEvent[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [lastLedger, setLastLedger] = useState<number | null>(null);

  const fetchEvents = useCallback(async () => {
    const contractIds = [];
    if (CONTRACT_ADDRESS && StellarSdk.StrKey.isValidContract(CONTRACT_ADDRESS)) {
      contractIds.push(CONTRACT_ADDRESS);
    }
    if (LOAN_POOL_ADDRESS && StellarSdk.StrKey.isValidContract(LOAN_POOL_ADDRESS) && LOAN_POOL_ADDRESS !== CONTRACT_ADDRESS) {
      contractIds.push(LOAN_POOL_ADDRESS);
    }

    if (contractIds.length === 0) return;

    try {
      const server = new StellarSdk.rpc.Server(SOROBAN_RPC);

      // Get current ledger to anchor the event query
      const latestLedger = await server.getLatestLedger();
      const fromLedger = lastLedger ?? (latestLedger.sequence - 300);

      const result = await server.getEvents({
        startLedger: fromLedger,
        filters: [
          {
            type: 'contract',
            contractIds: contractIds,
            topics: [
              ['*', '*'], // match topics like claim registered or loan approved
            ],
          },
        ],
        limit: 30,
      });

      if (result.events && result.events.length > 0) {
        const newEvents: ContractEvent[] = result.events.map((e: any) => {
          let borrower = 'Unknown';
          let dtiPass = undefined;
          let balancePass = undefined;
          let amount = undefined;
          let eventType: ContractEvent['type'] = 'claim_registered';

          try {
            const top1 = e.topic && e.topic[0] ? StellarSdk.scValToNative(e.topic[0])?.toString() : '';
            const top2 = e.topic && e.topic[1] ? StellarSdk.scValToNative(e.topic[1])?.toString() : '';

            const nativeValue = e.value ? StellarSdk.scValToNative(e.value) : null;

            if (top1 === 'claim') {
              if (top2 === 'registered') {
                eventType = 'claim_registered';
                if (Array.isArray(nativeValue) && nativeValue.length >= 4) {
                  borrower = nativeValue[0]?.toString() || 'Unknown';
                  dtiPass = !!nativeValue[2];
                  balancePass = !!nativeValue[3];
                }
              } else if (top2 === 'zk_verified') {
                eventType = 'claim_zk_verified';
                if (Array.isArray(nativeValue) && nativeValue.length >= 1) {
                  borrower = nativeValue[0]?.toString() || 'Unknown';
                }
              }
            } else if (top1 === 'loan') {
              if (top2 === 'approved') {
                eventType = 'loan_approved';
                if (Array.isArray(nativeValue) && nativeValue.length >= 2) {
                  borrower = nativeValue[0]?.toString() || 'Unknown';
                  const amtBig = BigInt(nativeValue[1]?.toString() || 0);
                  amount = (Number(amtBig) / 10_000_000).toFixed(2);
                }
              } else if (top2 === 'rejected') {
                eventType = 'loan_rejected';
                if (Array.isArray(nativeValue) && nativeValue.length >= 1) {
                  borrower = nativeValue[0]?.toString() || 'Unknown';
                }
              } else if (top2 === 'repaid') {
                eventType = 'loan_repaid';
                if (Array.isArray(nativeValue) && nativeValue.length >= 2) {
                  borrower = nativeValue[0]?.toString() || 'Unknown';
                  const amtBig = BigInt(nativeValue[1]?.toString() || 0);
                  amount = (Number(amtBig) / 10_000_000).toFixed(2);
                }
              }
            }
          } catch (err) {
            console.warn('Failed parsing event values:', err);
          }

          return {
            id: e.id,
            type: eventType,
            borrower,
            timestamp: Date.now(),
            dtiPass,
            balancePass,
            amount,
            ledger: e.ledger,
          };
        });

        setEvents(prev => {
          const ids = new Set(prev.map(ev => ev.id));
          const fresh = newEvents.filter(ev => !ids.has(ev.id));
          return [...fresh, ...prev].slice(0, 50); // cap at 50 events
        });

        setLastLedger(latestLedger.sequence);
      }
    } catch (err) {
      console.warn('Event polling error:', err);
    }
  }, [lastLedger]);

  useEffect(() => {
    setIsPolling(true);
    fetchEvents();
    const interval = setInterval(fetchEvents, POLL_INTERVAL);
    return () => {
      clearInterval(interval);
      setIsPolling(false);
    };
  }, [fetchEvents]);

  return { events, isPolling };
}
