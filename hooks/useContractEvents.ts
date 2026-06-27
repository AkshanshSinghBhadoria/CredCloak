'use client';

import { useState, useEffect, useCallback } from 'react';
import * as StellarSdk from '@stellar/stellar-sdk';
import { ContractEvent } from '@/lib/types';

const SOROBAN_RPC = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || 'CDHNF2LNW6SAFFW3CDT4LQFEMV5KF3ZYCH5DLKUKBWUJAYTP3RH52RET';
const POLL_INTERVAL = 8000; // 8 seconds

export function useContractEvents() {
  const [events, setEvents] = useState<ContractEvent[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [lastLedger, setLastLedger] = useState<number | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS.startsWith('CXXXX')) return;
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
            contractIds: [CONTRACT_ADDRESS],
            topics: [
              ['*', '*'], // match claim + registered topics
            ],
          },
        ],
        limit: 20,
      });

      if (result.events && result.events.length > 0) {
        const newEvents: ContractEvent[] = result.events.map((e: any) => {
          let borrower = 'Unknown';
          let dtiPass = true;
          let balancePass = true;
          try {
            const val = e.value;
            const vec = val.vec();
            if (vec && vec.length >= 4) {
              borrower = vec[0].address()?.toString() || 'Unknown';
              dtiPass = vec[2].b();
              balancePass = vec[3].b();
            }
          } catch (err) {
            console.warn('Failed parsing event ScVal values:', err);
          }

          return {
            id: e.id,
            type: 'claim_registered',
            borrower,
            timestamp: Date.now(),
            dtiPass,
            balancePass,
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
