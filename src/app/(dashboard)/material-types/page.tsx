'use client';

import { useState } from 'react';
import { useCrud } from '@/lib/useCrud';
import { Table, Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { materialTypeSchema } from '@/lib/validation';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import formStyles from '@/components/ui/form.module.css';

type MaterialType = {
  id: number;
  name: string;
};

export default function MaterialTypesPage() {
  const crud = useCrud<MaterialType>('material_type', materialTypeSchema, {
    singular: 'tipo de material', plural: 'tipos de materiais', gender: 'o',
  });
  const [name, setName] = useState('');

  const handleOpenModal = (type?: MaterialType) => {
    crud.openModal(type);
    setName(type?.name ?? '');
  };

  const handleCloseModal = () => {
    crud.closeModal();
    setName('');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    crud.save({ name });
  };

  const columns: Column<MaterialType>[] = [
    { header: 'ID', accessorKey: 'id', width: '4rem' },
    { header: 'Nome', accessorKey: 'name' },
    {
      header: 'Ações',
      accessorKey: 'id',
      sortable: false,
      align: 'center',
      width: '9rem',
      cell: (row) => (
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
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
            onClick={() => crud.requestDelete(row)}
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
        <h1 className={formStyles.pageTitle}>Tipos de Material</h1>
        <button
          className={`${formStyles.btn} ${formStyles.btnPrimary}`}
          onClick={() => handleOpenModal()}
        >
          <Plus size={18} />
          <span>Adicionar Novo</span>
        </button>
      </div>

      {crud.loading ? (
        <TableSkeleton columns={3} />
      ) : (
        <Table
          data={crud.rows}
          columns={columns}
          searchKeys={['name', 'id']}
        />
      )}

      <Modal
        isOpen={crud.isModalOpen}
        onClose={handleCloseModal}
        title={crud.editing ? 'Editar Tipo de Material' : 'Adicionar Novo Tipo'}
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
              aria-invalid={!!crud.errors.name}
              placeholder="ex. Catálogo"
            />
            {crud.errors.name && <span className={formStyles.errorText} role="alert">{crud.errors.name}</span>}
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
              disabled={crud.saving}
            >
              {crud.saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog {...crud.confirm} />
    </div>
  );
}
