'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Table, Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { brandSchema } from '@/lib/validation';
import { useCrud } from '@/lib/useCrud';
import { Plus, Edit2, Trash2, Boxes, ChevronDown, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import formStyles from '@/components/ui/form.module.css';

type Brand = {
  id: number;
  name: string;
};

type BrandMaterial = {
  id: number;
  name: string;
  material_type_id: number | null;
  material_type?: { id: number; name: string } | null;
};

/** "acme corp" → "Acme Corp" (exibe o nome capitalizado; não altera o dado). */
const capitalize = (s: string) =>
  s.toLowerCase().replace(/(^|\s|[-'(])(\p{L})/gu, (_, p, c) => p + c.toUpperCase());

export default function BrandsPage() {
  const crud = useCrud<Brand>('brand', brandSchema, {
    singular: 'marca', plural: 'marcas', gender: 'a',
  });
  const [name, setName] = useState('');

  // Materials modal
  const [materialsBrand, setMaterialsBrand] = useState<Brand | null>(null);
  const [brandMaterials, setBrandMaterials] = useState<BrandMaterial[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [collapsedTypes, setCollapsedTypes] = useState<Set<number>>(new Set());

  const supabase = createClient();

  const handleOpenModal = (brand?: Brand) => {
    crud.openModal(brand);
    setName(brand?.name ?? '');
  };

  const handleCloseModal = () => {
    crud.closeModal();
    setName('');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    crud.save({ name });
  };

  const handleOpenMaterials = async (brand: Brand) => {
    setMaterialsBrand(brand);
    setCollapsedTypes(new Set());
    setMaterialsLoading(true);
    const { data, error } = await supabase
      .from('material')
      .select('id, name, material_type_id, material_type(id, name)')
      .eq('brand_id', brand.id)
      .order('name');
    if (error) {
      toast.error('Erro ao buscar materiais da marca');
    } else {
      const materials = (data as unknown as BrandMaterial[]) || [];
      setBrandMaterials(materials);
      // todos os grupos colapsados por padrão
      setCollapsedTypes(new Set(materials.map((m) => m.material_type_id ?? 0)));
    }
    setMaterialsLoading(false);
  };

  const handleCloseMaterials = () => {
    setMaterialsBrand(null);
    setBrandMaterials([]);
  };

  const toggleTypeGroup = (typeId: number) => {
    setCollapsedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(typeId)) next.delete(typeId);
      else next.add(typeId);
      return next;
    });
  };

  const columns: Column<Brand>[] = [
    { header: 'ID', accessorKey: 'id', width: '4rem' },
    { header: 'Nome', accessorKey: 'name', cell: (row) => capitalize(row.name) },
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
        <h1 className={formStyles.pageTitle}>Marcas</h1>
        <button
          className={`${formStyles.btn} ${formStyles.btnPrimary}`}
          onClick={() => handleOpenModal()}
        >
          <Plus size={18} />
          <span>Adicionar Nova</span>
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
        title={crud.editing ? 'Editar Marca' : 'Adicionar Nova Marca'}
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
              placeholder="ex. Acme Corp"
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

      <Modal
        isOpen={!!materialsBrand}
        onClose={handleCloseMaterials}
        title={`Lista de Materiais - ${capitalize(materialsBrand?.name ?? '')}`}
      >
        <div
          className={formStyles.formGroup}
          style={{ maxHeight: '50vh', overflowY: 'auto' }}
        >
          {materialsLoading ? (
            <p>Carregando...</p>
          ) : brandMaterials.length === 0 ? (
            <p style={{ color: 'var(--foreground-muted)' }}>Nenhum material vinculado a esta marca.</p>
          ) : (
            Object.entries(
              brandMaterials.reduce<Record<string, { key: number; label: string; names: string[] }>>((acc, m) => {
                const key = String(m.material_type_id ?? 0);
                acc[key] ??= { key: m.material_type_id ?? 0, label: capitalize(m.material_type?.name || 'Sem tipo'), names: [] };
                acc[key].names.push(capitalize(m.name));
                return acc;
              }, {})
            ).map(([key, group]) => {
              const collapsed = collapsedTypes.has(group.key);
              return (
                <div key={key} style={{ marginBottom: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => toggleTypeGroup(group.key)}
                    aria-expanded={!collapsed}
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
                    {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                    {group.label}
                    <span style={{ fontWeight: 400, color: 'var(--foreground-muted)' }}>
                      ({group.names.length})
                    </span>
                  </button>
                  <div style={{ display: collapsed ? 'none' : 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    {group.names.map((name) => (
                      <div
                        key={name}
                        style={{
                          padding: '0.375rem 0.625rem',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                        }}
                      >
                        {name}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Modal>

      <ConfirmDialog {...crud.confirm} />
    </div>
  );
}
