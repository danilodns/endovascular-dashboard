'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Table, Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import formStyles from '@/components/ui/form.module.css';

type Profile = {
  id: string;
  email: string | null;
  name: string | null;
  created_at: string;
};

export default function UsuariosPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [notConfigured, setNotConfigured] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const supabase = createClient();

  const fetchProfiles = async () => {
    setLoading(true);
    setNotConfigured(false);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, name, created_at')
      .order('name', { ascending: true });

    if (error) {
      setNotConfigured(true);
      setProfiles([]);
    } else {
      setProfiles((data as Profile[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleOpen = (profile: Profile) => {
    setEditing(profile);
    setName(profile.name || '');
    setErrors({});
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditing(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setErrors({ name: 'Informe um nome.' });
      return;
    }
    setErrors({});
    setIsSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({ name: trimmed })
      .eq('id', editing.id);

    setIsSaving(false);
    if (error) {
      toast.error(error.message || 'Erro ao salvar o nome.');
      return;
    }
    toast.success('Nome atualizado com sucesso');
    handleClose();
    fetchProfiles();
  };

  const columns: Column<Profile>[] = [
    {
      header: 'Nome',
      accessorKey: 'name',
      cell: (row) => row.name || <span style={{ color: 'var(--foreground-muted)' }}>{row.email || '—'}</span>,
    },
    { header: 'Email', accessorKey: 'email', cell: (row) => row.email || '—' },
    {
      header: 'Ações',
      accessorKey: 'id',
      sortable: false,
      cell: (row) => (
        <button
          type="button"
          className={`${formStyles.btn} ${formStyles.btnSecondary}`}
          style={{ padding: '0.375rem 0.5rem' }}
          onClick={() => handleOpen(row)}
          aria-label={`Editar nome de ${row.name || row.email || 'usuário'}`}
          title="Editar nome"
        >
          <Edit2 size={16} />
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className={formStyles.pageHeader}>
        <h1 className={formStyles.pageTitle}>Usuários</h1>
      </div>

      {loading ? (
        <TableSkeleton columns={3} />
      ) : notConfigured ? (
        <div className="card" style={{ padding: '2rem' }}>
          <p style={{ marginBottom: '0.5rem', fontWeight: 600, color: 'var(--foreground)' }}>
            Usuários ainda não configurados.
          </p>
          <p style={{ fontSize: '0.9rem', color: 'var(--foreground-muted)' }}>
            Execute o script <code>docs/profiles.sql</code> uma única vez no SQL Editor do Supabase
            para liberar a edição de nomes de exibição. Depois, recarregue esta página.
          </p>
          <button
            type="button"
            className={`${formStyles.btn} ${formStyles.btnPrimary}`}
            style={{ marginTop: '1rem' }}
            onClick={fetchProfiles}
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          <div className="card" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--foreground-muted)' }}>
            Novos usuários são criados no Supabase (Authentication → Users). Aqui você define o
            <strong> nome de exibição</strong> que aparece na auditoria e no painel.
          </div>
          <Table data={profiles} columns={columns} searchKeys={['name', 'email']} emptyMessage="Nenhum usuário encontrado." />
        </>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleClose}
        title="Editar nome de exibição"
      >
        <form onSubmit={handleSave} className={formStyles.form}>
          <div className={formStyles.formGroup}>
            <label className={formStyles.label} htmlFor="name">Nome de exibição</label>
            <input
              type="text"
              id="name"
              className={formStyles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              aria-invalid={!!errors.name}
              autoFocus
            />
            {errors.name && <span className={formStyles.errorText} role="alert">{errors.name}</span>}
          </div>

          <div className={formStyles.formGroup}>
            <label className={formStyles.label} htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              className={formStyles.input}
              value={editing?.email || ''}
              disabled
              readOnly
            />
          </div>

          <div className={formStyles.actions}>
            <button
              type="button"
              className={`${formStyles.btn} ${formStyles.btnSecondary}`}
              onClick={handleClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`${formStyles.btn} ${formStyles.btnPrimary}`}
              disabled={isSaving}
            >
              {isSaving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
