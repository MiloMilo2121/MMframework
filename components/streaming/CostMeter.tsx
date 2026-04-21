'use client';

import type { CostSnapshot } from '@/lib/types/analysis';

interface Props {
  cost: CostSnapshot;
  capUsd: number;
}

export function CostMeter({ cost, capUsd }: Props) {
  const pct = Math.min(100, (cost.totalUsd / capUsd) * 100);
  const isNearCap = pct >= 80;
  const isOverCap = pct >= 95;

  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (pct / 100) * circumference;

  const color = isOverCap ? '#EF4444' : isNearCap ? '#F59E0B' : 'var(--accent-primary)';

  return (
    <div
      className="fixed top-20 right-4 z-50 flex items-center gap-3 rounded-xl border px-3 py-2 shadow-lg"
      style={{
        backgroundColor: 'white',
        borderColor: isOverCap ? '#EF4444' : 'var(--border-brand)',
        minWidth: 160,
      }}
    >
      {/* SVG ring */}
      <div className="relative w-12 h-12 shrink-0">
        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 56 56">
          <circle
            cx="28" cy="28" r={radius}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="4"
          />
          <circle
            cx="28" cy="28" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s ease' }}
          />
        </svg>
        <span
          className="absolute inset-0 flex items-center justify-center text-[10px] font-bold"
          style={{ color }}
        >
          {Math.round(pct)}%
        </span>
      </div>

      {/* Text */}
      <div className="min-w-0">
        <p className="text-xs font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
          ${cost.totalUsd.toFixed(3)}
          <span className="font-normal text-gray-400"> / ${capUsd}</span>
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {(cost.tokens / 1000).toFixed(0)}k token
        </p>
        {isOverCap && (
          <p className="text-[10px] text-red-500 font-semibold">Budget quasi esaurito</p>
        )}
      </div>
    </div>
  );
}
