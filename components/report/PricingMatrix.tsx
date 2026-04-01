'use client';

interface PricingTier {
  label: string;
  priceRange: string;
  target: string;
  included: string[];
  margin?: string;
  competitors?: string[];
}

interface Props {
  entry?: PricingTier;
  core?: PricingTier;
  premium?: PricingTier;
}

const tierConfig = [
  {
    key: 'entry' as const,
    color: '#6B7280',
    bg: '#F9FAFB',
    header: '#4B5563',
  },
  {
    key: 'core' as const,
    color: 'var(--accent-dark)',
    bg: 'var(--surface)',
    header: 'var(--accent-dark)',
  },
  {
    key: 'premium' as const,
    color: 'var(--accent-deepest)',
    bg: 'var(--fact-badge)',
    header: 'var(--accent-deepest)',
  },
];

export function PricingMatrix({ entry, core, premium }: Props) {
  const tiers = { entry, core, premium };

  return (
    <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border-brand)' }}>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th
              className="text-left p-3 font-semibold text-xs uppercase tracking-wide w-32"
              style={{ backgroundColor: 'var(--accent-deepest)', color: 'white' }}
            >
              Caratteristica
            </th>
            {tierConfig.map(({ key, header }) => {
              const tier = tiers[key];
              return (
                <th
                  key={key}
                  className="p-3 font-bold text-center"
                  style={{ backgroundColor: header, color: 'white' }}
                >
                  {tier?.label || key.charAt(0).toUpperCase() + key.slice(1)}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {/* Price */}
          <tr className="border-t" style={{ borderColor: 'var(--border-brand)' }}>
            <td className="p-3 font-semibold text-xs uppercase" style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--surface)' }}>
              Prezzo
            </td>
            {tierConfig.map(({ key }) => (
              <td key={key} className="p-3 text-center font-semibold">
                {tiers[key]?.priceRange || '—'}
              </td>
            ))}
          </tr>

          {/* Target */}
          <tr className="border-t" style={{ borderColor: 'var(--border-brand)', backgroundColor: 'white' }}>
            <td className="p-3 font-semibold text-xs uppercase" style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--surface)' }}>
              Target
            </td>
            {tierConfig.map(({ key }) => (
              <td key={key} className="p-3 text-center text-xs">
                {tiers[key]?.target || '—'}
              </td>
            ))}
          </tr>

          {/* Included */}
          <tr className="border-t" style={{ borderColor: 'var(--border-brand)' }}>
            <td className="p-3 font-semibold text-xs uppercase" style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--surface)' }}>
              Incluso
            </td>
            {tierConfig.map(({ key, bg }) => (
              <td key={key} className="p-3 align-top" style={{ backgroundColor: bg }}>
                <ul className="space-y-1">
                  {(tiers[key]?.included || []).map((item, i) => (
                    <li key={i} className="text-xs flex gap-1">
                      <span>▸</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </td>
            ))}
          </tr>

          {/* Margin */}
          <tr className="border-t" style={{ borderColor: 'var(--border-brand)', backgroundColor: 'white' }}>
            <td className="p-3 font-semibold text-xs uppercase" style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--surface)' }}>
              Margine %
            </td>
            {tierConfig.map(({ key }) => (
              <td key={key} className="p-3 text-center font-mono text-sm">
                {tiers[key]?.margin || 'NON TRACCIATO'}
              </td>
            ))}
          </tr>

          {/* Competitors */}
          <tr className="border-t" style={{ borderColor: 'var(--border-brand)' }}>
            <td className="p-3 font-semibold text-xs uppercase" style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--surface)' }}>
              Competitor
            </td>
            {tierConfig.map(({ key }) => (
              <td key={key} className="p-3 text-center text-xs" style={{ color: 'var(--text-secondary)' }}>
                {tiers[key]?.competitors?.join(', ') || '—'}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
