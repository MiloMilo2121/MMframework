'use client';

import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { BarChart2 } from 'lucide-react';

interface Props {
  clientName: string;
  sector: string;
  geography?: string;
  date: string;
  version?: string;
}

export function ReportCover({ clientName, sector, geography, date, version = '1.0' }: Props) {
  const formattedDate = format(new Date(date), 'dd/MM/yyyy', { locale: it });

  return (
    <div
      className="relative min-h-screen flex flex-col justify-between p-16 print:min-h-screen"
      style={{ backgroundColor: '#FFFFFF', pageBreakAfter: 'always' }}
    >
      {/* Top: Logo */}
      <div className="flex items-center justify-end gap-3">
        <div>
          <p className="text-sm font-semibold text-right" style={{ color: 'var(--accent-deepest)' }}>Marco Milanello SC</p>
          <p className="text-xs text-right" style={{ color: 'var(--text-secondary)' }}>Strategic Intelligence</p>
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: 'var(--accent-deepest)' }}
        >
          <BarChart2 className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* Center: Title */}
      <div className="flex-1 flex flex-col justify-center mt-20">
        <p
          className="text-sm font-semibold tracking-widest uppercase mb-6"
          style={{ color: 'var(--accent-dark)' }}
        >
          Analisi di Mercato
        </p>

        <div className="w-16 h-1 rounded-full mb-8" style={{ backgroundColor: 'var(--accent-primary)' }} />

        <h1 className="text-5xl font-bold mb-4 leading-tight" style={{ color: 'var(--accent-deepest)' }}>
          {clientName}
        </h1>

        <p className="text-xl mb-2" style={{ color: 'var(--text-secondary)' }}>
          {sector}
          {geography ? ` • ${geography}` : ''}
        </p>

        <div className="w-full h-px my-8" style={{ backgroundColor: 'var(--border-brand)' }} />

        <div className="grid grid-cols-3 gap-8 text-sm">
          <div>
            <p className="font-semibold uppercase tracking-wide text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
              Elaborato da
            </p>
            <p style={{ color: 'var(--text-primary)' }}>Marco Milanello Strategic Consultant</p>
          </div>
          <div>
            <p className="font-semibold uppercase tracking-wide text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
              Data
            </p>
            <p style={{ color: 'var(--text-primary)' }}>{formattedDate}</p>
          </div>
          <div>
            <p className="font-semibold uppercase tracking-wide text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
              Versione
            </p>
            <p style={{ color: 'var(--text-primary)' }}>{version}</p>
          </div>
        </div>

        <div className="mt-8">
          <span
            className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border font-medium"
            style={{ borderColor: 'var(--accent-primary)', color: 'var(--accent-dark)' }}
          >
            🔒 Confidenziale
          </span>
        </div>
      </div>

      {/* Bottom bar */}
      <div>
        <div className="w-full h-1 rounded-full" style={{ backgroundColor: 'var(--accent-primary)' }} />
        <p className="text-xs mt-3" style={{ color: 'var(--text-secondary)' }}>
          Confidenziale — Analisi di Mercato elaborata da Marco Milanello Strategic Consultant — Non distribuire
        </p>
      </div>
    </div>
  );
}
