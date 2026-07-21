-- ════════════════════════════════════════════════════════════════════════
--  Endovascular Hub — Row Level Security (RLS) + Storage
--  ---------------------------------------------------------------------
--  Revisar e executar no SQL Editor do Supabase.
--  Este script NÃO é executado automaticamente pela aplicação.
--
--  Modelo de acesso: o painel inteiro é protegido por autenticação
--  (src/proxy.ts redireciona usuários não autenticados para /login).
--  Por isso, as policies concedem acesso total a usuários autenticados
--  (role "authenticated") e bloqueiam o acesso anônimo (role "anon").
-- ════════════════════════════════════════════════════════════════════════

-- 1. Buckets de Storage ---------------------------------------------------
-- A aplicação usa estes dois buckets (nomes exatos usados no código):
--   • SellerBanner  -> banners de representantes (seller) e empresas (company)
--   • Brochure      -> brochuras (PDF/imagem) de materiais
insert into storage.buckets (id, name, public) values
  ('SellerBanner', 'SellerBanner', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public) values
  ('Brochure', 'Brochure', true)
on conflict (id) do nothing;

-- 2. Policies de Storage -------------------------------------------------
-- Bucket SellerBanner (banners de representantes e empresas)
create policy "sellerbanner read autenticado"
  on storage.objects for select to authenticated
  using (bucket_id = 'SellerBanner');

create policy "sellerbanner inserir autenticado"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'SellerBanner');

create policy "sellerbanner atualizar autenticado"
  on storage.objects for update to authenticated
  using (bucket_id = 'SellerBanner') with check (bucket_id = 'SellerBanner');

create policy "sellerbanner excluir autenticado"
  on storage.objects for delete to authenticated
  using (bucket_id = 'SellerBanner');

-- Bucket Brochure (brochuras de materiais)
create policy "brochure read autenticado"
  on storage.objects for select to authenticated
  using (bucket_id = 'Brochure');

create policy "brochure inserir autenticado"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'Brochure');

create policy "brochure atualizar autenticado"
  on storage.objects for update to authenticated
  using (bucket_id = 'Brochure') with check (bucket_id = 'Brochure');

create policy "brochure excluir autenticado"
  on storage.objects for delete to authenticated
  using (bucket_id = 'Brochure');

-- 3. RLS nas tabelas do banco --------------------------------------------
-- Habilita RLS e permite acesso total apenas a usuários autenticados.
-- Repita o bloco abaixo para cada tabela do schema.

alter table public.state             enable row level security;
drop policy if exists "acesso autenticado" on public.state;
create policy "acesso autenticado" on public.state             for all to authenticated using (true) with check (true);

alter table public.brand            enable row level security;
drop policy if exists "acesso autenticado" on public.brand;
create policy "acesso autenticado" on public.brand            for all to authenticated using (true) with check (true);

alter table public.seller           enable row level security;
drop policy if exists "acesso autenticado" on public.seller;
create policy "acesso autenticado" on public.seller           for all to authenticated using (true) with check (true);

alter table public.procedure        enable row level security;
drop policy if exists "acesso autenticado" on public.procedure;
create policy "acesso autenticado" on public.procedure        for all to authenticated using (true) with check (true);

alter table public.material_type    enable row level security;
drop policy if exists "acesso autenticado" on public.material_type;
create policy "acesso autenticado" on public.material_type    for all to authenticated using (true) with check (true);

alter table public.material         enable row level security;
drop policy if exists "acesso autenticado" on public.material;
create policy "acesso autenticado" on public.material         for all to authenticated using (true) with check (true);

alter table public.procedure_material enable row level security;
drop policy if exists "acesso autenticado" on public.procedure_material;
create policy "acesso autenticado" on public.procedure_material for all to authenticated using (true) with check (true);

alter table public.material_seller  enable row level security;
drop policy if exists "acesso autenticado" on public.material_seller;
create policy "acesso autenticado" on public.material_seller  for all to authenticated using (true) with check (true);

alter table public.company          enable row level security;
drop policy if exists "acesso autenticado" on public.company;
create policy "acesso autenticado" on public.company          for all to authenticated using (true) with check (true);
