'use client';

import { useEffect, useState } from 'react';
import { LogOut, Menu } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import toast from 'react-hot-toast';
import { ThemeToggle } from './ThemeToggle';
import styles from './header.module.css';

const TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/companies': 'Empresas',
  '/sellers': 'Representantes',
  '/materials': 'Materiais',
  '/brands': 'Marcas',
  '/material-types': 'Tipos de Material',
  '/states': 'Estados',
  '/procedures': 'Procedimentos',
  '/auditoria': 'Auditoria',
  '/usuarios': 'Usuários',
  '/relations/material-seller': 'Material ↔ Representante',
  '/relations/procedure-material': 'Procedimento ↔ Material',
};

function titleFor(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname];
  const seg = pathname.split('/').filter(Boolean)[0];
  return seg ? seg.charAt(0).toUpperCase() + seg.slice(1) : 'Painel';
}

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [email, setEmail] = useState<string>('');

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setEmail(data.user?.email ?? '');
    });
    return () => {
      active = false;
    };
  }, [supabase]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Sessão encerrada com sucesso');
      router.push('/login');
      router.refresh();
    } catch {
      toast.error('Erro ao encerrar sessão');
    }
  };

  const initial = email ? email[0].toUpperCase() : '?';

  return (
    <header className="dashboard-header">
      <div className={styles.headerContent}>
        <div className={styles.left}>
          <button
            type="button"
            className={`${styles.iconButton} ${styles.menuBtn}`}
            onClick={onMenuClick}
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>
          <div className={styles.titleGroup}>
            <span className={styles.eyebrow}>Painel Administrativo</span>
            <span className={styles.title}>{titleFor(pathname)}</span>
          </div>
        </div>

        <div className={styles.actions}>
          <ThemeToggle />
          <div className={styles.divider} aria-hidden="true" />
          <div className={styles.user} title={email || undefined}>
            <span className={styles.avatar} aria-hidden="true">{initial}</span>
            <span className={styles.userName}>{email}</span>
          </div>
          <button onClick={handleLogout} className={styles.logoutBtn} aria-label="Sair" title="Sair">
            <LogOut size={18} />
            <span className={styles.logoutLabel}>Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
}
