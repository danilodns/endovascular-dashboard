'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Table, Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { procedureSchema, zodErrors } from '@/lib/validation';
import { Plus, Edit2, Trash2, Boxes, X, ChevronDown, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import formStyles from '@/components/ui/form.module.css';

type Procedure = {
  id: number;
  name: string;
};

type MaterialRef = { id: number; name: string };
type ProcedureMaterial = {
  material_id: number;
  isoptional: boolean;
  material?: MaterialRef;
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

  // Materials modal
  const [materialsProcedure, setMaterialsProcedure] = useState<Procedure | null>(null);
  const [materials, setMaterials] = useState<MaterialRef[]>([]);
  const [procMaterials, setProcMaterials] = useState<ProcedureMaterial[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [matMaterialId, setMatMaterialId] = useState('');
  const [matIsOptional, setMatIsOptional] = useState(false);
  const [isMatSaving, setIsMatSaving] = useState(false);
  const [removingMatId, setRemovingMatId] = useState<number | null>(null);
  const [collapsedRequired, setCollapsedRequired] = useState(false);
  const [collapsedOptional, setCollapsedOptional] = useState(false);
  const [matError, setMatError] = useState('');

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
    supabase.from('material').select('id, name').order('name')
      .then(({ data }) => data && setMaterials(data));
  }, []);

  const fetchProcMaterials = async (procedureId: number) => {
    setMaterialsLoading(true);
    const { data, error } = await supabase
      .from('procedure_material')
      .select('material_id, isoptional, material(id, name)')
      .eq('procedure_id', procedureId);
    if (error) {
      toast.error('Erro ao buscar materiais do procedimento');
    } else {
      setProcMaterials(data as unknown as ProcedureMaterial[] || []);
    }
    setMaterialsLoading(false);
  };

  const handleOpenMaterials = (procedure: Procedure) => {
    setMaterialsProcedure(procedure);
    setMatMaterialId('');
    setMatIsOptional(false);
    setMatError('');
    setCollapsedRequired(false);
    setCollapsedOptional(false);
    fetchProcMaterials(procedure.id);
  };

  const handleCloseMaterials = () => {
    setMaterialsProcedure(null);
    setProcMaterials([]);
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialsProcedure) return;
    if (!matMaterialId) {
      setMatError('Selecione o material.');
      return;
    }
    setMatError('');
    setIsMatSaving(true);
    try {
      const { error } = await supabase.from('procedure_material').insert([{
        procedure_id: materialsProcedure.id,
        material_id: parseInt(matMaterialId),
        isoptional: matIsOptional,
      }]);
      if (error) {
        if (error.code === '23505') throw new Error('Este material já está vinculado a este procedimento.');
        throw error;
      }
      toast.success('Material adicionado com sucesso');
      setMatMaterialId('');
      setMatIsOptional(false);
      fetchProcMaterials(materialsProcedure.id);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao adicionar material');
    } finally {
      setIsMatSaving(false);
    }
  };

  const handleToggleOptional = async (m: ProcedureMaterial) => {
    if (!materialsProcedure) return;
    const next = !m.isoptional;
    setProcMaterials((prev) => prev.map((x) => x.material_id === m.material_id ? { ...x, isoptional: next } : x));
    const { error } = await supabase
      .from('procedure_material')
      .update({ isoptional: next })
      .match({ procedure_id: materialsProcedure.id, material_id: m.material_id });
    if (error) {
      setProcMaterials((prev) => prev.map((x) => x.material_id === m.material_id ? { ...x, isoptional: m.isoptional } : x));
      toast.error('Erro ao atualizar material.');
    } else {
      toast.success(next ? 'Material marcado como opcional' : 'Material marcado como obrigatório');
    }
  };

  const handleRemoveMaterial = async (m: ProcedureMaterial) => {
    if (!materialsProcedure) return;
    setRemovingMatId(m.material_id);
    const { error } = await supabase
      .from('procedure_material')
      .delete()
      .match({ procedure_id: materialsProcedure.id, material_id: m.material_id });
    setRemovingMatId(null);
    if (error) {
      toast.error('Erro ao remover material.');
    } else {
      toast.success('Material removido');
      setProcMaterials((prev) => prev.filter((x) => x.material_id !== m.material_id));
    }
  };

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
    { header: 'ID', accessorKey: 'id', width: '4rem' },
    { header: 'Nome', accessorKey: 'name' },
    {
      header: 'Ações',
      accessorKey: 'id',
      sortable: false,
      align: 'center',
      width: '12rem',
      cell: (row) => (
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button
            className={`${formStyles.btn} ${formStyles.btnSecondary}`}
            style={{ padding: '0.375rem 0.5rem' }}
            onClick={() => handleOpenMaterials(row)}
            aria-label={`Materiais de ${row.name}`}
            title="Materiais"
          >
            <Boxes size={16} />
          </button>
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

      <Modal
        isOpen={!!materialsProcedure}
        onClose={handleCloseMaterials}
        title={`Materiais — ${materialsProcedure?.name ?? ''}`}
      >
        <div className={formStyles.form}>
          <form onSubmit={handleAddMaterial} className={formStyles.formGroup}>
            <label className={formStyles.label} style={{ display: 'block', marginBottom: '0.5rem' }}>Adicionar material</label>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                className={formStyles.select}
                value={matMaterialId}
                onChange={(e) => setMatMaterialId(e.target.value)}
                aria-label="Material"
                style={{ flex: '1', minWidth: '200px' }}
              >
                <option value="" disabled>Material</option>
                {materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                <input
                  type="checkbox"
                  checked={matIsOptional}
                  onChange={(e) => setMatIsOptional(e.target.checked)}
                />
                Opcional
              </label>
              <button
                type="submit"
                className={`${formStyles.btn} ${formStyles.btnPrimary}`}
                disabled={isMatSaving}
              >
                {isMatSaving ? 'Adicionando...' : 'Adicionar'}
              </button>
            </div>
            {matError && <span className={formStyles.errorText} role="alert">{matError}</span>}
          </form>

          <div
            className={formStyles.formGroup}
            style={{
              borderTop: '1px solid var(--border-color)',
              paddingTop: '1rem',
              maxHeight: '50vh',
              overflowY: 'auto',
            }}
          >
            {materialsLoading ? (
              <p>Carregando...</p>
            ) : procMaterials.length === 0 ? (
              <p style={{ color: 'var(--foreground-muted)' }}>Nenhum material vinculado a este procedimento.</p>
            ) : (
              [
                { label: 'Obrigatórios', items: procMaterials.filter((m) => !m.isoptional), collapsed: collapsedRequired, toggle: () => setCollapsedRequired((v) => !v) },
                { label: 'Opcionais', items: procMaterials.filter((m) => m.isoptional), collapsed: collapsedOptional, toggle: () => setCollapsedOptional((v) => !v) },
              ].map((section) => (
                <div key={section.label} style={{ marginBottom: '1rem' }}>
                  <button
                    type="button"
                    onClick={section.toggle}
                    aria-expanded={!section.collapsed}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: 'inherit',
                      font: 'inherit',
                      fontWeight: 700,
                      cursor: 'pointer',
                      marginBottom: '0.375rem',
                    }}
                  >
                    {section.collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                    {section.label}
                    <span style={{ fontWeight: 400, color: 'var(--foreground-muted)' }}>
                      ({section.items.length})
                    </span>
                  </button>
                  <div style={{ display: section.collapsed ? 'none' : 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    {[...section.items]
                      .sort((a, b) => (a.material?.name ?? '').localeCompare(b.material?.name ?? ''))
                      .map((m) => (
                        <div
                          key={m.material_id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.5rem',
                            padding: '0.375rem 0.625rem',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                          }}
                        >
                          <span>{m.material?.name}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <button
                              type="button"
                              className={`${formStyles.btn} ${formStyles.btnSecondary}`}
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                              onClick={() => handleToggleOptional(m)}
                              aria-label={m.isoptional ? `Marcar ${m.material?.name} como obrigatório` : `Marcar ${m.material?.name} como opcional`}
                            >
                              {m.isoptional ? 'Tornar obrigatório' : 'Tornar opcional'}
                            </button>
                            <button
                              type="button"
                              className={`${formStyles.btn} ${formStyles.btnDanger}`}
                              style={{ padding: '0.25rem 0.375rem' }}
                              disabled={removingMatId === m.material_id}
                              onClick={() => handleRemoveMaterial(m)}
                              aria-label={`Remover ${m.material?.name}`}
                              title="Remover vínculo"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
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
