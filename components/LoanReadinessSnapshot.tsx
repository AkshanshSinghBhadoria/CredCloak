import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { LoanReadinessIndicator } from '@/lib/types';

const statusMap = {
  pass: { icon: 'OK', tone: 'green' as const, className: 'text-emerald-300' },
  warn: { icon: '!', tone: 'amber' as const, className: 'text-amber-300' },
  fail: { icon: 'X', tone: 'red' as const, className: 'text-red-300' },
};

export function LoanReadinessSnapshot({ indicators }: { indicators: LoanReadinessIndicator[] }) {
  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-white">Your Loan Readiness</h2>
          <p className="mt-2 text-sm text-slate-400">A data-only preview of the private proof CredCloak will generate later.</p>
        </div>
        <Badge tone="indigo">Preview</Badge>
      </div>
      <div className="mt-6 space-y-3">
        {indicators.map((indicator) => {
          const status = statusMap[indicator.status];
          return (
            <div key={indicator.label} className="grid gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-4 sm:grid-cols-[44px_1fr_auto] sm:items-center">
              <span className={`grid h-9 w-9 place-items-center rounded-full border border-current font-mono text-xs ${status.className}`}>
                {status.icon}
              </span>
              <span>
                <span className="block font-semibold text-white">{indicator.label}</span>
                <span className="block text-sm text-slate-400">{indicator.description}</span>
              </span>
              <span className="flex flex-wrap items-center gap-2">
                <strong className="font-display text-lg text-white">{indicator.value}</strong>
                <Badge tone={status.tone}>{indicator.threshold}</Badge>
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-5 text-sm text-slate-400">ZK proof generation. This is a preview of the data your proof will use.</p>
      <button
        type="button"
        disabled
        title="ZK proof generation is coming in a future update"
        className="mt-5 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 font-semibold text-slate-500"
      >
        Generate ZK Proof - Comming Soon
      </button>
    </Card>
  );
}
