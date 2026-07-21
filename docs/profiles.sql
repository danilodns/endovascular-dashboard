-- ════════════════════════════════════════════════════════════════════════
--  Endovascular Hub — Perfis de usuário (nomes para o painel)
--  ---------------------------------------------------------------------
--  Revisar e executar UMA VEZ no SQL Editor do Supabase (idempotente).
--  Executar ANTES de re-rodar docs/audit-log.sql.
--
--  O painel não consegue ler a tabela auth.users (acesso restrito). Esta
--  tabela profiles espelha id/e-mail de cada usuário e guarda o NOME de
--  exibição, que pode ser editado na página "Usuários" do painel. A
--  auditoria (audit_log.user_name) passa a ler o nome daqui.
-- ════════════════════════════════════════════════════════════════════════

-- 1. Tabela de perfis -------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  name       text,
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Dados de exibição dos usuários (nome). Espelha auth.users via trigger.';
comment on column public.profiles.name is 'Nome de exibição, editável pelo painel (página Usuários).';

-- 2. Backfill: criar perfil para usuários já existentes --------------------
insert into public.profiles (id, email, name)
select u.id, u.email,
       coalesce(u.raw_user_meta_data ->> 'name', u.raw_user_meta_data ->> 'full_name')
from auth.users u
on conflict (id) do update set
  email = excluded.email;

-- 3. Trigger: criar/atualizar perfil quando um usuário é criado ------------
create or replace function public.fn_profile_from_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name')
  )
  on conflict (id) do update set
    email = excluded.email;          -- mantém o e-mail sincronizado; NÃO sobrescreve o nome
  return new;
end;
$$;

drop trigger if exists trg_profile_from_user on auth.users;
create trigger trg_profile_from_user
  after insert on auth.users
  for each row execute function public.fn_profile_from_user();

-- 4. RLS: autenticados leem todos; autenticados atualizam ------------------
--    (painel é de uso interno/confiança — só edita o nome via tela Usuários)
alter table public.profiles enable row level security;

grant select on public.profiles to authenticated;
grant update on public.profiles to authenticated;
-- sem grant de insert/delete para clientes: a trigger (SECURITY DEFINER) cria;

drop policy if exists "profiles leitura autenticado" on public.profiles;
create policy "profiles leitura autenticado"
  on public.profiles for select to authenticated using (true);

drop policy if exists "profiles atualizacao autenticado" on public.profiles;
create policy "profiles atualizacao autenticado"
  on public.profiles for update to authenticated using (true) with check (true);
