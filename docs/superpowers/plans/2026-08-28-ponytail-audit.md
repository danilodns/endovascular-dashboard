# Ponytail Audit Findings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the 2026-08-28 ponytail-audit findings: delete dead code and an unused dep, shrink `zodErrors`, and deduplicate the copy-pasted CRUD scaffold into one `useCrud` hook.

**Architecture:** Four near-identical dashboard pages (material-types, brands, procedures, states) each hand-roll ~120 lines of list-fetch / save-modal / confirm-delete plumbing against Supabase. A single `useCrud<T>` hook in `src/lib/useCrud.ts` owns that plumbing; pages keep only columns, form fields, and page-specific flows (materials modals, copy-relations). Deletions land first because they are certain and independent.

**Tech Stack:** Next.js 16 (App Router, `src/proxy.ts` is the middleware convention — do not touch), React 19, `@supabase/supabase-js` browser client, zod v4, react-hot-toast, CSS modules.

**Spec:** `/ponytail:ponytail-audit` output from 2026-08-28 (this session). Findings: 2 dead schemas, 2 dead lib files, 1 dead dep (`axios`), 1 unused type import, `zodErrors` hand-rolls `z.flattenError`, CRUD scaffold duplicated across pages.

## Global Constraints

- This repo has **no test runner** (`package.json` scripts: dev/build/start/lint). Do not add one. The verification cycle for every task is: `npx tsc --noEmit` → `npm run build` → manual smoke on `npm run dev`.
- Behavior must not change. This is refactor + deletion only. The one intentional copy change: toast/confirm strings normalize to the hook's templates (existing copy is already inconsistent — e.g. `Erro ao excluir o tipo...` vs `Erro ao excluir estado...`).
- Work on branch `chore/ponytail-audit` branched from `main`.
- Do NOT convert `companies`, `materials`, `sellers`, `usuarios` — their forms are bespoke enough that the hook saves little (audit ceiling acknowledged; they can adopt it when next touched). Do NOT touch `src/proxy.ts` beyond removing the unused import.
- Commit after each task. Messages follow repo style: `chore:`/`refactor:` + lowercase summary.

---

### Task 1: Dead code sweep (audit findings: dead files, dead schemas, dead dep, dead import)

**Files:**
- Delete: `src/lib/supabase.ts` (6 lines, zero importers)
- Delete: `src/lib/supabase-server.ts` (29 lines, zero importers)
- Modify: `src/lib/validation.ts` (remove `procedureMaterialSchema` lines 41-44 and `materialSellerSchema` lines 46-50)
- Modify: `src/proxy.ts:1` (remove `, type CookieOptions`)
- Modify: `package.json` (via `npm uninstall axios`)

**Interfaces:**
- Consumes: nothing.
- Produces: `validation.ts` exporting only `procedureSchema`, `brandSchema`, `materialTypeSchema`, `stateSchema`, `materialSchema`, `companySchema`, `sellerSchema`, `sellerContactSchema`, `zodErrors`. Later tasks rely on those names being unchanged.

- [ ] **Step 1: Confirm the files are still unreferenced**

```bash
grep -rn "lib/supabase'" src ; grep -rn "lib/supabase-server" src ; grep -rn "axios" src ; grep -rn "procedureMaterialSchema\|materialSellerSchema" src/app
```

Expected: no output from any of the four greps (first matches nothing because `supabase-browser` importers spell it fully).

- [ ] **Step 2: Delete files and code**

```bash
git rm src/lib/supabase.ts src/lib/supabase-server.ts
npm uninstall axios
```

Edit `src/lib/validation.ts`: delete these two blocks plus their blank lines:

```ts
export const procedureMaterialSchema = z.object({
  procedure_id: requiredString('Selecione o procedimento.'),
  material_id: requiredString('Selecione o material.'),
});

export const materialSellerSchema = z.object({
  state_id: requiredString('Selecione o estado.'),
  seller_id: requiredString('Selecione o representante.'),
  material_id: requiredString('Selecione o material.'),
});
```

Edit `src/proxy.ts:1` from:

```ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
```

to:

```ts
import { createServerClient } from '@supabase/ssr'
```

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit && npm run build
```

Expected: both pass, exit 0.

- [ ] **Step 4: Smoke test**

```bash
npm run dev
```

Open `/`, `/procedures`, `/material-types`, `/brands`, `/states` — each lists rows; login gate still redirects when signed out (proves `proxy.ts` still runs).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove dead supabase clients, unused schemas, axios dep, dead import"
```

---

