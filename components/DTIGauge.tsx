'use client';

export function DTIGauge({ dtiRatio }: { dtiRatio: number }) {
  const clamped = Math.max(0, Math.min(100, dtiRatio));
  const angle = -180 + (clamped / 100) * 180;

  return (
    <div className="relative mx-auto max-w-sm text-center" title="DTI = Total outflows divided by total inflows times 100. Lower is better for loan eligibility.">
      <svg viewBox="0 0 240 150" className="h-auto w-full" role="img" aria-label={`Debt-to-income ratio ${dtiRatio.toFixed(1)} percent`}>
        <path d="M30 120A90 90 0 0 1 210 120" fill="none" stroke="#1F2937" strokeWidth="18" strokeLinecap="round" />
        <path d="M30 120A90 90 0 0 1 122 30" fill="none" stroke="#10B981" strokeWidth="18" strokeLinecap="round" />
        <path d="M122 30A90 90 0 0 1 154 37" fill="none" stroke="#F59E0B" strokeWidth="18" strokeLinecap="round" />
        <path d="M154 37A90 90 0 0 1 210 120" fill="none" stroke="#EF4444" strokeWidth="18" strokeLinecap="round" />
        <g transform={`rotate(${angle} 120 120)`}>
          <line x1="120" y1="120" x2="42" y2="120" stroke="#F9FAFB" strokeWidth="4" strokeLinecap="round" />
          <circle cx="120" cy="120" r="8" fill="#818CF8" />
        </g>
        <text x="120" y="102" textAnchor="middle" className="fill-white font-display text-3xl font-bold">
          {dtiRatio.toFixed(1)}%
        </text>
      </svg>
      <p className="font-display text-lg font-semibold text-white">Debt-to-Income Ratio</p>
      <p className="mt-2 text-sm text-slate-400">Green: 0-35% | Amber: 35-50% | Red: 50%+</p>
    </div>
  );
}
