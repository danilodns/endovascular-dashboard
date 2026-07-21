'use client';

import { useSyncExternalStore } from 'react';
import { Sun, Moon } from 'lucide-react';
import styles from './header.module.css';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

function getTheme(): Theme {
  if (typeof document !== 'undefined') {
    const attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'light' || attr === 'dark') return attr;
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  }
  return 'light';
}

// Re-render when the OS theme changes, or when we toggle locally.
function subscribe(callback: () => void) {
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  mql.addEventListener('change', callback);
  window.addEventListener('themechange', callback);
  return () => {
    mql.removeEventListener('change', callback);
    window.removeEventListener('themechange', callback);
  };
}

export function ThemeToggle() {
  // Server snapshot is fixed to avoid hydration mismatch; client reads the real value.
  const theme = useSyncExternalStore(subscribe, getTheme, () => 'light' as Theme);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    try {
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage may be unavailable */
    }
    window.dispatchEvent(new Event('themechange'));
  };

  const isDark = theme === 'dark';
  const Icon = isDark ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={toggle}
      className={styles.iconButton}
      aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
      title={isDark ? 'Tema claro' : 'Tema escuro'}
    >
      <Icon size={18} />
    </button>
  );
}
