'use client';

interface BuyerPersona {
  name: string;
  role: string;
  sector?: string;
  context: string;
  triggers: string[];
  objections: string[];
  required_proof: string[];
  decision_process: string;
  purchase_type: 'analytical' | 'impulsive' | 'mixed';
}

interface Props {
  persona: BuyerPersona;
}

const purchaseTypeConfig = {
  analytical: { label: 'ANALITICO', color: '#2563EB', bg: '#EFF6FF' },
  impulsive: { label: 'IMPULSIVO', color: '#DC2626', bg: '#FEF2F2' },
  mixed: { label: 'MISTO', color: '#7C3AED', bg: '#F5F3FF' },
};

export function BuyerPersonaCard({ persona }: Props) {
  const pt = purchaseTypeConfig[persona.purchase_type || 'mixed'];

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-brand)' }}>
      {/* Header */}
      <div
        className="flex items-start gap-4 p-5 border-b"
        style={{ borderColor: 'var(--border-brand)', backgroundColor: 'var(--surface)' }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0"
          style={{ backgroundColor: 'var(--accent-primary)' }}
        >
          👤
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-lg" style={{ color: 'var(--accent-deepest)' }}>
            &quot;{persona.name}&quot;
          </h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {persona.role}
            {persona.sector ? ` • ${persona.sector}` : ''}
          </p>
          <p className="text-sm mt-2">{persona.context}</p>
        </div>
        <span
          className="text-xs font-semibold px-2 py-1 rounded shrink-0"
          style={{ backgroundColor: pt.bg, color: pt.color }}
        >
          {pt.label}
        </span>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 divide-x divide-y" style={{ borderColor: 'var(--border-brand)' }}>
        <div className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--accent-dark)' }}>
            🎯 Trigger
          </p>
          <ul className="space-y-1">
            {persona.triggers.map((t, i) => (
              <li key={i} className="text-sm flex gap-2">
                <span style={{ color: 'var(--accent-primary)' }}>▸</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--accent-dark)' }}>
            🚫 Obiezioni
          </p>
          <ul className="space-y-1">
            {persona.objections.map((o, i) => (
              <li key={i} className="text-sm flex gap-2">
                <span className="text-red-400">▸</span>
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--accent-dark)' }}>
            📋 Prove Richieste
          </p>
          <ul className="space-y-1">
            {persona.required_proof.map((p, i) => (
              <li key={i} className="text-sm flex gap-2">
                <span className="text-blue-400">▸</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--accent-dark)' }}>
            🔍 Come Decide
          </p>
          <p className="text-sm">{persona.decision_process}</p>
        </div>
      </div>
    </div>
  );
}