### Task 2: Shrink `zodErrors` onto `z.flattenError` (audit finding: hand-rolled stdlib)

**Files:**
- Modify: `src/lib/validation.ts:52-60`

**Interfaces:**
- Consumes: zod v4 (`z.flattenError` is the v4 replacement for the deprecated `error.flatten()`).
- Produces: unchanged export — `zodErrors(error: z.ZodError): Record<string, string>` (first message per field). All 9 importer pages and Task 3's hook rely on this exact name and signature.

- [ ] **Step 1: Replace the function body**

From:

```ts
/** Converts a ZodError into a flat { field: message } map (first message per field wins). */
export function zodErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '');
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}
```

to:

```ts
/** Converts a ZodError into a flat { field: message } map (first message per field wins). */
export const zodErrors = (error: z.ZodError): Record<string, string> =>
  Object.fromEntries(
    Object.entries(z.flattenError(error).fieldErrors)
      .map(([key, messages]) => [key, messages?.[0]])
      .filter(([, msg]) => !!msg)
  );
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit && npm run build
```

Expected: pass. If `z.flattenError` is not exported at this zod version, check `node_modules/zod` exports and fall back to `error.flatten().fieldErrors` with a deprecation-acceptable note — the shape is identical.

- [ ] **Step 3: Smoke test the error path**

```bash
npm run dev
```

On `/material-types`: open Adicionar, submit empty form → the "Informe o nome do tipo de material." message still renders under the field (validation errors flow through `zodErrors`).

- [ ] **Step 4: Commit**

```bash
git add src/lib/validation.ts
git commit -m "refactor: zodErrors via z.flattenError"
```

---

### Task 3: `useCrud` hook + convert material-types (audit finding: CRUD scaffold ×8)

**Files:**
- Create: `src/lib/useCrud.ts`
- Modify: `src/app/(dashboard)/material-types/page.tsx` (full rewrite, 226 → ~120 lines)

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase-browser`; `zodErrors`, a zod object schema from `@/lib/validation`.
- Produces (Tasks 4-6 depend on this exact shape):

```ts
type CrudLabels = { singular: string; plural: string; gender: 'o' | 'a' };

function useCrud<T extends { id: number }>(
  table: string,
  schema: z.ZodType,
  labels: CrudLabels,
  orderBy?: { column: string; ascending: boolean }, // default { column: 'id', ascending: false }
): {
  rows: T[];
  loading: boolean;
  refresh: () => Promise<void>;
  supabase: SupabaseClient;            // for page-specific flows (states Task 6)
  isModalOpen: boolean;
  editing: T | null;
  openModal: (row?: T) => void;        // sets editing + clears errors + opens
  closeModal: () => void;              // closes + clears editing
  saving: boolean;
  errors: Record<string, string>;
  save: (payload: Record<string, unknown>, afterInsert?: (newRow: T) => Promise<void>) => Promise<void>;
  requestDelete: (row: T) => void;
  confirm: { open: boolean; title: string; message: string; confirmLabel: 'Excluir'; loading: boolean; onConfirm: () => Promise<void>; onCancel: () => void };
}
```

`afterInsert`, when provided, replaces the default "criad{g} com sucesso" toast (states uses it for copy-relations). Toast/confirm copy templates: `Erro ao buscar ${plural}`, `${singular} criad${gender} com sucesso`, `${singular} atualizad${gender} com sucesso`, `${singular} excluíd${gender} com sucesso`, `Erro ao excluir ${singular}. Pode estar em uso.`, `Erro ao salvar ${singular}`, confirm title `Excluir ${singular}`, message `Tem certeza que deseja excluir ${gender === 'o' ? 'este' : 'esta'} ${singular}? Esta ação não pode ser desfeita.`

- [ ] **Step 1: Write `src/lib/useCrud.ts`**

```ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { zodErrors } from '@/lib/validation';
import toast from 'react-hot-toast';
import type { z } from 'zod';

type Labels = { singular: string; plural: string; gender: 'o' | 'a' };

