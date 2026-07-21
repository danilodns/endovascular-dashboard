'use client';

import { Phone, Mail, MapPin } from 'lucide-react';
import { TierBadge } from '@/components/ui/TierBadge';

export interface Representative {
  name: string;
  tier: number | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  bairro: string | null;
  cep: string | null;
  banner_url: string | null;
}

export function RepresentativeCard({ rep }: { rep: Representative }) {
  const location = [rep.address, rep.bairro, rep.cep].filter(Boolean).join(' • ');
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem', color: 'var(--foreground-muted)' }}>
          {rep.phone && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Phone size={14} aria-hidden="true" /> {rep.phone}
            </span>
          )}
          {rep.email && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
              <Mail size={14} aria-hidden="true" />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rep.email}</span>
            </span>
          )}
          {location && (
            <span style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <MapPin size={14} aria-hidden="true" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
              <span>{location}</span>
            </span>
          )}
          {!rep.phone && !rep.email && !location && (
            <span style={{ fontStyle: 'italic' }}>Sem dados de contato.</span>
          )}
        </div>
      </div>
    </div>
  );
}
