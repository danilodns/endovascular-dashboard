'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Table, Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { materialSchema, zodErrors } from '@/lib/validation';
import { Uploader } from '@/components/ui/Uploader';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import formStyles from '@/components/ui/form.module.css';

type Brand = { id: number; name: string };
type MaterialType = { id: number; name: string };
type Material = {
  id: number;
  name: string;
  description: string | null;
  brochure_url: string | null;
  brand_id: number | null;
  material_type_id: number | null;
  brand?: Brand;
  material_type?: MaterialType;
  created_at: string;
};

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [types, setTypes] = useState<MaterialType[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<Material | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [brandId, setBrandId] = useState('');
  const [typeId, setTypeId] = useState('');
  const [brochureUrl, setBrochureUrl] = useState('');

  const supabase = createClient();

  const fetchDependencies = async () => {
    const [brandsRes, typesRes] = await Promise.all([
      supabase.from('brand').select('*').order('name'),
      supabase.from('material_type').select('*').order('name')
    ]);
    if (brandsRes.data) setBrands(brandsRes.data);
    if (typesRes.data) setTypes(typesRes.data);
  };

  const fetchMaterials = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('material')
      .select('*, brand(*), material_type(*)')
      .order('id', { ascending: false });

    if (error) {
      toast.error('Erro ao buscar materiais');
    } else {
      setMaterials(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDependencies();
    fetchMaterials();
  }, []);

  const handleOpenModal = (material?: Material) => {
    if (material) {
      setEditingMaterial(material);
      setName(material.name);
      setDescription(material.description || '');
      setBrandId(material.brand_id?.toString() || '');
      setTypeId(material.material_type_id?.toString() || '');
      setBrochureUrl(material.brochure_url || '');
    } else {
      setEditingMaterial(null);
      setName('');
      setDescription('');
      setBrandId('');
      setTypeId('');
      setBrochureUrl('');
    }
    setErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMaterial(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = materialSchema.safeParse({ name });
    if (!result.success) {
      setErrors(zodErrors(result.error));
      return;
    }
    setErrors({});
    setIsSaving(true);

    const payload = {
      name,
      description: description || null,
      brand_id: brandId ? parseInt(brandId) : null,
      material_type_id: typeId ? parseInt(typeId) : null,
      brochure_url: brochureUrl || null,
    };

    try {
      if (editingMaterial) {
        const { error } = await supabase
          .from('material')
          .update(payload)
          .eq('id', editingMaterial.id);
        if (error) throw error;
        toast.success('Material atualizado com sucesso');
      } else {
        const { error } = await supabase
          .from('material')
          .insert([payload]);
        if (error) throw error;
        toast.success('Material criado com sucesso');
      }
      handleCloseModal();
      fetchMaterials();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar material');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (material: Material) => {
    setPendingDelete(material);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const { error } = await supabase.from('material').delete().eq('id', pendingDelete.id);
    setDeleting(false);
    if (error) {
      toast.error('Erro ao excluir material.');
    } else {
      if (pendingDelete.brochure_url) {
        const pathParts = pendingDelete.brochure_url.split('/public/Brochure/');
        if (pathParts.length > 1) {
          await supabase.storage.from('Brochure').remove([pathParts[1]]);
        }
      }
      toast.success('Material excluído com sucesso');
      setPendingDelete(null);
      fetchMaterials();
    }
  };

  const selectedBrand = brands.find(b => b.id.toString() === brandId);
  const brandFolder = selectedBrand ? selectedBrand.name : 'unbranded';

  const columns: Column<Material>[] = [
    { header: 'ID', accessorKey: 'id' },
    { header: 'Nome', accessorKey: 'name' },
    {
      header: 'Marca',
      accessorKey: 'brand_id',
      cell: (row) => row.brand?.name || '-'
    },
    {
      header: 'Tipo',
      accessorKey: 'material_type_id',
      cell: (row) => row.material_type?.name || '-'
    },
    {
      header: 'Brochura (PDF)',
      accessorKey: 'brochure_url',
      sortable: false,
      cell: (row) => row.brochure_url ? (
        <a
          href={row.brochure_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--primary)', textDecoration: 'underline' }}
        >
          Visualizar
        </a>
      ) : (
        <span style={{ color: 'var(--foreground-muted)' }}>Nenhuma</span>
      )
    },
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
        <h1 className={formStyles.pageTitle}>Materiais</h1>
        <button
          className={`${formStyles.btn} ${formStyles.btnPrimary}`}
          onClick={() => handleOpenModal()}
        >
          <Plus size={18} />
          <span>Adicionar Novo</span>
        </button>
      </div>

      {loading ? (
        <TableSkeleton columns={6} />
      ) : (
        <Table
          data={materials}
          columns={columns}
          searchKeys={['name', 'description']}
        />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingMaterial ? 'Editar Material' : 'Adicionar Novo Material'}
      >
        <form onSubmit={handleSave} className={formStyles.form}>

          <div className={formStyles.formGroup}>
            <label className={formStyles.label}>Brochura (PDF/Imagem)</label>
            <Uploader
              bucket="Brochure"
              folder={brandFolder}
              accept=".pdf, image/*"
              defaultUrl={brochureUrl}
              onUploadSuccess={(url) => setBrochureUrl(url)}
            />
          </div>

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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className={formStyles.formGroup}>
              <label className={formStyles.label} htmlFor="brand">Marca</label>
              <select
                id="brand"
                className={formStyles.select}
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
              >
                <option value="">Sem Marca</option>
                {brands.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div className={formStyles.formGroup}>
              <label className={formStyles.label} htmlFor="type">Tipo de Material</label>
              <select
                id="type"
                className={formStyles.select}
                value={typeId}
                onChange={(e) => setTypeId(e.target.value)}
              >
                <option value="">Sem Tipo</option>
                {types.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={formStyles.formGroup}>
            <label className={formStyles.label} htmlFor="desc">Descrição</label>
            <textarea
              id="desc"
              className={formStyles.input}
              style={{ minHeight: '80px', resize: 'vertical' }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
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
        title="Excluir material"
        message="Tem certeza que deseja excluir este material? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
