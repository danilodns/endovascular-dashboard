'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Table, Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { procedureMaterialSchema, zodErrors } from '@/lib/validation';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import formStyles from '@/components/ui/form.module.css';

type Procedure = { id: number; name: string };
type Material = { id: number; name: string };

type ProcedureMaterial = {
  procedure_id: number;
  material_id: number;
  isoptional: boolean;
  procedure?: Procedure;
  material?: Material;
};

export default function ProcedureMaterialRelationsPage() {
  const [relations, setRelations] = useState<ProcedureMaterial[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);

  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Selection states
  const [selectedProcedureId, setSelectedProcedureId] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [isOptional, setIsOptional] = useState(false);

  // Filter states
  const [filterProcedure, setFilterProcedure] = useState('');
  const [filterMaterial, setFilterMaterial] = useState('');

  const [pendingDelete, setPendingDelete] = useState<ProcedureMaterial | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const supabase = createClient();

  const fetchDependencies = async () => {
    const [procRes, matRes] = await Promise.all([
      supabase.from('procedure').select('id, name').order('name'),
      supabase.from('material').select('id, name').order('name')
    ]);
    if (procRes.data) setProcedures(procRes.data);
    if (matRes.data) setMaterials(matRes.data);
  };

  const fetchRelations = async () => {
    setLoading(true);
    let query = supabase
      .from('procedure_material')
      .select(`
        procedure_id, material_id, isoptional,
        procedure(id, name),
        material(id, name)
      `);

    if (filterProcedure) query = query.eq('procedure_id', filterProcedure);
    if (filterMaterial) query = query.eq('material_id', filterMaterial);

    const { data, error } = await query;
    if (error) {
      toast.error('Erro ao buscar relacionamentos');
    } else {
      setRelations(data as unknown as ProcedureMaterial[] || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDependencies();
  }, []);

  useEffect(() => {
    fetchRelations();
  }, [filterProcedure, filterMaterial]);

  const handleOpenAddModal = () => {
    setIsEditMode(false);
    setSelectedProcedureId('');
    setSelectedMaterialId('');
    setIsOptional(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (row: ProcedureMaterial) => {
    setIsEditMode(true);
    setSelectedProcedureId(row.procedure_id.toString());
    setSelectedMaterialId(row.material_id.toString());
    setIsOptional(row.isoptional);
    setIsModalOpen(true);
  }

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setErrors({});
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = procedureMaterialSchema.safeParse({
      procedure_id: selectedProcedureId,
      material_id: selectedMaterialId,
    });
    if (!result.success) {
      setErrors(zodErrors(result.error));
      return;
    }
    setErrors({});
    setIsSaving(true);

    try {
      if (isEditMode) {
        const { error } = await supabase
          .from('procedure_material')
          .update({ isoptional: isOptional })
          .match({
            procedure_id: parseInt(selectedProcedureId),
            material_id: parseInt(selectedMaterialId)
          });
        if (error) throw error;
        toast.success('Relacionamento atualizado');
      } else {
        const { error } = await supabase
          .from('procedure_material')
          .insert([{
            procedure_id: parseInt(selectedProcedureId),
            material_id: parseInt(selectedMaterialId),
            isoptional: isOptional
          }]);

        if (error) {
          if (error.code === '23505') throw new Error('Este relacionamento já existe.');
          throw error;
        };
        toast.success('Relacionamento adicionado com sucesso');
      }
      handleCloseModal();
      fetchRelations();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar relacionamento');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (row: ProcedureMaterial) => {
    setPendingDelete(row);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const { error } = await supabase
      .from('procedure_material')
      .delete()
      .match({
        procedure_id: pendingDelete.procedure_id,
        material_id: pendingDelete.material_id
      });
    setDeleting(false);
    if (error) {
      toast.error('Erro ao excluir relacionamento.');
    } else {
      toast.success('Relacionamento removido');
      setPendingDelete(null);
      fetchRelations();
    }
  };

  const columns: Column<ProcedureMaterial>[] = [
    {
      header: 'Procedimento',
      accessorKey: 'procedure',
      cell: (row) => row.procedure?.name || '-'
    },
    {
      header: 'Material',
      accessorKey: 'material',
      cell: (row) => row.material?.name || '-'
    },
    {
      header: 'Opcional',
      accessorKey: 'isoptional',
      cell: (row) => (
        <span style={{
          padding: '0.25rem 0.5rem',
          borderRadius: '4px',
          fontSize: '0.75rem',
          fontWeight: 600,
          backgroundColor: row.isoptional
            ? 'color-mix(in srgb, var(--primary) 10%, transparent)'
            : 'var(--surface-color-hover)',
          color: row.isoptional ? 'var(--primary)' : 'var(--foreground-muted)'
        }}>
          {row.isoptional ? 'Sim' : 'Não'}
        </span>
      )
    },
    {
      header: 'Ações',
      accessorKey: 'procedure_id',
      sortable: false,
      cell: (row) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={`${formStyles.btn} ${formStyles.btnSecondary}`}
            style={{ padding: '0.375rem 0.5rem' }}
            onClick={() => handleOpenEditModal(row)}
            aria-label="Editar relacionamento"
            title="Editar"
          >
            <Edit2 size={16} />
          </button>
          <button
            className={`${formStyles.btn} ${formStyles.btnDanger}`}
            style={{ padding: '0.375rem 0.5rem' }}
            onClick={() => handleDelete(row)}
            aria-label="Remover relacionamento"
            title="Remover"
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
        <h1 className={formStyles.pageTitle}>Relações Procedimento ↔ Material</h1>
        <button
          className={`${formStyles.btn} ${formStyles.btnPrimary}`}
          onClick={handleOpenAddModal}
        >
          <Plus size={18} />
          <span>Adicionar Relação</span>
        </button>
      </div>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Filtrar Relações</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label className={formStyles.label} style={{ display: 'block', marginBottom: '0.5rem' }}>Filtrar por Procedimento</label>
            <select
              className={formStyles.select}
              value={filterProcedure}
              onChange={(e) => setFilterProcedure(e.target.value)}
            >
              <option value="">Todos os Procedimentos</option>
              {procedures.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label className={formStyles.label} style={{ display: 'block', marginBottom: '0.5rem' }}>Filtrar por Material</label>
            <select
              className={formStyles.select}
              value={filterMaterial}
              onChange={(e) => setFilterMaterial(e.target.value)}
            >
              <option value="">Todos os Materiais</option>
              {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <TableSkeleton columns={4} />
      ) : (
        <Table
          data={relations}
          columns={columns}
          searchable={false}
        />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={isEditMode ? 'Editar Relação' : 'Vincular Procedimento a Material'}
      >
        <form onSubmit={handleSave} className={formStyles.form}>
          <div className={formStyles.formGroup}>
            <label className={formStyles.label}>Procedimento</label>
            <select
              className={formStyles.select}
              value={selectedProcedureId}
              onChange={(e) => setSelectedProcedureId(e.target.value)}
              disabled={isEditMode}
              required
            >
              <option value="" disabled>Selecione o Procedimento</option>
              {procedures.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {errors.procedure_id && <span className={formStyles.errorText} role="alert">{errors.procedure_id}</span>}
          </div>

          <div className={formStyles.formGroup}>
            <label className={formStyles.label}>Material</label>
            <select
              className={formStyles.select}
              value={selectedMaterialId}
              onChange={(e) => setSelectedMaterialId(e.target.value)}
              disabled={isEditMode}
              required
            >
              <option value="" disabled>Selecione o Material</option>
              {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            {errors.material_id && <span className={formStyles.errorText} role="alert">{errors.material_id}</span>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
            <input
              type="checkbox"
              id="isoptional"
              checked={isOptional}
              onChange={(e) => setIsOptional(e.target.checked)}
              style={{ width: '1rem', height: '1rem', cursor: 'pointer' }}
            />
            <label htmlFor="isoptional" style={{ cursor: 'pointer', fontSize: '0.9rem', color: 'var(--foreground)' }}>
              Material Opcional (para este procedimento)
            </label>
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
              {isSaving ? 'Salvando...' : (isEditMode ? 'Salvar Alterações' : 'Adicionar Relação')}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Remover relacionamento"
        message="Tem certeza que deseja remover este relacionamento? Esta ação não pode ser desfeita."
        confirmLabel="Remover"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
