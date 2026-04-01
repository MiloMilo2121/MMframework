'use client';

interface SwotItem {
  text: string;
  action?: string;
}

interface Props {
  strengths?: SwotItem[];
  weaknesses?: SwotItem[];
  opportunities?: SwotItem[];
  threats?: SwotItem[];
}

function SwotQuadrant({
  title,
  icon,
  items,
  actionLabel,
  bgColor,
  borderColor,
  textColor,
}: {
  title: string;
  icon: string;
  items?: SwotItem[];
  actionLabel: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}) {
  return (
    <div
      className="rounded-xl border p-4 space-y-3"
      style={{ borderColor, backgroundColor: bgColor }}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <h3 className="font-bold text-sm" style={{ color: textColor }}>
          {title}
        </h3>
      </div>
      {items && items.length > 0 ? (
        <ul className="space-y-3">
          {items.map((item, i) => (
            <li key={i}>
              <p className="text-sm">{item.text}</p>
              {item.action && (
                <p className="text-xs mt-1 font-medium" style={{ color: textColor }}>
                  → {actionLabel}: {item.action}
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs" style={{ color: textColor, opacity: 0.6 }}>Dati non disponibili</p>
      )}
    </div>
  );
}

export function SwotMatrix({ strengths, weaknesses, opportunities, threats }: Props) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <SwotQuadrant
        title="Forze"
        icon="💪"
        items={strengths}
        actionLabel="Azione"
        bgColor="#F0FDF4"
        borderColor="#BBF7D0"
        textColor="#166534"
      />
      <SwotQuadrant
        title="Debolezze"
        icon="⚠️"
        items={weaknesses}
        actionLabel="Piano recupero"
        bgColor="#FEF2F2"
        borderColor="#FECACA"
        textColor="#991B1B"
      />
      <SwotQuadrant
        title="Opportunità"
        icon="🚀"
        items={opportunities}
        actionLabel="Test"
        bgColor="#EFF6FF"
        borderColor="#BFDBFE"
        textColor="#1E40AF"
      />
      <SwotQuadrant
        title="Minacce"
        icon="🛡️"
        items={threats}
        actionLabel="Segnale precoce"
        bgColor="#FFFBEB"
        borderColor="#FDE68A"
        textColor="#92400E"
      />
    </div>
  );
}
