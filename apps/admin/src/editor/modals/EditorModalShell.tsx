import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import './EditorModal.css';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

interface EditorModalShellProps {
  isOpen: boolean;
  title: React.ReactNode;
  icon?: React.ReactNode;
  maxWidth?: string;
  isWide?: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function EditorModalShell({
  isOpen,
  title,
  icon,
  maxWidth = '400px',
  isWide = false,
  onClose,
  children,
}: EditorModalShellProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const lastActiveElementRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    lastActiveElementRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const dialog = dialogRef.current;
    const focusableElement = dialog?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);

    window.setTimeout(() => {
      (focusableElement || dialog)?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) {
        return;
      }

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((element) => !element.hasAttribute('disabled') && element.offsetParent !== null);

      if (focusableElements.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      lastActiveElementRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div className="editor-modal-backdrop" role="presentation">
      <div
        ref={dialogRef}
        className={`editor-modal-shell glass${isWide ? ' editor-modal-shell--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={{
          maxWidth,
        }}
      >
        <h4 id={titleId} className="editor-modal-title">
          {icon}
          <span>{title}</span>
        </h4>

        <div className="editor-modal-content">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
