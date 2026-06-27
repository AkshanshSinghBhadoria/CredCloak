'use client';

import { useContractEvents } from '@/hooks/useContractEvents';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { truncateAddress } from '@/lib/financial';

export function EventFeed() {
  const { events, isPolling } = useContractEvents();

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'claim_registered':
        return <Badge tone="indigo" className="font-mono text-[10px] tracking-wide uppercase px-2 py-0.5">claim_reg</Badge>;
      case 'claim_zk_verified':
        return <Badge tone="green" className="font-mono text-[10px] tracking-wide uppercase px-2 py-0.5">zk_verified 🛡️</Badge>;
      case 'loan_approved':
        return <Badge tone="green" className="font-mono text-[10px] tracking-wide uppercase px-2 py-0.5">loan_ok 💰</Badge>;
      case 'loan_rejected':
        return <Badge tone="red" className="font-mono text-[10px] tracking-wide uppercase px-2 py-0.5">loan_fail ✗</Badge>;
      case 'loan_repaid':
        return <Badge tone="amber" className="font-mono text-[10px] tracking-wide uppercase px-2 py-0.5">loan_repaid ✓</Badge>;
      default:
        return <Badge tone="indigo" className="font-mono text-[10px] tracking-wide uppercase px-2 py-0.5">event</Badge>;
    }
  };

  const getEventDetails = (event: any) => {
    switch (event.type) {
      case 'claim_registered':
        return (
          <div className="mt-2.5 pt-2 border-t border-slate-900/60 flex items-center gap-4 text-[10px] font-semibold text-slate-400">
            <div className="flex items-center gap-1">
              <span className={event.dtiPass ? 'text-emerald-400' : 'text-rose-400'}>
                {event.dtiPass ? '✓' : '✗'}
              </span>
              <span>DTI</span>
            </div>
            <div className="flex items-center gap-1">
              <span className={event.balancePass ? 'text-emerald-400' : 'text-rose-400'}>
                {event.balancePass ? '✓' : '✗'}
              </span>
              <span>Balance</span>
            </div>
            <div className="flex items-center gap-1 text-slate-500">
              <span className="text-amber-400">✓</span>
              <span>History</span>
            </div>
          </div>
        );
      case 'claim_zk_verified':
        return (
          <p className="mt-2 text-xs text-emerald-300 font-medium">
            Claim upgraded with Zero-Knowledge proof verification.
          </p>
        );
      case 'loan_approved':
        return (
          <p className="mt-2 text-xs text-white">
            Micro-loan of <span className="font-bold text-indigo-300">{event.amount} XLM</span> disbursed successfully.
          </p>
        );
      case 'loan_rejected':
        return (
          <p className="mt-2 text-xs text-rose-300">
            Loan request failed: ZK Proof or eligibility threshold constraint unmet.
          </p>
        );
      case 'loan_repaid':
        return (
          <p className="mt-2 text-xs text-amber-300">
            Repaid loan of <span className="font-bold text-white">{event.amount} XLM</span> back to the pool.
          </p>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="flex flex-col h-[400px]">
      <div className="flex items-center justify-between border-b border-cloak-border p-4">
        <div>
          <h3 className="font-display font-bold text-white text-base">On-Chain Activity</h3>
          <p className="text-xs text-slate-400">Live contract event stream</p>
        </div>
        <div className="flex items-center gap-2">
          {isPolling && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          )}
          <span className="text-xs text-slate-400 font-medium">
            {isPolling ? 'Polling' : 'Offline'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <svg className="h-8 w-8 text-slate-600 mb-2 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-semibold text-slate-300">Listening for Claims</p>
            <p className="text-xs text-slate-500 mt-1">Be the first to submit a loan readiness claim on-chain.</p>
          </div>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className="p-3 rounded-xl border border-slate-800/80 bg-slate-950/40 hover:bg-slate-950/60 transition-all duration-200 animate-rise"
            >
              <div className="flex items-center justify-between gap-2">
                {getEventBadge(event.type)}
                <span className="text-[10px] text-slate-500 font-medium">
                  Ledger #{event.ledger}
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <span className="font-mono text-xs text-indigo-300 font-semibold" title={event.borrower}>
                  {truncateAddress(event.borrower, 6)}
                </span>
                <span className="text-[10px] text-slate-400">
                  Just now
                </span>
              </div>

              {getEventDetails(event)}
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
