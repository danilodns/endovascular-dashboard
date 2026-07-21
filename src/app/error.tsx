'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import formStyles from '@/components/ui/form.module.css';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        backgroundColor: 'var(--bg-color)',
      }}
    >
      <div
        className="card animate-in"
        style={{ maxWidth: 440, width: '100%', padding: '2.5rem 2rem', textAlign: 'center' }}
      >
        <span
          aria-hidden="true"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '3.5rem',
            height: '3.5rem',
            borderRadius: '50%',
            background: 'color-mix(in srgb, var(--danger) 12%, transparent)',
            color: 'var(--danger)',
          }}
        >
          <AlertTriangle size={28} />
        </span>
        <h2 style={{ marginTop: '1rem', fontSize: '1.25rem', color: 'var(--foreground)' }}>
          Algo deu errado
        </h2>
        <p style={{ color: 'var(--foreground-muted)', margin: '0.5rem 0 1.5rem', fontSize: '0.9rem' }}>
          Ocorreu um erro inesperado ao carregar esta página. Tente novamente.
        </p>
        <button
          type="button"
          className={`${formStyles.btn} ${formStyles.btnPrimary}`}
          onClick={reset}
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
