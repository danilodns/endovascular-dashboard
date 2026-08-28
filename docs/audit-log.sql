-- ════════════════════════════════════════════════════════════════════════
--  Endovascular Hub — Auditoria (histórico de alterações)
--  ---------------------------------------------------------------------
--  Revisar e executar UMA VEZ no SQL Editor do Supabase (idempotente —
--  pode ser re-executado para atualizar a versão anterior).
--  Este script NÃO é executado pela aplicação.
--
--  Após executá-lo, toda inserção/edição/exclusão feita pelo painel em
--  qualquer tabela será registrada automaticamente na tabela audit_log,
--  incluindo QUEM fez (id + nome + e-mail), O QUÊ (ação, tabela, linha) e
--  COMO (antes/depois em JSON). A página /auditoria do painel lê essa tabela.
-- ════════════════════════════════════════════════════════════════════════

-- 1. Tabela de auditoria (somente acréscimo) --------------------------------
create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  user_id     uuid,                                   -- auth.uid() no momento da ação
  user_name   text,                                   -- nome (metadata) — fallback: e-mail
  user_email  text,                                   -- e-mail resolvido de auth.users
  action      text not null check (action in ('INSERT','UPDATE','DELETE')),
  table_name  text not null,
  row_id      text,                                   -- id da linha (null p/ chaves compostas)
  before      jsonb,                                  -- estado anterior  (null em INSERT)
  after       jsonb                                   -- estado posterior (null em DELETE)
);

-- Compatível com a versão anterior: garante a coluna user_name e preenche
-- linhas antigas com o e-mail como fallback.
alter table public.audit_log add column if not exists user_name text;
update public.audit_log set user_name = user_email
 where user_name is null and user_email is not null;

comment on table  public.audit_log is 'Histórico de alterações (preenchido por triggers).';
comment on column public.audit_log.user_id is 'Usuário que fez a alteração; null = ação de sistema/service role.';
comment on column public.audit_log.user_name is 'Nome do usuário (lido de public.profiles; fallback e-mail).';

-- 2. Função de trigger (SECURITY DEFINER) -----------------------------------
--    Roda como dono (postgres), então consegue gravar em audit_log e ler
--    auth.users mesmo com RLS ativo.
create or replace function public.fn_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid  uuid := auth.uid();
  v_mail text;
  v_name text;
  v_row  jsonb;
  v_id   text;
begin
  if v_uid is not null then
    select u.email into v_mail from auth.users u where u.id = v_uid;
    -- Nome vem de public.profiles (editável no painel). Se a tabela ainda
    -- não existir, ignora com segurança para não quebrar a escrita.
    begin
      select p.name into v_name from public.profiles p where p.id = v_uid;
    exception
      when undefined_table then
        v_name := null;
    end;
  end if;

  -- fallback: se não houver nome, mostra o e-mail
  v_name := coalesce(v_name, v_mail);

  if tg_op = 'DELETE' then
    v_row := to_jsonb(old);
    v_id  := v_row ->> 'id';
    insert into public.audit_log (user_id, user_name, user_email, action, table_name, row_id, before, after)
      values (v_uid, v_name, v_mail, tg_op, tg_table_name, v_id, v_row, null);
    return old;
  end if;

  v_row := to_jsonb(new);
  v_id  := v_row ->> 'id';

  if tg_op = 'UPDATE' then
    insert into public.audit_log (user_id, user_name, user_email, action, table_name, row_id, before, after)
      values (v_uid, v_name, v_mail, tg_op, tg_table_name, v_id, to_jsonb(old), v_row);
  else -- INSERT
    insert into public.audit_log (user_id, user_name, user_email, action, table_name, row_id, before, after)
      values (v_uid, v_name, v_mail, tg_op, tg_table_name, v_id, null, v_row);
  end if;

  return new;
end;
$$;

-- 3. Triggers em cada tabela ------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'state','brand','seller','seller_contact','procedure','material_type','material',
    'procedure_material','material_seller','company'
  ]
  loop
    execute format('drop trigger if exists trg_audit_log on public.%I;', t);
    execute format(
      'create trigger trg_audit_log after insert or update or delete on public.%I '
      'for each row execute function public.fn_audit_log();', t);
  end loop;
end $$;

-- 4. Segurança: leitura para autenticados; escrita SÓ pela trigger ---------
alter table public.audit_log enable row level security;

grant select on public.audit_log to authenticated;
revoke insert on public.audit_log from anon, authenticated;
revoke update on public.audit_log from anon, authenticated;
revoke delete on public.audit_log from anon, authenticated;

drop policy if exists "audit leitura autenticado" on public.audit_log;
create policy "audit leitura autenticado"
  on public.audit_log for select to authenticated
  using (true);
-- Sem policies de INSERT/UPDATE/DELETE => clientes não conseguem alterar o log.
-- A trigger (SECURITY DEFINER, dono = postgres) ignora a RLS ao gravar.
