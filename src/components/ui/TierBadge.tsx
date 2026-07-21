'use client';

// Visual mapping: higher tier = more premium. Adjust the thresholds to match
// the values used in production.
const TIERS = [
  { min: 3, label: 'Ouro', color: '#f59e0b' },
  { min: 2, label: 'Prata', color: '#64748b' },
  { min: 1, label: 'Bronze', color: '#b45309' },
];

export function TierBadge({ tier }: { tier: number | null | undefined }) {
  if (tier === null || tier === undefined) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '0.2rem 0.6rem',
          borderRadius: '999px',
          fontSize: '0.75rem',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          background: 'var(--surface-color-hover)',
          color: 'var(--foreground-muted)',
        }}
      >
        Sem nível
      </span>
    );
  }

  const meta = TIERS.find((t) => tier >= t.min);
  const color = meta?.color ?? 'var(--foreground-muted)';

  return (
    <span
      title={meta ? `Nível ${tier} · ${meta.label}` : `Nível ${tier}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
        padding: '0.2rem 0.6rem',
        borderRadius: '999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        background: `color-mix(in srgb, ${color} 15%, transparent)`,
        color,
      }}
    >
      <span
        aria-hidden="true"
        style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: color }}
      />
      Nível {tier}
    </span>
  );
}
