'use client';

import { ReactNode, useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import styles from './modal.module.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  closeLabel?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
const FIRST_FIELD =
  'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled])';

export function Modal({ isOpen, onClose, title, children, closeLabel = 'Fechar' }: ModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const previouslyFocused = useRef<HTMLElement | null>(null);
  // Keep the latest onClose without re-triggering the effect on every parent render
  // (callers pass inline handlers, so onClose changes identity each render).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocused.current = document.activeElement as HTMLElement;
    // No body scroll lock: scrolling on the backdrop scrolls the page behind
    // (the overlay itself is not scrollable, so wheel events chain to the
    // document); scrolling inside .content scrolls the modal only.

    const focusFirst = () => {
      const root = containerRef.current;
      if (!root) return;
      const field = root.querySelector<HTMLElement>(FIRST_FIELD);
      if (field) {
        field.focus();
        return;
      }
      const any = root.querySelector<HTMLElement>(FOCUSABLE);
      (any ?? root).focus();
    };
    const raf = requestAnimationFrame(focusFirst);

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key === 'Tab' && containerRef.current) {
        const nodes = Array.from(
          containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
        );
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        const active = document.activeElement as HTMLElement;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKey);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', handleKey);
      previouslyFocused.current?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        ref={containerRef}
        className={`${styles.container} animate-in`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 className={styles.title} id={titleId}>{title}</h2>
          <button onClick={onClose} className={styles.closeBtn} aria-label={closeLabel}>
            <X size={20} />
          </button>
        </div>
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
