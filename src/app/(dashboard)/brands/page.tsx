'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Table, Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { brandSchema, zodErrors } from '@/lib/validation';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import formStyles from '@/components/ui/form.module.css';

type Brand = {
  id: number;
  name: string;
};

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<Brand | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const supabase = createClient();

  const fetchBrands = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('brand').select('*').order('id', { ascending: false });
    if (error) {
      toast.error('Erro ao buscar marcas');
    } else {
      setBrands(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const handleOpenModal = (brand?: Brand) => {
    if (brand) {
      setEditingBrand(brand);
      setName(brand.name);
    } else {
      setEditingBrand(null);
      setName('');
    }
    setErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBrand(null);
    setName('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = brandSchema.safeParse({ name });
    if (!result.success) {
      setErrors(zodErrors(result.error));
      return;
    }
    setErrors({});
    setIsSaving(true);

    try {
      if (editingBrand) {
        const { error } = await supabase
          .from('brand')
          .update({ name })
          .eq('id', editingBrand.id);
        if (error) throw error;
        toast.success('Marca atualizada com sucesso');
      } else {
        const { error } = await supabase
          .from('brand')
          .insert([{ name }]);
        if (error) throw error;
        toast.success('Marca criada com sucesso');
      }
      handleCloseModal();
      fetchBrands();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar marca');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (brand: Brand) => {
    setPendingDelete(brand);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const { error } = await supabase.from('brand').delete().eq('id', pendingDelete.id);
    setDeleting(false);
    if (error) {
      toast.error('Erro ao excluir a marca. Pode estar em uso.');
    } else {
      toast.success('Marca excluída com sucesso');
      setPendingDelete(null);
      fetchBrands();
    }
  };

  const columns: Column<Brand>[] = [
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
        <h1 className={formStyles.pageTitle}>Marcas</h1>
        <button
          className={`${formStyles.btn} ${formStyles.btnPrimary}`}
          onClick={() => handleOpenModal()}
        >
          <Plus size={18} />
          <span>Adicionar Nova</span>
        </button>
      </div>

      {loading ? (
        <TableSkeleton columns={3} />
      ) : (
        <Table
          data={brands}
          columns={columns}
          searchKeys={['name', 'id']}
        />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingBrand ? 'Editar Marca' : 'Adicionar Nova Marca'}
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
              placeholder="ex. Acme Corp"
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
        title="Excluir marca"
        message="Tem certeza que deseja excluir esta marca? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
