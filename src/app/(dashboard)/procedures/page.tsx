'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Table, Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { procedureSchema, zodErrors } from '@/lib/validation';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import formStyles from '@/components/ui/form.module.css';

type Procedure = {
  id: number;
  name: string;
};

export default function ProceduresPage() {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProcedure, setEditingProcedure] = useState<Procedure | null>(null);
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<Procedure | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const supabase = createClient();

  const fetchProcedures = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('procedure').select('*').order('id', { ascending: false });
    if (error) {
      toast.error('Erro ao buscar procedimentos');
    } else {
      setProcedures(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProcedures();
  }, []);

  const handleOpenModal = (procedure?: Procedure) => {
    if (procedure) {
      setEditingProcedure(procedure);
      setName(procedure.name);
    } else {
      setEditingProcedure(null);
      setName('');
    }
    setErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProcedure(null);
    setName('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = procedureSchema.safeParse({ name });
    if (!result.success) {
      setErrors(zodErrors(result.error));
      return;
    }
    setErrors({});
    setIsSaving(true);

    try {
      if (editingProcedure) {
        const { error } = await supabase
          .from('procedure')
          .update({ name })
          .eq('id', editingProcedure.id);
        if (error) throw error;
        toast.success('Procedimento atualizado com sucesso');
      } else {
        const { error } = await supabase
          .from('procedure')
          .insert([{ name }]);
        if (error) throw error;
        toast.success('Procedimento criado com sucesso');
      }
      handleCloseModal();
      fetchProcedures();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar procedimento');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (procedure: Procedure) => {
    setPendingDelete(procedure);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const { error } = await supabase.from('procedure').delete().eq('id', pendingDelete.id);
    setDeleting(false);
    if (error) {
      toast.error('Erro ao excluir procedimento. Pode estar em uso.');
    } else {
      toast.success('Procedimento excluído com sucesso');
      setPendingDelete(null);
      fetchProcedures();
    }
  };

  const columns: Column<Procedure>[] = [
    { header: 'ID', accessorKey: 'id' },
    { header: 'Nome', accessorKey: 'name' },
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
        <h1 className={formStyles.pageTitle}>Procedimentos</h1>
        <button
          className={`${formStyles.btn} ${formStyles.btnPrimary}`}
          onClick={() => handleOpenModal()}
        >
          <Plus size={18} />
          <span>Adicionar Novo</span>
        </button>
      </div>

      {loading ? (
        <TableSkeleton columns={3} />
      ) : (
        <Table
          data={procedures}
          columns={columns}
          searchKeys={['name', 'id']}
        />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingProcedure ? 'Editar Procedimento' : 'Adicionar Novo Procedimento'}
      >
        <form onSubmit={handleSave} className={formStyles.form}>
          <div className={formStyles.formGroup}>
            <label className={formStyles.label} htmlFor="name">Nome</label>
            <input
              type="text"
              id="name"
              className={formStyles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              aria-invalid={!!errors.name}
            />
            {errors.name && <span className={formStyles.errorText} role="alert">{errors.name}</span>}
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
        title="Excluir procedimento"
        message="Tem certeza que deseja excluir este procedimento? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
