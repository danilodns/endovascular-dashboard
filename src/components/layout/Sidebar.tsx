'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Building2,
  Users,
  Package,
  Tag,
  Layers,
  MapPin,
  Activity,
  LayoutDashboard,
  History,
  UserCog,
  X,
} from 'lucide-react';
import styles from './sidebar.module.css';

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Empresas', href: '/companies', icon: Building2 },
  { name: 'Representantes', href: '/sellers', icon: Users },
  { name: 'Materiais', href: '/materials', icon: Package },
  { name: 'Marcas', href: '/brands', icon: Tag },
  { name: 'Tipos de Material', href: '/material-types', icon: Layers },
  { name: 'Estados', href: '/states', icon: MapPin },
  { name: 'Procedimentos', href: '/procedures', icon: Activity },
  { name: 'Auditoria', href: '/auditoria', icon: History },
  { name: 'Usuários', href: '/usuarios', icon: UserCog },
];

interface SidebarProps {
  open: boolean;
  onNavigate: () => void;
  onClose: () => void;
}

export function Sidebar({ open, onNavigate, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`dashboard-sidebar ${open ? 'open' : ''}`}
      aria-label="Navegação principal"
    >
      <div className={styles.logo}>
        <Image
          src="/logo.png"
          alt="Endovascular Hub"
          width={180}
          height={44}
          style={{ objectFit: 'contain' }}
          priority
        />
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Fechar menu"
        >
          <X size={20} />
        </button>
      </div>

      <nav className={styles.nav} aria-label="Seções">
        <div className={styles.section}>
          <p className={styles.sectionTitle}>Gerenciar</p>
          <ul className={styles.navList}>
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={`${styles.navLink} ${isActive ? styles.active : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon size={20} aria-hidden="true" />
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </aside>
  );
}
