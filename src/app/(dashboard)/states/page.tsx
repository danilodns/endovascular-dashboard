'use client';

import { useState } from 'react';
import { Table, Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { stateSchema } from '@/lib/validation';
import { useCrud } from '@/lib/useCrud';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import formStyles from '@/components/ui/form.module.css';

type State = {
  id: number;
  name: string;
  uf: string;
};

export default function StatesPage() {
  const crud = useCrud<State>('state', stateSchema, {
    singular: 'estado', plural: 'estados', gender: 'o',
  }, { column: 'name', ascending: true });
  const [name, setName] = useState('');
  const [uf, setUf] = useState('');
  const [copyFrom, setCopyFrom] = useState('');

  const handleOpenModal = (state?: State) => {
    crud.openModal(state);
    setName(state?.name ?? '');
    setUf(state?.uf ?? '');
    if (!state) setCopyFrom('');
  };

  const handleCloseModal = () => {
    crud.closeModal();
    setName('');
    setUf('');
    setCopyFrom('');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    crud.save({ name, uf: uf.toUpperCase() }, async (newState) => {
      if (!copyFrom) {
        toast.success('Estado criado com sucesso');
        return;
      }
      const { data: relations, error: relError } = await crud.supabase
        .from('material_seller')
        .select('seller_id, material_id')
        .eq('state_id', Number(copyFrom));
      if (relError) throw relError;

      if (relations && relations.length > 0) {
        const { error: insertError } = await crud.supabase
          .from('material_seller')
          .insert(relations.map((r) => ({ ...r, state_id: newState.id })));
        if (insertError) throw insertError;
        toast.success(`Estado criado com sucesso (${relations.length} vínculos copiados)`);
      } else {
        toast.success('Estado criado com sucesso (nenhum dado para copiar)');
      }
    });
  };

  const columns: Column<State>[] = [
    { header: 'ID', accessorKey: 'id', width: '4rem' },
    { header: 'Nome', accessorKey: 'name' },
    { header: 'UF', accessorKey: 'uf', width: '6rem' },
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
        <h1 className={formStyles.pageTitle}>Estados</h1>
        <button
          className={`${formStyles.btn} ${formStyles.btnPrimary}`}
          onClick={() => handleOpenModal()}
        >
          <Plus size={18} />
          <span>Adicionar Novo</span>
        </button>
      </div>

      {crud.loading ? (
        <TableSkeleton columns={4} />
      ) : (
        <Table
          data={crud.rows}
          columns={columns}
          searchKeys={['name', 'uf']}
        />
      )}

      <Modal
        isOpen={crud.isModalOpen}
        onClose={handleCloseModal}
        title={crud.editing ? 'Editar Estado' : 'Adicionar Novo Estado'}
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
              aria-invalid={!!crud.errors.name}
              placeholder="ex. São Paulo"
            />
            {crud.errors.name && <span className={formStyles.errorText} role="alert">{crud.errors.name}</span>}
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
              aria-invalid={!!crud.errors.uf}
            />
            {crud.errors.uf && <span className={formStyles.errorText} role="alert">{crud.errors.uf}</span>}
          </div>

          {!crud.editing && (
            <div className={formStyles.formGroup}>
              <label className={formStyles.label} htmlFor="copyFrom">Copiar dados de outro estado (opcional)</label>
              <select
                id="copyFrom"
                className={formStyles.input}
                value={copyFrom}
                onChange={(e) => setCopyFrom(e.target.value)}
              >
                <option value="">Não copiar</option>
                {crud.rows.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.uf})</option>
                ))}
              </select>
              <small>Copia os representantes e materiais vinculados ao estado selecionado.</small>
            </div>
          )}

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
