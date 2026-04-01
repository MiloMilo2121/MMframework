'use client';

interface Competitor {
  name: string;
  url?: string;
  relevance?: 'high' | 'medium' | 'low';
  clientele?: string;
  positioning?: string;
  channels?: string[];
  commercial_mechanic?: string;
  persuasion_levers?: string[];
  reputation_score?: number;
  reputation_pros?: string;
  reputation_cons?: string;
  attack_angle?: string;
}

interface Props {
  competitor: Competitor;
}

const relevanceConfig = {
  high: { label: 'ALTA', color: '#DC2626', bg: '#FEE2E2' },
  medium: { label: 'MEDIA', color: '#D97706', bg: '#FFFBEB' },
  low: { label: 'BASSA', color: '#6B7280', bg: '#F3F4F6' },
};

export function CompetitorCard({ competitor }: Props) {
  const rel = relevanceConfig[competitor.relevance || 'medium'];
  const stars = competitor.reputation_score || 0;

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-brand)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'var(--border-brand)', backgroundColor: 'var(--surface)' }}
      >
        <div className="flex items-center gap-3">
          {competitor.url && (
            <img
              src={`https://www.google.com/s2/favicons?domain=${competitor.url}&sz=32`}
              alt=""
              className="w-6 h-6 rounded"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <div>
            <p className="font-semibold" style={{ color: 'var(--accent-deepest)' }}>
              {competitor.name}
            </p>
            {competitor.url && (
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {competitor.url}
              </p>
            )}
          </div>
        </div>
        <span
          className="text-xs font-semibold px-2 py-1 rounded"
          style={{ backgroundColor: rel.bg, color: rel.color }}
        >
          ⭐ Rilevanza: {rel.label}
        </span>
      </div>

      {/* Details table */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-3 gap-3 text-sm">
          {competitor.clientele && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>
                Clientela
              </p>
              <p>{competitor.clientele}</p>
            </div>
          )}
          {competitor.positioning && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>
                Posizionamento
              </p>
              <p>{competitor.positioning}</p>
            </div>
          )}
          {competitor.channels && competitor.channels.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>
                Canali
              </p>
              <div className="flex flex-wrap gap-1">
                {competitor.channels.map((c, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'var(--fact-badge)', color: 'var(--accent-dark)' }}
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {competitor.commercial_mechanic && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>
              Meccanica Commerciale
            </p>
            <p className="text-sm">{competitor.commercial_mechanic}</p>
          </div>
        )}

        {competitor.persuasion_levers && competitor.persuasion_levers.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>
              Leve Persuasive
            </p>
            <div className="flex flex-wrap gap-1">
              {competitor.persuasion_levers.map((l, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-1 rounded-full border font-medium"
                  style={{ borderColor: 'var(--accent-primary)', color: 'var(--accent-dark)' }}
                >
                  {l}
                </span>
              ))}
            </div>
          </div>
        )}

        {stars > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-xs font-semibold uppercase" style={{ color: 'var(--text-secondary)' }}>
              Reputazione:
            </span>
            <span>
              {'⭐'.repeat(Math.round(stars))}{'☆'.repeat(5 - Math.round(stars))}
            </span>
            {competitor.reputation_pros && (
              <span className="text-xs text-green-600">Pro: {competitor.reputation_pros}</span>
            )}
            {competitor.reputation_cons && (
              <span className="text-xs text-red-500">Contro: {competitor.reputation_cons}</span>
            )}
          </div>
        )}

        {competitor.attack_angle && (
          <div
            className="rounded-lg p-3 text-sm font-medium"
            style={{ backgroundColor: '#F0FDF4', color: '#15803D' }}
          >
            🎯 Angolo di attacco: {competitor.attack_angle}
          </div>
        )}
      </div>
    </div>
  );
}
