import Link from 'next/link';
import { Home } from 'lucide-react';
import formStyles from '@/components/ui/form.module.css';

export default function NotFound() {
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
        <div style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--primary)', lineHeight: 1 }}>
          404
        </div>
        <h2 style={{ marginTop: '0.5rem', fontSize: '1.25rem', color: 'var(--foreground)' }}>
          Página não encontrada
        </h2>
        <p style={{ color: 'var(--foreground-muted)', margin: '0.5rem 0 1.5rem', fontSize: '0.9rem' }}>
          A página que você procura não existe ou foi movida.
        </p>
        <Link
          href="/"
          className={`${formStyles.btn} ${formStyles.btnPrimary}`}
        >
          <Home size={18} />
          <span>Voltar ao início</span>
        </Link>
      </div>
    </div>
  );
}
