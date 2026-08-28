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
