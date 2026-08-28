'use client';

import { Phone, Mail, MapPin } from 'lucide-react';
import { TierBadge } from '@/components/ui/TierBadge';

export interface RepresentativeContact {
  alias_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  bairro: string | null;
  cep: string | null;
}

export interface Representative {
  name: string;
  tier: number | null;
  banner_url: string | null;
  contact: RepresentativeContact | null;
}

export function RepresentativeCard({ rep }: { rep: Representative }) {
  const c = rep.contact;
  const location = c ? [c.address, c.bairro, c.cep].filter(Boolean).join(' • ') : '';
  const initial = (rep.name?.trim()?.[0] ?? '?').toUpperCase();

  return (
    <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          height: '110px',
          position: 'relative',
          background: rep.banner_url
            ? undefined
            : 'linear-gradient(135deg, color-mix(in srgb, var(--primary) 18%, transparent), var(--surface-color-hover))',
        }}
      >
        {rep.banner_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={rep.banner_url}
            alt={`Banner de ${rep.name}`}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span
              style={{
                width: '3rem',
                height: '3rem',
                borderRadius: '50%',
                background: 'var(--surface-color)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '1.25rem',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {initial}
            </span>
          </div>
        )}
      </div>

      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)', margin: 0 }}>
            {rep.name}
          </h3>
          <TierBadge tier={rep.tier} />
        </div>
        {c?.alias_name && (
          <span style={{ fontSize: '0.8rem', color: 'var(--foreground-muted)', marginTop: '-0.375rem' }}>
            exibido como {c.alias_name}
          </span>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem', color: 'var(--foreground-muted)' }}>
          {c?.phone && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Phone size={14} aria-hidden="true" /> {c.phone}
            </span>
          )}
          {c?.email && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
              <Mail size={14} aria-hidden="true" />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</span>
            </span>
          )}
          {location && (
            <span style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <MapPin size={14} aria-hidden="true" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
              <span>{location}</span>
            </span>
          )}
          {!c?.phone && !c?.email && !location && (
            <span style={{ fontStyle: 'italic' }}>Sem dados de contato.</span>
          )}
        </div>
      </div>
    </div>
  );
}
