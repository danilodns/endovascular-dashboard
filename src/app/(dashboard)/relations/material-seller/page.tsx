'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Table, Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { materialSellerSchema, zodErrors } from '@/lib/validation';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import formStyles from '@/components/ui/form.module.css';

type State = { id: number; name: string; uf: string };
type Seller = { id: number; name: string };
type Material = { id: number; name: string };

type MaterialSeller = {
  state_id: number;
  seller_id: number;
  material_id: number;
  state?: State;
  seller?: Seller;
  material?: Material;
};

export default function MaterialSellerRelationsPage() {
  const [relations, setRelations] = useState<MaterialSeller[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);

  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Selection states
  const [selectedStateId, setSelectedStateId] = useState('');
  const [selectedSellerId, setSelectedSellerId] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState('');

  // Filter states
  const [filterState, setFilterState] = useState('');
  const [filterSeller, setFilterSeller] = useState('');

  const [pendingDelete, setPendingDelete] = useState<MaterialSeller | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const supabase = createClient();

  const fetchDependencies = async () => {
    const [statesRes, sellersRes, materialsRes] = await Promise.all([
      supabase.from('state').select('id, name, uf').order('name'),
      supabase.from('seller').select('id, name').order('name'),
      supabase.from('material').select('id, name').order('name')
    ]);
    if (statesRes.data) setStates(statesRes.data);
    if (sellersRes.data) setSellers(sellersRes.data);
    if (materialsRes.data) setMaterials(materialsRes.data);
  };

  const fetchRelations = async () => {
    setLoading(true);
    let query = supabase
      .from('material_seller')
      .select(`
        state_id, seller_id, material_id,
        state(id, name, uf),
        seller(id, name),
        material(id, name)
      `);

    if (filterState) query = query.eq('state_id', filterState);
    if (filterSeller) query = query.eq('seller_id', filterSeller);

    const { data, error } = await query;
    if (error) {
      toast.error('Erro ao buscar relacionamentos');
    } else {
      setRelations(data as unknown as MaterialSeller[] || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDependencies();
  }, []);

  useEffect(() => {
    fetchRelations();
  }, [filterState, filterSeller]);

  const handleOpenModal = () => {
    setSelectedStateId('');
    setSelectedSellerId('');
    setSelectedMaterialId('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setErrors({});
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = materialSellerSchema.safeParse({
      state_id: selectedStateId,
      seller_id: selectedSellerId,
      material_id: selectedMaterialId,
    });
    if (!result.success) {
      setErrors(zodErrors(result.error));
      return;
    }
    setErrors({});
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('material_seller')
        .insert([{
          state_id: parseInt(selectedStateId),
          seller_id: parseInt(selectedSellerId),
          material_id: parseInt(selectedMaterialId)
        }]);

      if (error) {
        if (error.code === '23505') {
          throw new Error('Este relacionamento já existe.');
        }
        throw error;
      };

      toast.success('Relacionamento adicionado com sucesso');
      handleCloseModal();
      fetchRelations();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar relacionamento');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (row: MaterialSeller) => {
    setPendingDelete(row);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const { error } = await supabase
      .from('material_seller')
      .delete()
      .match({
        state_id: pendingDelete.state_id,
        seller_id: pendingDelete.seller_id,
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

  const columns: Column<MaterialSeller>[] = [
    {
      header: 'Estado',
      accessorKey: 'state',
      cell: (row) => row.state ? `${row.state.name} (${row.state.uf})` : '-'
    },
    {
      header: 'Representante',
      accessorKey: 'seller',
      cell: (row) => row.seller?.name || '-'
    },
    {
      header: 'Material',
      accessorKey: 'material',
      cell: (row) => row.material?.name || '-'
    },
    {
      header: 'Ação',
      accessorKey: 'state_id', // dummy key
      sortable: false,
      cell: (row) => (
        <button
          className={`${formStyles.btn} ${formStyles.btnDanger}`}
          style={{ padding: '0.375rem 0.5rem' }}
          onClick={() => handleDelete(row)}
          aria-label="Remover relacionamento"
          title="Remover Relacionamento"
        >
          <Trash2 size={16} />
        </button>
      )
    }
  ];

  return (
    <div>
      <div className={formStyles.pageHeader}>
        <h1 className={formStyles.pageTitle}>Relações Material ↔ Representante</h1>
        <button
          className={`${formStyles.btn} ${formStyles.btnPrimary}`}
          onClick={handleOpenModal}
        >
          <Plus size={18} />
          <span>Adicionar Relação</span>
        </button>
      </div>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Filtrar Relações</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label className={formStyles.label} style={{ display: 'block', marginBottom: '0.5rem' }}>Filtrar por Estado</label>
            <select
              className={formStyles.select}
              value={filterState}
              onChange={(e) => setFilterState(e.target.value)}
            >
              <option value="">Todos os Estados</option>
              {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label className={formStyles.label} style={{ display: 'block', marginBottom: '0.5rem' }}>Filtrar por Representante</label>
            <select
              className={formStyles.select}
              value={filterSeller}
              onChange={(e) => setFilterSeller(e.target.value)}
            >
              <option value="">Todos os Representantes</option>
              {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
        title="Vincular Material a um Representante em um Estado"
      >
        <form onSubmit={handleSave} className={formStyles.form}>
          <div className={formStyles.formGroup}>
            <label className={formStyles.label}>Estado</label>
            <select
              className={formStyles.select}
              value={selectedStateId}
              onChange={(e) => setSelectedStateId(e.target.value)}
              required
            >
              <option value="" disabled>Selecione o Estado</option>
              {states.map(s => <option key={s.id} value={s.id}>{s.name} ({s.uf})</option>)}
            </select>
            {errors.state_id && <span className={formStyles.errorText} role="alert">{errors.state_id}</span>}
          </div>
          <div className={formStyles.formGroup}>
            <label className={formStyles.label}>Representante</label>
            <select
              className={formStyles.select}
              value={selectedSellerId}
              onChange={(e) => setSelectedSellerId(e.target.value)}
              required
            >
              <option value="" disabled>Selecione o Representante</option>
              {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {errors.seller_id && <span className={formStyles.errorText} role="alert">{errors.seller_id}</span>}
          </div>
          <div className={formStyles.formGroup}>
            <label className={formStyles.label}>Material</label>
            <select
              className={formStyles.select}
              value={selectedMaterialId}
              onChange={(e) => setSelectedMaterialId(e.target.value)}
              required
            >
              <option value="" disabled>Selecione o Material</option>
              {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            {errors.material_id && <span className={formStyles.errorText} role="alert">{errors.material_id}</span>}
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
              {isSaving ? 'Adicionando...' : 'Adicionar Relação'}
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
