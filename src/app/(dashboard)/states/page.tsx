'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Table, Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { stateSchema, zodErrors } from '@/lib/validation';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import formStyles from '@/components/ui/form.module.css';

type State = {
  id: number;
  name: string;
  uf: string;
};

export default function StatesPage() {
  const [states, setStates] = useState<State[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingState, setEditingState] = useState<State | null>(null);
  const [name, setName] = useState('');
  const [uf, setUf] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<State | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const supabase = createClient();

  const fetchStates = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('state').select('*').order('name', { ascending: true });
    if (error) {
      toast.error('Erro ao buscar estados');
    } else {
      setStates(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStates();
  }, []);

  const handleOpenModal = (state?: State) => {
    if (state) {
      setEditingState(state);
      setName(state.name);
      setUf(state.uf || '');
    } else {
      setEditingState(null);
      setName('');
      setUf('');
    }
    setErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingState(null);
    setName('');
    setUf('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = stateSchema.safeParse({ name, uf });
    if (!result.success) {
      setErrors(zodErrors(result.error));
      return;
    }
    setErrors({});
    setIsSaving(true);

    try {
      if (editingState) {
        const { error } = await supabase
          .from('state')
          .update({ name, uf: uf.toUpperCase() })
          .eq('id', editingState.id);
        if (error) throw error;
        toast.success('Estado atualizado com sucesso');
      } else {
        const { error } = await supabase
          .from('state')
          .insert([{ name, uf: uf.toUpperCase() }]);
        if (error) throw error;
        toast.success('Estado criado com sucesso');
      }
      handleCloseModal();
      fetchStates();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar estado');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (state: State) => {
    setPendingDelete(state);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const { error } = await supabase.from('state').delete().eq('id', pendingDelete.id);
    setDeleting(false);
    if (error) {
      toast.error('Erro ao excluir estado. Pode estar em uso.');
    } else {
      toast.success('Estado excluído com sucesso');
      setPendingDelete(null);
      fetchStates();
    }
  };

  const columns: Column<State>[] = [
    { header: 'ID', accessorKey: 'id' },
    { header: 'Nome', accessorKey: 'name' },
    { header: 'UF', accessorKey: 'uf' },
    {
      header: 'Ações',
      accessorKey: 'id',
      sortable: false,
      cell: (row) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={`${formStyles.btn} ${formStyles.btnSecondary}`}
            style={{ padding: '0.375rem 0.5rem' }}
            onClick={() => handleOpenModal(row)}
            aria-label={`Editar ${row.name}`}
            title="Editar"
          >
            <Edit2 size={16} />
          </button>
          <button
            className={`${formStyles.btn} ${formStyles.btnDanger}`}
            style={{ padding: '0.375rem 0.5rem' }}
            onClick={() => handleDelete(row)}
            aria-label={`Excluir ${row.name}`}
            title="Excluir"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div>
      <div className={formStyles.pageHeader}>
        <h1 className={formStyles.pageTitle}>Estados</h1>
        <button
          className={`${formStyles.btn} ${formStyles.btnPrimary}`}
          onClick={() => handleOpenModal()}
        >
          <Plus size={18} />
          <span>Adicionar Novo</span>
        </button>
      </div>

      {loading ? (
        <TableSkeleton columns={4} />
      ) : (
        <Table
          data={states}
          columns={columns}
          searchKeys={['name', 'uf']}
        />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingState ? 'Editar Estado' : 'Adicionar Novo Estado'}
      >
        <form onSubmit={handleSave} className={formStyles.form}>
          <div className={formStyles.formGroup}>
            <label className={formStyles.label} htmlFor="name">Nome do Estado</label>
            <input
              type="text"
              id="name"
              className={formStyles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              aria-invalid={!!errors.name}
              placeholder="ex. São Paulo"
            />
            {errors.name && <span className={formStyles.errorText} role="alert">{errors.name}</span>}
          </div>

          <div className={formStyles.formGroup}>
            <label className={formStyles.label} htmlFor="uf">UF (Sigla)</label>
            <input
              type="text"
              id="uf"
              className={formStyles.input}
              value={uf}
              onChange={(e) => setUf(e.target.value)}
              required
              maxLength={2}
              placeholder="ex. SP"
              style={{ textTransform: 'uppercase' }}
              aria-invalid={!!errors.uf}
            />
            {errors.uf && <span className={formStyles.errorText} role="alert">{errors.uf}</span>}
          </div>

          <div className={formStyles.actions}>
            <button
              type="button"
              className={`${formStyles.btn} ${formStyles.btnSecondary}`}
              onClick={handleCloseModal}
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

      <ConfirmDialog
        open={!!pendingDelete}
        title="Excluir estado"
        message="Tem certeza que deseja excluir este estado? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
