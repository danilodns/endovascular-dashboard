'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Table, Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { Uploader } from '@/components/ui/Uploader';
import { TierBadge } from '@/components/ui/TierBadge';
import { sellerSchema, sellerContactSchema, zodErrors } from '@/lib/validation';
import { Plus, Edit2, Trash2, Boxes, X, ChevronDown, ChevronRight, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import formStyles from '@/components/ui/form.module.css';

type Seller = {
  id: number;
  name: string;
  tier: number | null;
  banner_url: string | null;
  created_at: string;
  seller_contact?: { count: number }[];
};

type SellerContactRow = {
  id: number;
  seller_id: number;
  state_id: number;
  alias_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  complemento: string | null;
  bairro: string | null;
  cep: string | null;
};

type ContactForm = {
  id?: number; // set when editing an existing contact row
  state_id: string; // form fields are strings; state_id parses to int on save
  // Import offer for fresh rows only: '' = not asked yet, 'none' = declined,
  // otherwise the source state_id whose materials get copied on save.
  importFrom: string;
  alias_name: string;
  phone: string;
  email: string;
  address: string;
  complemento: string;
  bairro: string;
  cep: string;
};

const emptyContact = (): ContactForm => ({
  id: undefined,
  state_id: '',
  importFrom: '',
  alias_name: '',
  phone: '',
  email: '',
  address: '',
  complemento: '',
  bairro: '',
  cep: '',
});

const isContactEmpty = (c: ContactForm) =>
  !c.state_id && !c.alias_name && !c.phone && !c.email && !c.address && !c.complemento && !c.bairro && !c.cep;

type StateRef = { id: number; name: string; uf: string };
type MaterialRef = { id: number; name: string };
type SellerRelation = {
  state_id: number;
  material_id: number;
  state?: StateRef;
  material?: MaterialRef;
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

  // Materials-by-state modal
  const [materialsSeller, setMaterialsSeller] = useState<Seller | null>(null);
  const [relations, setRelations] = useState<SellerRelation[]>([]);
  const [relationsLoading, setRelationsLoading] = useState(false);
  const [states, setStates] = useState<StateRef[]>([]);
  const [materials, setMaterials] = useState<MaterialRef[]>([]);
  const [relStateId, setRelStateId] = useState('');
  const [relMaterialId, setRelMaterialId] = useState('');
  const [isRelSaving, setIsRelSaving] = useState(false);
  const [removingKey, setRemovingKey] = useState('');
  const [relErrors, setRelErrors] = useState<Record<string, string>>({});
  const [collapsedStates, setCollapsedStates] = useState<Set<number>>(new Set());

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    tier: '',
    banner_url: ''
  });
  const [contacts, setContacts] = useState<ContactForm[]>([emptyContact()]);
  // Existing contacts removed from the form, awaiting delete at save time.
  // removeMaterials = also delete this seller's material_seller rows for that state.
  const [pendingContactDeletes, setPendingContactDeletes] = useState<{ id: number; state_id: string; removeMaterials: boolean }[]>([]);
  const [confirmRemoveIndex, setConfirmRemoveIndex] = useState<number | null>(null);
  // material_seller rows of the seller being edited, grouped as state_id -> count.
  // Null until a fresh contact picks a state (the import offer needs it).
  const [materialCounts, setMaterialCounts] = useState<Record<number, number> | null>(null);

  const supabase = createClient();

  const fetchSellers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('seller')
      .select('*, seller_contact(count)')
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
    supabase.from('state').select('id, name, uf').order('name')
      .then(({ data }) => data && setStates(data));
    supabase.from('material').select('id, name').order('name')
      .then(({ data }) => data && setMaterials(data));
  }, []);

  const fetchRelations = async (sellerId: number) => {
    setRelationsLoading(true);
    const { data, error } = await supabase
      .from('material_seller')
      .select('state_id, material_id, state(id, name, uf), material(id, name)')
      .eq('seller_id', sellerId);
    if (error) {
      toast.error('Erro ao buscar materiais do representante');
    } else {
      setRelations(data as unknown as SellerRelation[] || []);
    }
    setRelationsLoading(false);
  };

  const handleOpenMaterials = (seller: Seller) => {
    setMaterialsSeller(seller);
    setRelStateId('');
    setRelMaterialId('');
    setRelErrors({});
    setCollapsedStates(new Set());
    fetchRelations(seller.id);
  };

  const toggleStateGroup = (stateId: number) => {
    setCollapsedStates((prev) => {
      const next = new Set(prev);
      if (next.has(stateId)) next.delete(stateId);
      else next.add(stateId);
      return next;
    });
  };

  const handleRemoveRelation = async (r: SellerRelation) => {
    if (!materialsSeller) return;
    const key = `${r.state_id}-${r.material_id}`;
    setRemovingKey(key);
    const { error } = await supabase
      .from('material_seller')
      .delete()
      .match({ state_id: r.state_id, seller_id: materialsSeller.id, material_id: r.material_id });
    setRemovingKey('');
    if (error) {
      toast.error('Erro ao remover relação.');
    } else {
      toast.success('Relação removida');
      setRelations((prev) => prev.filter((x) => `${x.state_id}-${x.material_id}` !== key));
    }
  };

  const handleCloseMaterials = () => {
    setMaterialsSeller(null);
    setRelations([]);
  };

  const handleAddRelation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialsSeller) return;
    if (!relStateId || !relMaterialId) {
      setRelErrors({
        state_id: relStateId ? '' : 'Selecione o estado.',
        material_id: relMaterialId ? '' : 'Selecione o material.',
      });
      return;
    }
    setRelErrors({});
    setIsRelSaving(true);
    try {
      const { error } = await supabase.from('material_seller').insert([{
        state_id: parseInt(relStateId),
        seller_id: materialsSeller.id,
        material_id: parseInt(relMaterialId),
      }]);
      if (error) {
        if (error.code === '23505') throw new Error('Este material já está vinculado a este representante neste estado.');
        throw error;
      }
      toast.success('Relação adicionada com sucesso');
      setRelStateId('');
      setRelMaterialId('');
      fetchRelations(materialsSeller.id);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao adicionar relação');
    } finally {
      setIsRelSaving(false);
    }
  };

  const handleOpenModal = async (seller?: Seller) => {
    setMaterialCounts(null);
    setPendingContactDeletes([]);
    setConfirmRemoveIndex(null);
    if (seller) {
      setEditingSeller(seller);
      setFormData({
        name: seller.name || '',
        tier: seller.tier !== null && seller.tier !== undefined ? seller.tier.toString() : '',
        banner_url: seller.banner_url || ''
      });
      const { data, error } = await supabase
        .from('seller_contact')
        .select('*')
        .eq('seller_id', seller.id)
        .order('id');
      if (error) toast.error('Erro ao buscar contatos do representante');
      const rows = (data as SellerContactRow[] | null) ?? [];
      setContacts(rows.length
        ? rows.map(r => ({
            id: r.id,
            state_id: String(r.state_id),
            importFrom: '',
            alias_name: r.alias_name || '',
            phone: r.phone || '',
            email: r.email || '',
            address: r.address || '',
            complemento: r.complemento || '',
            bairro: r.bairro || '',
            cep: r.cep || '',
          }))
        : [emptyContact()]);
    } else {
      setEditingSeller(null);
      setFormData({ name: '', tier: '', banner_url: '' });
      setContacts([emptyContact()]);
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

  const handleContactChange = (index: number, field: keyof ContactForm, value: string) => {
    setContacts(prev => prev.map((c, i) => (
      // Picking a different state invalidates any pending import choice
      i === index ? { ...c, [field]: value, ...(field === 'state_id' ? { importFrom: '' } : {}) } : c
    )));
    if (field === 'state_id' && value && editingSeller && !contacts[index]?.id) {
      void ensureMaterialCounts();
    }
  };

  const ensureMaterialCounts = async () => {
    if (materialCounts !== null || !editingSeller) return;
    const { data } = await supabase
      .from('material_seller')
      .select('state_id')
      .eq('seller_id', editingSeller.id);
    const counts: Record<number, number> = {};
    (data || []).forEach(r => { counts[r.state_id] = (counts[r.state_id] ?? 0) + 1; });
    setMaterialCounts(counts);
  };

  const setImportFrom = (index: number, value: string) => {
    setContacts(prev => prev.map((c, i) => (i === index ? { ...c, importFrom: value } : c)));
  };

  const addContact = () => setContacts(prev => [...prev, emptyContact()]);

  const requestRemoveContact = (index: number) => {
    if (contacts[index]?.id) {
      // Existing row: ask whether its state's materials should go too
      setConfirmRemoveIndex(index);
      void ensureMaterialCounts();
    } else {
      setContacts(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : [emptyContact()]);
    }
  };

  const confirmRemoveContact = (index: number, removeMaterials: boolean) => {
    const c = contacts[index];
    if (!c?.id) return;
    setPendingContactDeletes(prev => [...prev, { id: c.id!, state_id: c.state_id, removeMaterials }]);
    setContacts(prev => prev.filter((_, i) => i !== index));
    setConfirmRemoveIndex(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = sellerSchema.safeParse({ name: formData.name, tier: formData.tier });
    if (!result.success) {
      setErrors(zodErrors(result.error));
      return;
    }

    const filled = contacts.filter(c => !isContactEmpty(c));

    // Per-contact validation; errors keyed by position in `contacts`
    const contactErrors: Record<string, string> = {};
    contacts.forEach((c, i) => {
      if (isContactEmpty(c)) return;
      const r = sellerContactSchema.safeParse({ state_id: c.state_id, email: c.email });
      if (!r.success) {
        for (const [k, v] of Object.entries(zodErrors(r.error))) contactErrors[`contact-${i}.${k}`] = v;
      }
    });

    // One contact per state
    const seen = new Set<string>();
    for (const c of filled) {
      if (seen.has(c.state_id)) {
        contactErrors[`contact-${contacts.indexOf(c)}.state_id`] = 'Cada estado pode ter apenas um contato.';
        break;
      }
      seen.add(c.state_id);
    }

    if (Object.keys(contactErrors).length > 0) {
      setErrors(contactErrors);
      toast.error('Verifique os contatos informados.');
      return;
    }
    setErrors({});
    setIsSaving(true);

    const payload = {
      name: formData.name,
      tier: formData.tier ? parseInt(formData.tier, 10) : null,
      banner_url: formData.banner_url || null,
    };

    const toRow = (c: ContactForm, sellerId: number) => ({
      seller_id: sellerId,
      state_id: parseInt(c.state_id, 10),
      alias_name: c.alias_name || null,
      phone: c.phone || null,
      email: c.email || null,
      address: c.address || null,
      complemento: c.complemento || null,
      bairro: c.bairro || null,
      cep: c.cep || null,
    });

    try {
      let sellerId: number;
      if (editingSeller) {
        const { error } = await supabase.from('seller').update(payload).eq('id', editingSeller.id);
        if (error) throw error;
        sellerId = editingSeller.id;

        // Sync contacts: delete removed rows, update kept ones, insert new ones
        if (pendingContactDeletes.length) {
          const { error } = await supabase.from('seller_contact')
            .delete()
            .in('id', pendingContactDeletes.map(d => d.id));
          if (error) throw error;
        }
        // Material cleanup the user opted into. Non-fatal: the contact is
        // already deleted, so failures only warn.
        for (const d of pendingContactDeletes) {
          if (!d.removeMaterials) continue;
          const stateName = states.find(s => s.id.toString() === d.state_id)?.name;
          const { error: matError } = await supabase
            .from('material_seller')
            .delete()
            .eq('seller_id', sellerId)
            .eq('state_id', parseInt(d.state_id, 10));
          if (matError) {
            toast.error(`Não foi possível remover os materiais de ${stateName ?? 'um estado'}.`);
          } else {
            toast.success(`Materiais de ${stateName ?? 'um estado'} removidos.`);
          }
        }
        const existing = filled.filter(c => c.id);
        const fresh = filled.filter(c => !c.id);
        for (const c of existing) {
          const { error } = await supabase.from('seller_contact').update(toRow(c, sellerId)).eq('id', c.id!);
          if (error) throw error;
        }
        if (fresh.length) {
          const { error } = await supabase.from('seller_contact').insert(fresh.map(c => toRow(c, sellerId)));
          if (error) throw error;
        }
        // Copy material_seller rows into the new states the user opted into.
        // Non-fatal: contacts are already saved, so failures only warn.
        for (const c of fresh) {
          if (!c.importFrom || c.importFrom === 'none') continue;
          const sourceName = states.find(s => s.id.toString() === c.importFrom)?.name;
          const targetName = states.find(s => s.id.toString() === c.state_id)?.name;
          const { data: src, error } = await supabase
            .from('material_seller')
            .select('material_id')
            .eq('seller_id', sellerId)
            .eq('state_id', parseInt(c.importFrom, 10));
          if (error || !src?.length) {
            toast.error(`Não foi possível importar os materiais de ${sourceName ?? 'outro estado'}.`);
            continue;
          }
          const { error: insertError } = await supabase
            .from('material_seller')
            .upsert(
              src.map(r => ({ seller_id: sellerId, state_id: parseInt(c.state_id, 10), material_id: r.material_id })),
              { onConflict: 'seller_id,state_id,material_id', ignoreDuplicates: true }
            );
          if (insertError) {
            toast.error(`Não foi possível importar os materiais de ${sourceName ?? 'outro estado'}.`);
          } else {
            toast.success(`${src.length} materiais importados de ${sourceName ?? 'outro estado'} para ${targetName ?? 'o novo estado'}.`);
          }
        }
        toast.success('Representante atualizado com sucesso');
      } else {
        const { data: created, error } = await supabase
          .from('seller')
          .insert([payload])
          .select('id')
          .single();
        if (error) throw error;
        sellerId = created.id;
        if (filled.length) {
          const { error } = await supabase.from('seller_contact').insert(filled.map(c => toRow(c, sellerId)));
          // ponytail: on partial failure the seller stays; user re-edits to retry contacts
          if (error) throw error;
        }
        toast.success('Representante criado com sucesso');
      }
      handleCloseModal();
      fetchSellers();
    } catch (error: any) {
      if (error?.code === '23505') {
        toast.error('Este estado já possui um contato para este representante.');
      } else {
        toast.error(error.message || 'Erro ao salvar representante');
      }
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
    { header: 'ID', accessorKey: 'id', width: '4rem' },
    {
      header: 'Banner',
      accessorKey: 'banner_url',
      sortable: false,
      width: '6rem',
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
      header: 'Contatos',
      accessorKey: 'seller_contact',
      sortable: false,
      width: '7rem',
      cell: (row) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
          <MapPin size={14} aria-hidden="true" />
          {row.seller_contact?.[0]?.count ?? 0}
        </span>
      )
    },
    { header: 'Nível (Tier)', accessorKey: 'tier', width: '10rem', cell: (row) => <TierBadge tier={row.tier} /> },
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
            aria-label={`Materiais por estado de ${row.name}`}
            title="Materiais por Estado"
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
          searchKeys={['name']}
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

          <div className={formStyles.formGroup}
            style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}
          >
            <label className={formStyles.label}>Contatos por Estado</label>
            <span className={formStyles.helperText}>Um contato por estado. Opcionalmente informe um nome de exibição (alias) se o representante atende com outro nome nesse estado.</span>
          </div>

          {contacts.map((contact, i) => {
            const stateName = states.find(s => s.id.toString() === contact.state_id)?.name;
            return (
              <fieldset
                key={contact.id ?? `new-${i}`}
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <legend className={formStyles.label} style={{ padding: '0 0.375rem' }}>
                  {stateName ? `Contato — ${stateName}` : `Contato #${i + 1}`}
                </legend>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className={formStyles.formGroup}>
                    <label className={formStyles.label} htmlFor={`contact-state-${i}`}>Estado</label>
                    <select
                      id={`contact-state-${i}`}
                      className={formStyles.select}
                      value={contact.state_id}
                      onChange={(e) => handleContactChange(i, 'state_id', e.target.value)}
                      aria-invalid={!!errors[`contact-${i}.state_id`]}
                    >
                      <option value="" disabled>Selecione o estado</option>
                      {states.map((s) => (
                        <option
                          key={s.id}
                          value={s.id}
                          disabled={contacts.some((c, j) => j !== i && c.state_id === s.id.toString())}
                        >
                          {s.name} ({s.uf})
                        </option>
                      ))}
                    </select>
                    {errors[`contact-${i}.state_id`] && <span className={formStyles.errorText} role="alert">{errors[`contact-${i}.state_id`]}</span>}
                  </div>
                  <div className={formStyles.formGroup}>
                    <label className={formStyles.label} htmlFor={`contact-alias-${i}`}>Nome de exibição (opcional)</label>
                    <input
                      type="text"
                      id={`contact-alias-${i}`}
                      className={formStyles.input}
                      value={contact.alias_name}
                      onChange={(e) => handleContactChange(i, 'alias_name', e.target.value)}
                      placeholder="ex. Bio Saúde Sul"
                    />
                  </div>
                </div>

                {editingSeller && !contact.id && contact.state_id && contact.importFrom === '' && materialCounts
                  && Object.keys(materialCounts).some(sid => sid !== contact.state_id) && (
                  <div
                    style={{
                      border: '1px dashed var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}
                  >
                    <span className={formStyles.label} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                      <Boxes size={14} aria-hidden="true" /> Importar os materiais de outro estado para este contato?
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem', alignItems: 'center' }}>
                      <select
                        className={formStyles.select}
                        defaultValue=""
                        onChange={(e) => e.target.value && setImportFrom(i, e.target.value)}
                        aria-label={`Estado de origem dos materiais para o contato ${stateName ?? `#${i + 1}`}`}
                      >
                        <option value="" disabled>Estado de origem</option>
                        {Object.entries(materialCounts)
                          .filter(([sid]) => sid !== contact.state_id)
                          .map(([sid, count]) => {
                            const s = states.find(x => x.id.toString() === sid);
                            return (
                              <option key={sid} value={sid}>
                                {s ? `${s.name} (${s.uf})` : sid} — {count} {count === 1 ? 'material' : 'materiais'}
                              </option>
                            );
                          })}
                      </select>
                      <button
                        type="button"
                        className={`${formStyles.btn} ${formStyles.btnSecondary}`}
                        onClick={() => setImportFrom(i, 'none')}
                      >
                        Agora não
                      </button>
                    </div>
                  </div>
                )}

                {editingSeller && !contact.id && contact.importFrom && contact.importFrom !== 'none' && (
                  <span className={formStyles.helperText} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                    <Boxes size={14} aria-hidden="true" />
                    {materialCounts?.[parseInt(contact.importFrom, 10)] ?? ''} materiais de{' '}
                    {states.find(s => s.id.toString() === contact.importFrom)?.name ?? 'outro estado'}{' '}
                    serão importados ao salvar.
                  </span>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className={formStyles.formGroup}>
                    <label className={formStyles.label} htmlFor={`contact-phone-${i}`}>Telefone</label>
                    <input
                      type="text"
                      id={`contact-phone-${i}`}
                      className={formStyles.input}
                      value={contact.phone}
                      onChange={(e) => handleContactChange(i, 'phone', e.target.value)}
                    />
                  </div>
                  <div className={formStyles.formGroup}>
                    <label className={formStyles.label} htmlFor={`contact-email-${i}`}>Email</label>
                    <input
                      type="email"
                      id={`contact-email-${i}`}
                      className={formStyles.input}
                      value={contact.email}
                      onChange={(e) => handleContactChange(i, 'email', e.target.value)}
                      aria-invalid={!!errors[`contact-${i}.email`]}
                    />
                    {errors[`contact-${i}.email`] && <span className={formStyles.errorText} role="alert">{errors[`contact-${i}.email`]}</span>}
                  </div>
                </div>

                <div className={formStyles.formGroup}>
                  <label className={formStyles.label} htmlFor={`contact-address-${i}`}>Endereço</label>
                  <input
                    type="text"
                    id={`contact-address-${i}`}
                    className={formStyles.input}
                    value={contact.address}
                    onChange={(e) => handleContactChange(i, 'address', e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className={formStyles.formGroup}>
                    <label className={formStyles.label} htmlFor={`contact-bairro-${i}`}>Bairro</label>
                    <input
                      type="text"
                      id={`contact-bairro-${i}`}
                      className={formStyles.input}
                      value={contact.bairro}
                      onChange={(e) => handleContactChange(i, 'bairro', e.target.value)}
                    />
                  </div>
                  <div className={formStyles.formGroup}>
                    <label className={formStyles.label} htmlFor={`contact-cep-${i}`}>CEP</label>
                    <input
                      type="text"
                      id={`contact-cep-${i}`}
                      className={formStyles.input}
                      value={contact.cep}
                      onChange={(e) => handleContactChange(i, 'cep', e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'end' }}>
                  <div className={formStyles.formGroup}>
                    <label className={formStyles.label} htmlFor={`contact-complemento-${i}`}>Complemento</label>
                    <input
                      type="text"
                      id={`contact-complemento-${i}`}
                      className={formStyles.input}
                      value={contact.complemento}
                      onChange={(e) => handleContactChange(i, 'complemento', e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className={`${formStyles.btn} ${formStyles.btnDanger}`}
                    onClick={() => requestRemoveContact(i)}
                    aria-label={`Remover contato ${stateName ?? `#${i + 1}`}`}
                    title="Remover contato"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {confirmRemoveIndex === i && contact.id && (
                  <div
                    style={{
                      border: '1px dashed var(--danger)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}
                  >
                    <span className={formStyles.label} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
                      <Trash2 size={14} aria-hidden="true" /> Remover também os materiais deste estado?
                    </span>
                    <span className={formStyles.helperText}>
                      {materialCounts?.[parseInt(contact.state_id, 10)]
                        ? `${materialCounts[parseInt(contact.state_id, 10)]} materiais vinculados a ${stateName ?? 'este estado'} serão removidos junto com o contato.`
                        : `Nenhum material vinculado a ${stateName ?? 'este estado'} — apenas o contato será removido.`}
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className={`${formStyles.btn} ${formStyles.btnDanger}`}
                        onClick={() => confirmRemoveContact(i, true)}
                      >
                        Remover contato e materiais
                      </button>
                      <button
                        type="button"
                        className={`${formStyles.btn} ${formStyles.btnSecondary}`}
                        onClick={() => confirmRemoveContact(i, false)}
                      >
                        Remover apenas o contato
                      </button>
                      <button
                        type="button"
                        className={`${formStyles.btn} ${formStyles.btnSecondary}`}
                        onClick={() => setConfirmRemoveIndex(null)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </fieldset>
            );
          })}

          <button
            type="button"
            className={`${formStyles.btn} ${formStyles.btnSecondary}`}
            onClick={addContact}
          >
            <Plus size={16} />
            <span>Adicionar Contato</span>
          </button>

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
        isOpen={!!materialsSeller}
        onClose={handleCloseMaterials}
        title={`Materiais por Estado — ${materialsSeller?.name ?? ''}`}
      >
        <div className={formStyles.form}>
          <form onSubmit={handleAddRelation} className={formStyles.formGroup}>
            <label className={formStyles.label} style={{ display: 'block', marginBottom: '0.5rem' }}>Adicionar novo material</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <select
                  className={formStyles.select}
                  value={relStateId}
                  onChange={(e) => setRelStateId(e.target.value)}
                  aria-label="Estado"
                >
                  <option value="" disabled>Estado</option>
                  {states.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.uf})</option>)}
                </select>
                {relErrors.state_id && <span className={formStyles.errorText} role="alert">{relErrors.state_id}</span>}
              </div>
              <div>
                <select
                  className={formStyles.select}
                  value={relMaterialId}
                  onChange={(e) => setRelMaterialId(e.target.value)}
                  aria-label="Material"
                >
                  <option value="" disabled>Material</option>
                  {materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                {relErrors.material_id && <span className={formStyles.errorText} role="alert">{relErrors.material_id}</span>}
              </div>
            </div>
            <div className={formStyles.actions}>
              <button
                type="submit"
                className={`${formStyles.btn} ${formStyles.btnPrimary}`}
                disabled={isRelSaving}
              >
                {isRelSaving ? 'Adicionando...' : 'Adicionar Relação'}
              </button>
            </div>
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
            {relationsLoading ? (
              <p>Carregando...</p>
            ) : relations.length === 0 ? (
              <p style={{ color: 'var(--foreground-muted)' }}>Nenhum material vinculado a este representante.</p>
            ) : (
              Object.values(
                relations.reduce<Record<number, { stateId: number; label: string; items: SellerRelation[] }>>((acc, r) => {
                  if (!r.state || !r.material) return acc;
                  acc[r.state_id] ??= {
                    stateId: r.state_id,
                    label: `${r.state.name} (${r.state.uf})`,
                    items: [],
                  };
                  acc[r.state_id].items.push(r);
                  return acc;
                }, {})
              ).map((group) => {
                const collapsed = collapsedStates.has(group.stateId);
                return (
                <div key={group.stateId} style={{ marginBottom: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => toggleStateGroup(group.stateId)}
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
                      ({group.items.length})
                    </span>
                  </button>
                  <div style={{ display: collapsed ? 'none' : 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    {group.items.map((r) => {
                      const key = `${r.state_id}-${r.material_id}`;
                      return (
                        <div
                          key={key}
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
                          <span>{r.material?.name}</span>
                          <button
                            type="button"
                            className={`${formStyles.btn} ${formStyles.btnDanger}`}
                            style={{ padding: '0.25rem 0.375rem' }}
                            disabled={removingKey === key}
                            onClick={() => handleRemoveRelation(r)}
                            aria-label={`Remover ${r.material?.name}`}
                            title="Remover relação"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>
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
