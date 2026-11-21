import type { ReactNode } from 'react';
import { Button } from './input';
import { Modal } from './Modal';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  tone?: 'default' | 'danger';
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}

/**
 * Destructive/affirmative confirmation on top of `Modal`. Focus lands on
 * Cancel by default, so Enter never triggers the irreversible action.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  tone = 'default',
  confirmLabel,
  cancelLabel = 'Batal',
  onConfirm,
  onClose,
  loading,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      size="sm"
      initialFocusSelector="[data-autofocus]"
      footer={
        <>
          <Button variant="secondary" data-autofocus onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {description}
    </Modal>
  );
}
