'use client';

import { useEffect, useState } from 'react';

export function DTIGauge({ dtiRatio }: { dtiRatio: number }) {
  const [displayedDti, setDisplayedDti] = useState(100);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 2000; // 2 seconds total
    let frameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;

      let value = 100;
      if (elapsed < 1000) {
        // Phase 1 (0 to 1000ms): 100 -> 0 (anticlockwise)
        const progress = elapsed / 1000;
        const ease = 0.5 - 0.5 * Math.cos(progress * Math.PI); // ease in-out
        value = 100 - ease * 100;
      } else if (elapsed < 2000) {
        // Phase 2 (1000 to 2000ms): 0 -> dtiRatio (clockwise/settle)
        const progress = (elapsed - 1000) / 1000;
        const ease = 1 - Math.pow(1 - progress, 3); // cubic ease out
        value = ease * dtiRatio;
      } else {
        value = dtiRatio;
      }

      setDisplayedDti(value);

      if (elapsed < duration) {
        frameId = requestAnimationFrame(step);
      }
    };

    frameId = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [dtiRatio]);

  const clamped = Math.max(0, Math.min(100, displayedDti));
  const angle = -180 + (clamped / 100) * 180;

  return (
    <div className="relative mx-auto max-w-sm text-center" title="DTI = Total outflows divided by total inflows times 100. Lower is better for loan eligibility.">
      <svg viewBox="0 0 240 150" className="h-auto w-full" role="img" aria-label={`Debt-to-income ratio ${dtiRatio.toFixed(1)} percent`}>
        <path d="M30 120A90 90 0 0 1 210 120" fill="none" stroke="#1F2937" strokeWidth="18" strokeLinecap="round" />
        <path d="M30 120A90 90 0 0 1 122 30" fill="none" stroke="#10B981" strokeWidth="18" strokeLinecap="round" />
        <path d="M122 30A90 90 0 0 1 154 37" fill="none" stroke="#F59E0B" strokeWidth="18" strokeLinecap="round" />
        <path d="M154 37A90 90 0 0 1 210 120" fill="none" stroke="#EF4444" strokeWidth="18" strokeLinecap="round" />
        <g transform={`rotate(${angle} 120 120)`}>
          <line x1="120" y1="120" x2="198" y2="120" stroke="#F9FAFB" strokeWidth="4" strokeLinecap="round" />
          <circle cx="120" cy="120" r="8" fill="#818CF8" />
        </g>
        <text x="120" y="102" textAnchor="middle" className="fill-white font-display text-3xl font-bold">
          {displayedDti.toFixed(1)}%
        </text>
      </svg>
      <p className="font-display text-lg font-semibold text-white">Debt-to-Income Ratio</p>
      <p className="mt-2 text-sm text-slate-400">Green: 0-35% | Amber: 35-50% | Red: 50%+</p>
    </div>
  );
}
