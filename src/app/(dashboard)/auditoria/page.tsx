'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Table, Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import formStyles from '@/components/ui/form.module.css';

type Action = 'INSERT' | 'UPDATE' | 'DELETE';

type AuditEntry = {
  id: number;
  created_at: string;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  action: Action;
  table_name: string;
  row_id: string | null;
  before: Record<string, any> | null;
  after: Record<string, any> | null;
  nome?: string;
};

const TABLE_LABELS: Record<string, string> = {
  state: 'Estado',
  brand: 'Marca',
  seller: 'Representante',
  procedure: 'Procedimento',
  material_type: 'Tipo de Material',
  material: 'Material',
  procedure_material: 'Relação Proc. × Material',
  material_seller: 'Relação Material × Repr.',
  company: 'Empresa',
};

const ACTION_META: Record<Action, { label: string; color: string; Icon: typeof Plus }> = {
  INSERT: { label: 'Adicionado', color: '#10b981', Icon: Plus },
  UPDATE: { label: 'Editado', color: '#3b82f6', Icon: Edit2 },
  DELETE: { label: 'Excluído', color: '#ef4444', Icon: Trash2 },
};

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function fmtVal(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function AuditDiff({ entry }: { entry: AuditEntry }) {
  const before = entry.before && typeof entry.before === 'object' ? entry.before : {};
  const after = entry.after && typeof entry.after === 'object' ? entry.after : {};
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
  const meta = ACTION_META[entry.action];
  const Icon = meta.Icon;

  const headStyle: React.CSSProperties = {
    fontSize: '0.7rem', fontWeight: 700, color: 'var(--foreground-muted)',
    textTransform: 'uppercase', letterSpacing: '0.03em',
  };
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, background: `color-mix(in srgb, ${meta.color} 15%, transparent)`, color: meta.color }}>
          <Icon size={13} aria-hidden="true" /> {meta.label}
        </span>
        <span style={{ fontSize: '0.85rem', color: 'var(--foreground-muted)', textAlign: 'right' }}>
          {TABLE_LABELS[entry.table_name] || entry.table_name}
          {entry.row_id ? ` · registro ${entry.row_id}` : ''}<br />
          {fmtDate(entry.created_at)} · {entry.nome}{entry.user_email && entry.nome !== entry.user_email ? ` (${entry.user_email})` : ''}
        </span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 360 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
            <span style={headStyle}>Campo</span>
            <span style={headStyle}>Antes</span>
            <span style={headStyle}>Depois</span>
          </div>
          {keys.map((k) => {
            const oldV = before[k];
            const newV = after[k];
            const changed = JSON.stringify(oldV) !== JSON.stringify(newV);
            return (
              <div key={k} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', padding: '0.6rem 0', borderBottom: '1px solid var(--border-color)', alignItems: 'start' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', wordBreak: 'break-word' }}>{k}</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--foreground-muted)', wordBreak: 'break-word' }}>{fmtVal(oldV)}</span>
                <span style={{ fontSize: '0.85rem', color: changed ? 'var(--foreground)' : 'var(--foreground-muted)', fontWeight: changed ? 600 : 400, wordBreak: 'break-word', background: changed ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'transparent', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-sm)' }}>{fmtVal(newV)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function AuditoriaPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [notConfigured, setNotConfigured] = useState(false);

  const [actionFilter, setActionFilter] = useState('');
  const [tableFilter, setTableFilter] = useState('');
  const [detail, setDetail] = useState<AuditEntry | null>(null);
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});

  const supabase = createClient();

  const fetchAudit = async () => {
    setLoading(true);
    setNotConfigured(false);
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      // audit_log table not created yet — guide the user to run the SQL.
      setNotConfigured(true);
      setEntries([]);
    } else {
      setEntries((data as AuditEntry[]) || []);
    }

    // Nomes de exibição atuais (de profiles) — resolve o nome para todas as linhas.
    const { data: prof } = await supabase.from('profiles').select('id, name');
    const map: Record<string, string> = {};
    (prof || []).forEach((p: any) => {
      if (p.name) map[p.id] = p.name;
    });
    setProfilesMap(map);

    setLoading(false);
  };

  useEffect(() => {
    fetchAudit();
  }, []);

  // Resolve o nome de exibição atual (de profiles) para cada entrada,
  // inclusive as antigas — sem depender do valor gravado no momento da ação.
  const rows = useMemo<AuditEntry[]>(
    () => entries.map((e) => ({
      ...e,
      nome: profilesMap[e.user_id || ''] || e.user_name || e.user_email || 'Sistema',
    })),
    [entries, profilesMap]
  );

  const filtered = useMemo(
    () => rows.filter(
      (e) =>
        (!actionFilter || e.action === actionFilter) &&
        (!tableFilter || e.table_name === tableFilter)
    ),
    [rows, actionFilter, tableFilter]
  );

  const columns: Column<AuditEntry>[] = [
    { header: 'Data/Hora', accessorKey: 'created_at', sortable: true, cell: (row) => fmtDate(row.created_at) },
    { header: 'Usuário', accessorKey: 'nome', cell: (row) => row.nome },
    {
      header: 'Ação',
      accessorKey: 'action',
      cell: (row) => {
        const meta = ACTION_META[row.action];
        const Icon = meta.Icon;
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap', background: `color-mix(in srgb, ${meta.color} 15%, transparent)`, color: meta.color }}>
            <Icon size={13} aria-hidden="true" /> {meta.label}
          </span>
        );
      },
    },
    { header: 'Tabela', accessorKey: 'table_name', cell: (row) => TABLE_LABELS[row.table_name] || row.table_name },
    { header: 'Registro', accessorKey: 'row_id', cell: (row) => row.row_id || '—' },
    {
      header: '',
      accessorKey: 'id',
      sortable: false,
      cell: (row) => (
        <button
          type="button"
          className={`${formStyles.btn} ${formStyles.btnSecondary}`}
          style={{ padding: '0.375rem 0.625rem' }}
          onClick={() => setDetail(row)}
        >
          Detalhes
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className={formStyles.pageHeader}>
        <h1 className={formStyles.pageTitle}>Auditoria</h1>
      </div>

      {loading ? (
        <TableSkeleton columns={6} />
      ) : notConfigured ? (
        <div className="card" style={{ padding: '2rem' }}>
          <p style={{ marginBottom: '0.5rem', fontWeight: 600, color: 'var(--foreground)' }}>
            Auditoria ainda não configurada.
          </p>
          <p style={{ fontSize: '0.9rem', color: 'var(--foreground-muted)' }}>
            Para começar a registrar quem adiciona, edita ou exclui registros, execute o
            script <code>docs/audit-log.sql</code> uma única vez no SQL Editor do Supabase.
            Depois, recarregue esta página.
          </p>
          <button
            type="button"
            className={`${formStyles.btn} ${formStyles.btnPrimary}`}
            style={{ marginTop: '1rem' }}
            onClick={fetchAudit}
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          <div className="card" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label className={formStyles.label} style={{ display: 'block', marginBottom: '0.4rem' }} htmlFor="action-filter">Ação</label>
              <select id="action-filter" className={formStyles.select} value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
                <option value="">Todas</option>
                <option value="INSERT">Adicionados</option>
                <option value="UPDATE">Editados</option>
                <option value="DELETE">Excluídos</option>
              </select>
            </div>
            <div>
              <label className={formStyles.label} style={{ display: 'block', marginBottom: '0.4rem' }} htmlFor="table-filter">Tabela</label>
              <select id="table-filter" className={formStyles.select} value={tableFilter} onChange={(e) => setTableFilter(e.target.value)}>
                <option value="">Todas</option>
                {Object.entries(TABLE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          <Table data={filtered} columns={columns} searchKeys={['nome', 'user_email', 'table_name']} emptyMessage="Nenhuma alteração registrada." />
        </>
      )}

      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title="Detalhes da alteração">
        {detail && <AuditDiff entry={detail} />}
      </Modal>
    </div>
  );
}
