'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Allow Esc to close the mobile drawer.
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sidebarOpen]);

  return (
    <div className="dashboard-layout">
      <a href="#main-content" className="skipLink">Pular para o conteúdo</a>
      <Sidebar
        open={sidebarOpen}
        onNavigate={() => setSidebarOpen(false)}
        onClose={() => setSidebarOpen(false)}
      />
      <div
        className={`dashboard-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />
      <main id="main-content" className="dashboard-main" tabIndex={-1}>
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <div className="dashboard-content animate-in">{children}</div>
      </main>
    </div>
  );
}
