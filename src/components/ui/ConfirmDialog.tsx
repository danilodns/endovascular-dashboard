'use client';

import { ReactNode } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Modal } from './Modal';
import formStyles from './form.module.css';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  loadingLabel?: string;
  tone?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Excluir',
  cancelLabel = 'Cancelar',
  loadingLabel = 'Excluindo...',
  tone = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={open} onClose={onCancel} title={title}>
      {message && (
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'flex-start',
            marginBottom: '1.5rem',
          }}
        >
          {tone === 'danger' && (
            <span
              aria-hidden="true"
              style={{ color: 'var(--danger)', flexShrink: 0, marginTop: '0.125rem' }}
            >
              <AlertTriangle size={20} />
            </span>
          )}
          <p
            style={{
              color: 'var(--foreground-muted)',
              fontSize: '0.9rem',
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {message}
          </p>
        </div>
      )}

      <div className={formStyles.actions}>
        <button
          type="button"
          className={`${formStyles.btn} ${formStyles.btnSecondary}`}
          onClick={onCancel}
          disabled={loading}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`${formStyles.btn} ${tone === 'danger' ? formStyles.btnDanger : formStyles.btnPrimary}`}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading && (
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
          )}
          {loading ? loadingLabel : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
