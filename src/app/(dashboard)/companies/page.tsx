'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Table, Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { companySchema, zodErrors } from '@/lib/validation';
import { Uploader } from '@/components/ui/Uploader';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import formStyles from '@/components/ui/form.module.css';

type State = { id: number; name: string; uf: string };
type Company = {
  id: number;
  name: string;
  banner_url: string | null;
  state_id: number | null;
  state?: State;
  created_at: string;
};

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<Company | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form State
  const [name, setName] = useState('');
  const [stateId, setStateId] = useState<string>('');
  const [bannerUrl, setBannerUrl] = useState<string>('');

  const supabase = createClient();

  const fetchDependencies = async () => {
    const { data } = await supabase.from('state').select('*').order('name');
    if (data) setStates(data);
  };

  const fetchCompanies = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('company')
      .select('*, state(*)')
      .order('id', { ascending: false });

    if (error) {
      toast.error('Erro ao buscar empresas');
    } else {
      setCompanies(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDependencies();
    fetchCompanies();
  }, []);

  const handleOpenModal = (company?: Company) => {
    if (company) {
      setEditingCompany(company);
      setName(company.name);
      setStateId(company.state_id?.toString() || '');
      setBannerUrl(company.banner_url || '');
    } else {
      setEditingCompany(null);
      setName('');
      setStateId('');
      setBannerUrl('');
    }
    setErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCompany(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = companySchema.safeParse({ name, state_id: stateId });
    if (!result.success) {
      setErrors(zodErrors(result.error));
      return;
    }
    setErrors({});
    setIsSaving(true);

    const payload = {
      name,
      state_id: stateId ? parseInt(stateId) : null,
      banner_url: bannerUrl || null,
    };

    try {
      if (editingCompany) {
        const { error } = await supabase
          .from('company')
          .update(payload)
          .eq('id', editingCompany.id);
        if (error) throw error;
        toast.success('Empresa atualizada com sucesso');
      } else {
        const { error } = await supabase
          .from('company')
          .insert([payload]);
        if (error) throw error;
        toast.success('Empresa criada com sucesso');
      }
      handleCloseModal();
      fetchCompanies();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar empresa');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (company: Company) => {
    setPendingDelete(company);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const { error } = await supabase.from('company').delete().eq('id', pendingDelete.id);
    setDeleting(false);
    if (error) {
      toast.error('Erro ao excluir empresa.');
    } else {
      if (pendingDelete.banner_url) {
        const pathParts = pendingDelete.banner_url.split('/public/SellerBanner/');
        if (pathParts.length > 1) {
          await supabase.storage.from('SellerBanner').remove([pathParts[1]]);
        }
      }
      toast.success('Empresa excluída com sucesso');
      setPendingDelete(null);
      fetchCompanies();
    }
  };

  const columns: Column<Company>[] = [
    { header: 'ID', accessorKey: 'id' },
    {
      header: 'Banner',
      accessorKey: 'banner_url',
      sortable: false,
      cell: (row) => row.banner_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={row.banner_url}
          alt={row.name}
          style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
        />
      ) : (
        <span style={{ color: 'var(--foreground-muted)' }}>Sem imagem</span>
      )
    },
    { header: 'Nome', accessorKey: 'name' },
    {
      header: 'Estado',
      accessorKey: 'state_id',
      cell: (row) => row.state ? `${row.state.name} (${row.state.uf})` : '-'
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
        <h1 className={formStyles.pageTitle}>Empresas</h1>
        <button
          className={`${formStyles.btn} ${formStyles.btnPrimary}`}
          onClick={() => handleOpenModal()}
        >
          <Plus size={18} />
          <span>Adicionar Nova</span>
        </button>
      </div>

      {loading ? (
        <TableSkeleton columns={5} />
      ) : (
        <Table
          data={companies}
          columns={columns}
          searchKeys={['name']}
        />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingCompany ? 'Editar Empresa' : 'Adicionar Nova Empresa'}
      >
        <form onSubmit={handleSave} className={formStyles.form}>
          <div className={formStyles.formGroup}>
            <label className={formStyles.label}>Imagem do Banner</label>
            <Uploader
              bucket="SellerBanner"
              folder="company"
              accept="image/png, image/jpeg, image/webp, image/gif"
              defaultUrl={bannerUrl}
              onUploadSuccess={(url) => setBannerUrl(url)}
            />
          </div>

          <div className={formStyles.formGroup}>
            <label className={formStyles.label} htmlFor="name">Nome da Empresa</label>
            <input
              type="text"
              id="name"
              className={formStyles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              aria-invalid={!!errors.name}
              placeholder="ex. Endovascular Hub"
            />
            {errors.name && <span className={formStyles.errorText} role="alert">{errors.name}</span>}
          </div>

          <div className={formStyles.formGroup}>
            <label className={formStyles.label} htmlFor="state">Estado</label>
            <select
              id="state"
              className={formStyles.select}
              value={stateId}
              onChange={(e) => setStateId(e.target.value)}
              required
              aria-invalid={!!errors.state_id}
            >
              <option value="" disabled>Selecione um estado</option>
              {states.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.uf})</option>
              ))}
            </select>
            {errors.state_id && <span className={formStyles.errorText} role="alert">{errors.state_id}</span>}
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
        title="Excluir empresa"
        message="Tem certeza que deseja excluir esta empresa? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
