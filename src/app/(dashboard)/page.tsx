'use client';

import { useState, useEffect, useMemo } from 'react';
import { Users, Package, Building2, Tag } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import formStyles from '@/components/ui/form.module.css';
import { Table, Column } from '@/components/ui/Table';
import { RepresentativeCard, Representative } from '@/components/dashboard/RepresentativeCard';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Data State
  const [states, setStates] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [matSellers, setMatSellers] = useState<any[]>([]);
  const [counts, setCounts] = useState({ materials: 0, companies: 0, brands: 0 });

  // Filter State
  const [stateFilter, setStateFilter] = useState('');
  // Directory sort: by tier (desc) or name
  const [sortMode, setSortMode] = useState<'tier' | 'name'>('tier');

  const supabase = createClient();

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(false);

    try {
      const [statesRes, sellersRes, msRes, matCountRes, compCountRes, brandCountRes] = await Promise.all([
        supabase.from('state').select('id, name').order('name'),
        supabase.from('seller').select(
          'id, name, tier, banner_url, seller_contact(id, state_id, alias_name, phone, email, address, bairro, cep)'
        ),
        supabase.from('material_seller').select(`
          seller_id,
          state_id,
          seller ( name ),
          material ( id, brand ( name ) )
        `),
        supabase.from('material').select('*', { count: 'exact', head: true }),
        supabase.from('company').select('*', { count: 'exact', head: true }),
        supabase.from('brand').select('*', { count: 'exact', head: true }),
      ]);

      if (statesRes.data) setStates(statesRes.data);
      if (sellersRes.data) setSellers(sellersRes.data);
      if (msRes.data) setMatSellers(msRes.data);
      setCounts({
        materials: matCountRes.count ?? 0,
        companies: compCountRes.count ?? 0,
        brands: brandCountRes.count ?? 0,
      });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []); // Run once on mount

  // Sellers in scope for the current state filter (via material_seller join)
  const sellerIdsInScope = useMemo(() => {
    return stateFilter
      ? new Set(matSellers.filter(ms => ms.state_id?.toString() === stateFilter).map(ms => ms.seller_id))
      : null;
  }, [matSellers, stateFilter]);

  // 1. Aggregation for Pie Chart
  const pieChartData = useMemo(() => {
    const sellersInScope = sellerIdsInScope
      ? sellers.filter(s => sellerIdsInScope.has(s.id))
      : sellers;

    const tierCounts = sellersInScope.reduce((acc, s) => {
      const t = (s.tier !== null && s.tier !== undefined) ? String(s.tier).trim() : 'Sem Nível';
      const key = t === '' ? 'Sem Nível' : t;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return tierCounts;
  }, [sellers, sellerIdsInScope]);

  // 2. Aggregation for Table
  const tableData = useMemo(() => {
    const filteredMs = stateFilter
      ? matSellers.filter(ms => ms.state_id?.toString() === stateFilter)
      : matSellers;

    const aggregation = filteredMs.reduce((acc, ms) => {
      const sellerName = ms.seller?.name || 'Desconhecido';
      let brandName = 'Sem Marca';
      if (ms.material && !Array.isArray(ms.material)) {
        brandName = (ms.material as any).brand?.name || 'Sem Marca';
      }

      const key = `${sellerName}::${brandName}`;
      if (!acc[key]) acc[key] = { representante: sellerName, marca: brandName, count: 0 };
      acc[key].count += 1;
      return acc;
    }, {} as Record<string, { representante: string, marca: string, count: number }>);

    return Object.values(aggregation).sort((a: any, b: any) =>
      b.count - a.count || a.representante.localeCompare(b.representante)
    );
  }, [matSellers, stateFilter]);

  // 3. Representatives directory (cards), sorted.
  // Contact shown: the one for the selected state, falling back to the first.
  const representatives = useMemo<Representative[]>(() => {
    const scope = sellerIdsInScope
      ? sellers.filter(s => sellerIdsInScope.has(s.id))
      : sellers;

    const toRep = (s: any): Representative => {
      const list = (s.seller_contact ?? []) as Array<Representative['contact'] & { state_id: number }>;
      const contact = stateFilter
        ? list.find(c => String(c.state_id) === stateFilter) ?? list[0] ?? null
        : list[0] ?? null;
      return { name: s.name, tier: s.tier, banner_url: s.banner_url, contact };
    };

    const sorted = scope.map(toRep);
    if (sortMode === 'tier') {
      sorted.sort((a, b) => (b.tier ?? -1) - (a.tier ?? -1) || (a.name || '').localeCompare(b.name || ''));
    } else {
      sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    return sorted;
  }, [sellers, sellerIdsInScope, sortMode, stateFilter]);

  const columns: Column<any>[] = [
    { header: 'Representante', accessorKey: 'representante' },
    { header: 'Marca', accessorKey: 'marca' },
    { header: 'Qtd de Materiais', accessorKey: 'count', sortable: true }
  ];

  // Helper to render pure CSS Pie Chart
  const renderPieChart = (counts: Record<string, number>) => {
    const entries = Object.entries(counts).sort((a,b) => b[1] - a[1]);
    if (entries.length === 0) {
      return <div style={{ padding: '2rem', color: 'var(--foreground-muted)' }}>Nenhum dado encontrado para o filtro atual.</div>;
    }

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];
    const total = entries.reduce((sum, [, c]) => sum + c, 0);

    let conicArr: string[] = [];
    let start = 0;

    const legend = entries.map(([tier, count], i) => {
      const color = colors[i % colors.length];
      const pct = (count / total) * 100;
      const end = start + pct;
      conicArr.push(`${color} ${start}% ${end}%`);
      start = end;
      return { tier, count, color, pct };
    });

    const ariaSummary = `Distribuição de ${total} representantes por nível: ${entries.map(([t, c]) => `${t}: ${c}`).join(', ')}.`;

    return (
      <div style={{ display: 'flex', gap: '3rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div
          role="img"
          aria-label={ariaSummary}
          style={{
            width: '180px', height: '180px', borderRadius: '50%',
            background: `conic-gradient(${conicArr.join(', ')})`,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: '4px solid var(--surface-color)',
            flexShrink: 0,
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {legend.map(l => (
            <div key={l.tier} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: l.color, flexShrink: 0 }} />
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{l.tier}</span>
              <span style={{ color: 'var(--foreground-muted)', fontSize: '0.9rem' }}>
                {l.count} representante{l.count > 1 ? 's' : ''} ({l.pct.toFixed(1)}%)
              </span>
            </div>
          ))}
          <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)', fontSize: '0.9rem', color: 'var(--foreground-muted)' }}>
            Total: <strong>{total}</strong>
          </div>
        </div>
      </div>
    );
  };

  const kpis = [
    { label: 'Representantes', value: sellers.length, icon: Users, color: 'var(--primary)' },
    { label: 'Materiais', value: counts.materials, icon: Package, color: '#10b981' },
    { label: 'Empresas', value: counts.companies, icon: Building2, color: '#f59e0b' },
    { label: 'Marcas', value: counts.brands, icon: Tag, color: '#8b5cf6' },
  ];

  const filteredStateName = stateFilter
    ? states.find(s => s.id.toString() === stateFilter)?.name
    : null;
  const directoryHeading = filteredStateName
    ? `${representatives.length} representante${representatives.length > 1 ? 's' : ''} em ${filteredStateName}`
    : `${representatives.length} representante${representatives.length > 1 ? 's' : ''} no total`;

  return (
    <div>
      <div className={formStyles.pageHeader}>
        <h1 className={formStyles.pageTitle}>Dashboard Geral</h1>
      </div>

      {loading ? (
        <>
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div className="skeleton" style={{ width: '3rem', height: '3rem', borderRadius: 'var(--radius-md)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ height: '1.5rem', width: '40%', marginBottom: '0.5rem' }} />
                  <div className="skeleton" style={{ height: '0.85rem', width: '70%' }} />
                </div>
              </div>
            ))}
          </section>
          <div className="card skeleton" style={{ height: '180px', marginBottom: '2rem' }} />
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card" style={{ overflow: 'hidden' }}>
                <div className="skeleton" style={{ height: '110px', borderRadius: 0 }} />
                <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div className="skeleton" style={{ height: '1rem', width: '60%' }} />
                  <div className="skeleton" style={{ height: '0.85rem', width: '80%' }} />
                  <div className="skeleton" style={{ height: '0.85rem', width: '50%' }} />
                </div>
              </div>
            ))}
          </section>
          <div className="card skeleton" style={{ height: '320px' }} />
        </>
      ) : error ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--foreground-muted)' }}>
          <p style={{ marginBottom: '1rem' }}>Não foi possível carregar os dados do painel.</p>
          <button
            type="button"
            className={`${formStyles.btn} ${formStyles.btnPrimary}`}
            onClick={fetchDashboardData}
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          {/* KPI summary cards */}
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {kpis.map(k => {
              const Icon = k.icon;
              return (
                <div key={k.label} className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span
                    aria-hidden="true"
                    style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: '3rem', height: '3rem', borderRadius: 'var(--radius-md)',
                      background: `color-mix(in srgb, ${k.color} 12%, transparent)`,
                      color: k.color, flexShrink: 0,
                    }}
                  >
                    <Icon size={24} />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--foreground)', lineHeight: 1.2 }}>{k.value}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--foreground-muted)' }}>{k.label}</div>
                  </div>
                </div>
              );
            })}
          </section>

          <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'flex-end', gap: '1rem' }}>
            <div style={{ flex: '1', maxWidth: '300px' }}>
              <label className={formStyles.label} style={{ display: 'block', marginBottom: '0.5rem' }} htmlFor="state-filter">Filtrar por Estado Global</label>
              <select
                id="state-filter"
                className={formStyles.select}
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
              >
                <option value="">Todos os Estados</option>
                {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {/* Representatives directory */}
          <section className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', color: 'var(--foreground)', fontWeight: 600 }}>
                Representantes {filteredStateName ? `· ${filteredStateName}` : ''}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--foreground-muted)' }}>{directoryHeading}</span>
                <div role="group" aria-label="Ordenar representantes" style={{ display: 'inline-flex', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  <button
                    type="button"
                    onClick={() => setSortMode('tier')}
                    aria-pressed={sortMode === 'tier'}
                    style={{
                      padding: '0.375rem 0.75rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', border: 'none',
                      background: sortMode === 'tier' ? 'var(--primary)' : 'transparent',
                      color: sortMode === 'tier' ? 'var(--primary-foreground)' : 'var(--foreground-muted)',
                    }}
                  >
                    Por nível
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortMode('name')}
                    aria-pressed={sortMode === 'name'}
                    style={{
                      padding: '0.375rem 0.75rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', border: 'none',
                      background: sortMode === 'name' ? 'var(--primary)' : 'transparent',
                      color: sortMode === 'name' ? 'var(--primary-foreground)' : 'var(--foreground-muted)',
                    }}
                  >
                    Por nome
                  </button>
                </div>
              </div>
            </div>

            {representatives.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                {representatives.map((rep, i) => (
                  <RepresentativeCard key={`${rep.name}-${i}`} rep={rep} />
                ))}
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--foreground-muted)' }}>
                Nenhum representante encontrado para o filtro atual.
              </div>
            )}
          </section>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Chart Section */}
            <section className="card" style={{ padding: '2rem' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--foreground)', fontWeight: 600 }}>
                Representantes por Nível (Tier)
              </h2>
              {renderPieChart(pieChartData)}
            </section>

            {/* Table Section */}
            <section className="card" style={{ padding: '2rem' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--foreground)', fontWeight: 600 }}>
                Materiais por Marca & Representante
              </h2>
              {tableData.length > 0 ? (
                <Table
                  data={tableData}
                  columns={columns}
                  searchKeys={['representante', 'marca']}
                />
              ) : (
                <div style={{ color: 'var(--foreground-muted)' }}>Nenhum material encontrado no estado selecionado.</div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