export function useCrud<T extends { id: number }>(
  table: string,
  schema: z.ZodType,
  labels: Labels,
  orderBy: { column: string; ascending: boolean } = { column: 'id', ascending: false },
) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<T | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const supabase = createClient();
  const g = labels.gender;

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order(orderBy.column, { ascending: orderBy.ascending });
    if (error) toast.error(`Erro ao buscar ${labels.plural}`);
    else setRows((data as T[]) || []);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);

  useEffect(() => { refresh(); }, [refresh]);

  const openModal = (row?: T) => {
    setEditing(row ?? null);
    setErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
  };

  const save = async (payload: Record<string, unknown>, afterInsert?: (newRow: T) => Promise<void>) => {
    const result = schema.safeParse(payload);
    if (!result.success) {
      setErrors(zodErrors(result.error));
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase.from(table).update(payload).eq('id', editing.id);
        if (error) throw error;
        toast.success(`${labels.singular} atualizad${g} com sucesso`);
      } else {
        const { data, error } = await supabase.from(table).insert([payload]).select('id').single();
        if (error) throw error;
        if (afterInsert) await afterInsert(data as T);
        else toast.success(`${labels.singular} criad${g} com sucesso`);
      }
      closeModal();
      refresh();
    } catch (error: any) {
      toast.error(error.message || `Erro ao salvar ${labels.singular}`);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const { error } = await supabase.from(table).delete().eq('id', pendingDelete.id);
    setDeleting(false);
    if (error) {
      toast.error(`Erro ao excluir ${labels.singular}. Pode estar em uso.`);
    } else {
      toast.success(`${labels.singular} excluíd${g} com sucesso`);
      setPendingDelete(null);
      refresh();
    }
  };

  return {
    rows, loading, refresh, supabase,
    isModalOpen, editing, openModal, closeModal,
    saving, errors, save,
    requestDelete: setPendingDelete,
    confirm: {
      open: !!pendingDelete,
      title: `Excluir ${labels.singular}`,
      message: `Tem certeza que deseja excluir ${g === 'o' ? 'este' : 'esta'} ${labels.singular}? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir' as const,
      loading: deleting,
      onConfirm: confirmDelete,
      onCancel: () => setPendingDelete(null),
    },
  };
}
```

- [ ] **Step 2: Rewrite `src/app/(dashboard)/material-types/page.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useCrud } from '@/lib/useCrud';
import { Table, Column } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { materialTypeSchema } from '@/lib/validation';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import formStyles from '@/components/ui/form.module.css';

type MaterialType = {
  id: number;
  name: string;
};

export default function MaterialTypesPage() {
  const crud = useCrud<MaterialType>('material_type', materialTypeSchema, {
    singular: 'tipo de material', plural: 'tipos de materiais', gender: 'o',
  });
  const [name, setName] = useState('');

  const handleOpenModal = (type?: MaterialType) => {
    crud.openModal(type);
    setName(type?.name ?? '');
  };

  const handleCloseModal = () => {
    crud.closeModal();
    setName('');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    crud.save({ name });
  };

  const columns: Column<MaterialType>[] = [
    { header: 'ID', accessorKey: 'id', width: '4rem' },
    { header: 'Nome', accessorKey: 'name' },
    {
      header: 'Ações',
      accessorKey: 'id',
      sortable: false,
      align: 'center',
      width: '9rem',
      cell: (row) => (
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
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
            onClick={() => crud.requestDelete(row)}
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
        <h1 className={formStyles.pageTitle}>Tipos de Material</h1>
        <button
          className={`${formStyles.btn} ${formStyles.btnPrimary}`}
          onClick={() => handleOpenModal()}
        >
          <Plus size={18} />
          <span>Adicionar Novo</span>
        </button>
      </div>

      {crud.loading ? (
        <TableSkeleton columns={3} />
      ) : (
        <Table
          data={crud.rows}
          columns={columns}
          searchKeys={['name', 'id']}
        />
      )}

      <Modal
        isOpen={crud.isModalOpen}
        onClose={handleCloseModal}
        title={crud.editing ? 'Editar Tipo de Material' : 'Adicionar Novo Tipo'}
      >
        <form onSubmit={handleSave} className={formStyles.form}>
          <div className={formStyles.formGroup}>
            <label className={formStyles.label} htmlFor="name">Nome</label>
            <input
              type="text"
              id="name"
              className={formStyles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              aria-invalid={!!crud.errors.name}
              placeholder="ex. Catálogo"
            />
            {crud.errors.name && <span className={formStyles.errorText} role="alert">{crud.errors.name}</span>}
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
              disabled={crud.saving}
            >
              {crud.saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog {...crud.confirm} />
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit && npm run build
```

Expected: pass. Common failure: the zod schema isn't assignable to `z.ZodType` — if so, loosen the param to `schema: z.ZodType<any>` and re-run.

- [ ] **Step 4: Smoke test full CRUD cycle**

```bash
npm run dev
```

On `/material-types`: list loads newest-first; create (empty submit shows the zod message; valid submit toasts "Tipo de material criado com sucesso" and refetches); edit renames; delete shows the confirm dialog and toasts on success.

- [ ] **Step 5: Commit**

```bash
git add src/lib/useCrud.ts "src/app/(dashboard)/material-types/page.tsx"
git commit -m "refactor: useCrud hook; convert material-types page"
```

---

### Task 4: Convert brands page

**Files:**
- Modify: `src/app/(dashboard)/brands/page.tsx` (357 → ~230 lines)

**Interfaces:**
- Consumes: `useCrud` exactly as produced in Task 3.
- Produces: nothing later tasks use.

Keep untouched: the `capitalize` helper, the entire materials-viewer modal (its state, `handleOpenMaterials`, `handleCloseMaterials`, `toggleTypeGroup`, its JSX), the `Boxes` action button, and the page's own `const supabase = createClient()` (used by the materials modal).

- [ ] **Step 1: Replace the CRUD portion of the page**

Delete `brands/loading/isModalOpen/editingBrand/isSaving/pendingDelete/deleting/errors` state, `fetchBrands`, its `useEffect`, `handleOpenModal`/`handleCloseModal` CRUD bodies, `handleSave`, `handleDelete`, `confirmDelete`. Replace with:

```tsx
const crud = useCrud<Brand>('brand', brandSchema, {
  singular: 'marca', plural: 'marcas', gender: 'a',
});
const [name, setName] = useState('');

const handleOpenModal = (brand?: Brand) => {
  crud.openModal(brand);
  setName(brand?.name ?? '');
};

const handleCloseModal = () => {
  crud.closeModal();
  setName('');
};

const handleSave = (e: React.FormEvent) => {
  e.preventDefault();
  crud.save({ name });
};
```

Then rewire the JSX mechanically: `brands` → `crud.rows`, `loading` → `crud.loading`, `isModalOpen` → `crud.isModalOpen`, `editingBrand` → `crud.editing`, `isSaving` → `crud.saving`, `errors.name` → `crud.errors.name`, the delete action button's `onClick={() => handleDelete(row)}` → `onClick={() => crud.requestDelete(row)}`, and the `<ConfirmDialog ... />` block (8 props) → `<ConfirmDialog {...crud.confirm} />`. Import changes: drop `useEffect`, `zodErrors`, `toast`; add `useCrud`. The materials modal and its imports (`Boxes`, `ChevronDown`, `ChevronRight`, `createClient`, `toast`) stay.

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit && npm run build
```

- [ ] **Step 3: Smoke test**

`npm run dev` → `/brands`: list loads; create/edit/delete marca flows toast feminine copy ("Marca criada com sucesso", "esta marca"); the materials modal still opens from the `Boxes` button and groups by type, collapsed by default.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/brands/page.tsx"
git commit -m "refactor: brands page on useCrud"
```

---

### Task 5: Convert procedures page (base CRUD only)

**Files:**
- Modify: `src/app/(dashboard)/procedures/page.tsx` (495 → ~370 lines)

**Interfaces:**
- Consumes: `useCrud` exactly as produced in Task 3.
- Produces: nothing later tasks use.

Keep untouched: the entire materials modal (all `materialsProcedure/materials/procMaterials/...` state, `fetchProcMaterials`, `handleOpenMaterials`, `handleCloseMaterials`, `handleAddMaterial`, `handleToggleOptional`, `handleRemoveMaterial`, the `cap` helper, and its JSX), the `Boxes` action button, and the page's own `const supabase = createClient()`.

- [ ] **Step 1: Replace the CRUD portion**

Delete `procedures/loading/isModalOpen/editingProcedure/isSaving/pendingDelete/deleting/errors` state, `fetchProcedures`, its `useEffect` (keep the second `useEffect` that prefetches `material` names — change its `supabase` reference to the page's remaining client, already in scope), `handleOpenModal`/`handleCloseModal` bodies, `handleSave`, `handleDelete`, `confirmDelete`. Replace with:

```tsx
const crud = useCrud<Procedure>('procedure', procedureSchema, {
  singular: 'procedimento', plural: 'procedimentos', gender: 'o',
});
const [name, setName] = useState('');

const handleOpenModal = (procedure?: Procedure) => {
  crud.openModal(procedure);
  setName(procedure?.name ?? '');
};

const handleCloseModal = () => {
  crud.closeModal();
  setName('');
};

const handleSave = (e: React.FormEvent) => {
  e.preventDefault();
  crud.save({ name });
};
```

Rewire JSX exactly as Task 4 (`crud.rows`, `crud.loading`, `crud.isModalOpen`, `crud.editing` in the title ternary, `crud.saving`, `crud.errors.name`, `crud.requestDelete(row)`, `<ConfirmDialog {...crud.confirm} />`). The `cap(...)` display capitalization from the previous session's work stays. Imports: drop `useEffect` only if no longer used (the materials prefetch keeps it), drop `zodErrors`; add `useCrud`. `toast` stays (materials modal uses it).

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit && npm run build
```

- [ ] **Step 3: Smoke test**

`npm run dev` → `/procedures`: CRUD works; the materials modal still adds/removes/toggles-obrigatório, groups by type, and capitalizes names.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/procedures/page.tsx"
git commit -m "refactor: procedures page base CRUD on useCrud"
```

---

### Task 6: Convert states page (exercises `afterInsert`)

**Files:**
- Modify: `src/app/(dashboard)/states/page.tsx` (291 → ~200 lines)

**Interfaces:**
- Consumes: `useCrud` exactly as produced in Task 3, including `supabase` and the `afterInsert` callback of `save`.
- Produces: nothing.

- [ ] **Step 1: Replace the CRUD portion**

Delete `states/loading/isModalOpen/editingState/isSaving/pendingDelete/deleting/errors` state, `fetchStates`, its `useEffect`, `handleOpenModal`/`handleCloseModal` CRUD bodies, `handleDelete`, `confirmDelete`. Replace with (note `orderBy` — this page sorts by name ascending):

```tsx
const crud = useCrud<State>('state', stateSchema, {
  singular: 'estado', plural: 'estados', gender: 'o',
}, { column: 'name', ascending: true });
const [name, setName] = useState('');
const [uf, setUf] = useState('');
const [copyFrom, setCopyFrom] = useState('');

const handleOpenModal = (state?: State) => {
  crud.openModal(state);
  setName(state?.name ?? '');
  setUf(state?.uf ?? '');
  if (!state) setCopyFrom('');
};

const handleCloseModal = () => {
  crud.closeModal();
  setName('');
  setUf('');
  setCopyFrom('');
};

const handleSave = (e: React.FormEvent) => {
  e.preventDefault();
  crud.save({ name, uf: uf.toUpperCase() }, async (newState) => {
    if (!copyFrom) {
      toast.success('Estado criado com sucesso');
      return;
    }
    const { data: relations, error: relError } = await crud.supabase
      .from('material_seller')
      .select('seller_id, material_id')
      .eq('state_id', Number(copyFrom));
    if (relError) throw relError;

    if (relations && relations.length > 0) {
      const { error: insertError } = await crud.supabase
        .from('material_seller')
        .insert(relations.map((r) => ({ ...r, state_id: newState.id })));
      if (insertError) throw insertError;
      toast.success(`Estado criado com sucesso (${relations.length} vínculos copiados)`);
    } else {
      toast.success('Estado criado com sucesso (nenhum dado para copiar)');
    }
  });
};
```

Rewire JSX as in Tasks 4-5; the `copyFrom` select block and both form fields stay as-is (reading `crud.errors.name` / `crud.errors.uf`, listing `crud.rows` in the copy select). `<ConfirmDialog {...crud.confirm} />`. Imports: drop `useEffect`, `zodErrors`, `createClient`; `toast` stays (afterInsert toasts); add `useCrud`.

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit && npm run build
```

- [ ] **Step 3: Smoke test**

`npm run dev` → `/states`: list loads alphabetically; create with "Não copiar" toasts plain success; create with a source state copies `material_seller` relations and toasts the count; edit uppercases UF; delete confirms and removes.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/states/page.tsx"
git commit -m "refactor: states page on useCrud with afterInsert copy-relations"
```

---

## Self-Review

- **Spec coverage:** audit findings map — dead files/schemas/dep/import → Task 1; `zodErrors` → Task 2; CRUD dedup → Tasks 3-6 (4 of 8 pages; `companies`/`materials`/`sellers`/`usuarios` deliberately excluded per Global Constraints). All 7 findings addressed or explicitly deferred.
- **Placeholders:** every code step carries the full code; JSX rewires are enumerated property-by-property against code read this session.
- **Type consistency:** `useCrud(table, schema, labels, orderBy?)` signature and the returned keys (`rows/loading/refresh/supabase/isModalOpen/editing/openModal/closeModal/saving/errors/save/requestDelete/confirm`) are identical across Tasks 3-6; `zodErrors` name/signature unchanged in Task 2.
