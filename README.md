# Endovascular Hub

Painel administrativo responsivo construído com **Next.js 16 (App Router)**, **React 19** e **Supabase** (Auth + Postgres + Storage), usando **CSS Modules** com variáveis CSS — sem Tailwind nem bibliotecas de UI pesadas.

> Interface em português (PT-BR) com tema claro/escuro, layout responsivo (desktop e mobile), validação de formulários (Zod) e acessibilidade.

## Funcionalidades

- **Autenticação**: login por e-mail/senha via Supabase Auth, rotas protegidas por `src/proxy.ts`.
- **Dashboard**: KPIs, diretório de **Representantes** em cards (com tier), gráfico de distribuição por nível e tabela de materiais × marca × representante, com filtro por estado.
- **CRUD completo** (listagem com busca/ordenação/paginação, criar/editar/excluir com confirmação e validação):
  - **Representantes** (`seller`) — com tier (Ouro/Prata/Bronze), banner, contato e endereço.
  - **Empresas** (`company`) — com banner e estado.
  - **Materiais** (`material`) — com brochura (PDF/imagem), marca e tipo.
  - **Marcas**, **Tipos de Material**, **Estados**, **Procedimentos**.
- **Relacionamentos (N:N)**: Material ↔ Representante (por estado) e Procedimento ↔ Material.
- **Uploads** via Supabase Storage para `banner_url` e `brochure_url`.
- **Auditoria (opcional)**: histórico de quem criou, editou ou excluiu cada registro.

## Pré-requisitos

- **Node.js 20.9+** (exigência do Next.js 16)
- Um projeto no **Supabase** com as tabelas e buckets configurados.

## Configuração

### 1. Variáveis de ambiente

Copie o exemplo e preencha com os dados do seu projeto (Supabase → Project Settings → API):

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### 2. Storage (buckets)

Crie **dois** buckets públicos no Supabase (Storage) com **exatamente** estes nomes — são os mesmos usados no código:

| Bucket | Uso |
|---|---|
| `SellerBanner` | Banners de **representantes** e de **empresas** |
| `Brochure` | Brochuras (PDF/imagem) de **materiais** |

> Observação: empresas usam o bucket `SellerBanner` (configuração atual do código).

### 3. Segurança (RLS)

Habilite o **Row Level Security** e aplique as policies. Um script pronto (revisar antes de executar) está em [`docs/rls-policies.sql`](docs/rls-policies.sql) — ele cria os buckets, as policies de storage e habilita o RLS permitindo acesso total a usuários **autenticados**.

### 4. Autenticação

1. Ative **Email Auth** no Supabase.
2. Cadastre os usuários admin manualmente (não há cadastro público).

### 5. Auditoria (opcional)

Para registrar **quem** adiciona, edita ou exclui registros (incluindo o que mudou, antes/depois), execute uma única vez o script [`docs/audit-log.sql`](docs/audit-log.sql) no SQL Editor do Supabase. Ele cria a tabela `audit_log`, triggers em todas as tabelas e RLS (leitura para autenticados; gravação somente via trigger). Depois, a página **Auditoria** do painel (`/auditoria`) mostra o histórico.

### 6. Usuários (nomes para o painel) — recomendado com a Auditoria

O painel não consegue ler `auth.users`. Para mostrar o **nome** (e não só o e-mail) de quem faz cada alteração, execute uma vez o script [`docs/profiles.sql`](docs/profiles.sql): ele cria a tabela `profiles`, espelha cada usuário de `auth.users` (via trigger) e permite editar o nome na página **Usuários** (`/usuarios`). A auditoria passa a mostrar esse nome.

> Ordem recomendada: rode `profiles.sql` e depois `audit-log.sql` (este último lê o nome de `profiles`).

## Rodando localmente

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) — você será redirecionado para `/login`.

```bash
npm run build   # build de produção
npm run start   # serve o build
```

## Deploy

Recomendado na **Vercel**:

1. Envie o código para um repositório GitHub.
2. Importe o repositório na Vercel.
3. Defina `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` nas variáveis de ambiente.
4. Deploy.
