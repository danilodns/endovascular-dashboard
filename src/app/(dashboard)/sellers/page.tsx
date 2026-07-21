'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Table, Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { Uploader } from '@/components/ui/Uploader';
import { TierBadge } from '@/components/ui/TierBadge';
import { sellerSchema, zodErrors } from '@/lib/validation';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import formStyles from '@/components/ui/form.module.css';

type Seller = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  tier: number | null;
  address: string | null;
  complemento: string | null;
  bairro: string | null;
  cep: string | null;
  banner_url: string | null;
  created_at: string;
};

export default function SellersPage() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<Seller | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    tier: '',
    address: '',
    complemento: '',
    bairro: '',
    cep: '',
    banner_url: ''
  });

  const supabase = createClient();

  const fetchSellers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('seller')
      .select('*')
      .order('id', { ascending: false });

    if (error) {
      toast.error('Erro ao buscar representantes');
    } else {
      setSellers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSellers();
  }, []);

  const handleOpenModal = (seller?: Seller) => {
    if (seller) {
      setEditingSeller(seller);
      setFormData({
        name: seller.name || '',
        email: seller.email || '',
        phone: seller.phone || '',
        tier: seller.tier !== null && seller.tier !== undefined ? seller.tier.toString() : '',
        address: seller.address || '',
        complemento: seller.complemento || '',
        bairro: seller.bairro || '',
        cep: seller.cep || '',
        banner_url: seller.banner_url || ''
      });
    } else {
      setEditingSeller(null);
      setFormData({
        name: '', email: '', phone: '', tier: '',
        address: '', complemento: '', bairro: '', cep: '', banner_url: ''
      });
    }
    setErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSeller(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = sellerSchema.safeParse({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      tier: formData.tier,
    });
    if (!result.success) {
      setErrors(zodErrors(result.error));
      return;
    }
    setErrors({});
    setIsSaving(true);

    const payload = {
      name: formData.name,
      email: formData.email || null,
      phone: formData.phone || null,
      tier: formData.tier ? parseInt(formData.tier, 10) : null,
      address: formData.address || null,
      complemento: formData.complemento || null,
      bairro: formData.bairro || null,
      cep: formData.cep || null,
      banner_url: formData.banner_url || null,
    };

    try {
      if (editingSeller) {
        const { error } = await supabase
          .from('seller')
          .update(payload)
          .eq('id', editingSeller.id);
        if (error) throw error;
        toast.success('Representante atualizado com sucesso');
      } else {
        const { error } = await supabase
          .from('seller')
          .insert([payload]);
        if (error) throw error;
        toast.success('Representante criado com sucesso');
      }
      handleCloseModal();
      fetchSellers();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar representante');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (seller: Seller) => {
    setPendingDelete(seller);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const { error } = await supabase.from('seller').delete().eq('id', pendingDelete.id);
    setDeleting(false);
    if (error) {
      toast.error('Erro ao excluir representante.');
    } else {
      if (pendingDelete.banner_url) {
        const pathParts = pendingDelete.banner_url.split('/public/SellerBanner/');
        if (pathParts.length > 1) {
          await supabase.storage.from('SellerBanner').remove([pathParts[1]]);
        }
      }
      toast.success('Representante excluído com sucesso');
      setPendingDelete(null);
      fetchSellers();
    }
  };

  const columns: Column<Seller>[] = [
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
    { header: 'Email', accessorKey: 'email', cell: (row) => row.email || '-' },
    { header: 'Nível (Tier)', accessorKey: 'tier', cell: (row) => <TierBadge tier={row.tier} /> },
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
        <h1 className={formStyles.pageTitle}>Representantes</h1>
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
          data={sellers}
          columns={columns}
          searchKeys={['name', 'email', 'phone']}
        />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingSeller ? 'Editar Representante' : 'Adicionar Novo Representante'}
      >
        <form onSubmit={handleSave} className={formStyles.form}>
          <div className={formStyles.formGroup}>
            <label className={formStyles.label}>Imagem do Banner</label>
            <Uploader
              bucket="SellerBanner"
              folder="seller"
              accept="image/png, image/jpeg, image/webp, image/gif"
              defaultUrl={formData.banner_url}
              onUploadSuccess={(url) => setFormData(p => ({ ...p, banner_url: url }))}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className={formStyles.formGroup}>
              <label className={formStyles.label} htmlFor="name">Nome</label>
              <input type="text" id="name" className={formStyles.input} value={formData.name} onChange={handleChange} required aria-invalid={!!errors.name} />
              {errors.name && <span className={formStyles.errorText} role="alert">{errors.name}</span>}
            </div>
            <div className={formStyles.formGroup}>
              <label className={formStyles.label} htmlFor="tier">Nível (Tier)</label>
              <input type="number" id="tier" className={formStyles.input} value={formData.tier} onChange={handleChange} placeholder="ex. 1" min="0" />
              <span className={formStyles.helperText}>1 = Bronze · 2 = Prata · 3 = Ouro (quanto maior o número, mais alto o nível).</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className={formStyles.formGroup}>
              <label className={formStyles.label} htmlFor="email">Email</label>
              <input type="email" id="email" className={formStyles.input} value={formData.email} onChange={handleChange} aria-invalid={!!errors.email} />
              {errors.email && <span className={formStyles.errorText} role="alert">{errors.email}</span>}
            </div>
            <div className={formStyles.formGroup}>
              <label className={formStyles.label} htmlFor="phone">Telefone</label>
              <input type="text" id="phone" className={formStyles.input} value={formData.phone} onChange={handleChange} />
            </div>
          </div>

          <div className={formStyles.formGroup}>
            <label className={formStyles.label} htmlFor="address">Endereço</label>
            <input type="text" id="address" className={formStyles.input} value={formData.address} onChange={handleChange} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className={formStyles.formGroup}>
              <label className={formStyles.label} htmlFor="bairro">Bairro</label>
              <input type="text" id="bairro" className={formStyles.input} value={formData.bairro} onChange={handleChange} />
            </div>
            <div className={formStyles.formGroup}>
              <label className={formStyles.label} htmlFor="cep">CEP</label>
              <input type="text" id="cep" className={formStyles.input} value={formData.cep} onChange={handleChange} />
            </div>
          </div>

          <div className={formStyles.formGroup}>
            <label className={formStyles.label} htmlFor="complemento">Complemento</label>
            <input type="text" id="complemento" className={formStyles.input} value={formData.complemento} onChange={handleChange} />
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
        title="Excluir representante"
        message="Tem certeza que deseja excluir este representante? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
