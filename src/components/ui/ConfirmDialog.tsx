import React, { useRef } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

/**
 * Diálogo de confirmación único de la app (reemplaza window.confirm y los
 * modales "¿Eliminar?" armados a mano). El foco inicial va a "Cancelar" en
 * acciones destructivas para evitar confirmar por accidente con Enter.
 */
export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger = acción destructiva (rojo); default = confirmación normal. */
  tone?: 'danger' | 'default';
  loading?: boolean;
  zIndex?: number;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'default',
  loading = false,
  zIndex,
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const isDanger = tone === 'danger';
  const Icon = isDanger ? AlertTriangle : HelpCircle;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      zIndex={zIndex}
      initialFocusRef={isDanger ? cancelRef : undefined}
    >
      <div className="pt-2 pb-2 space-y-6">
        <div
          className={`flex gap-4 items-start p-4 rounded-xl border ${
            isDanger
              ? 'bg-status-danger/10 border-status-danger/20'
              : 'bg-brand-primary/10 border-brand-primary/20'
          }`}
        >
          <div
            className={`p-2.5 rounded-full shrink-0 ${
              isDanger ? 'bg-status-danger/20 text-status-danger-soft' : 'bg-brand-primary/20 text-brand-primary-hi'
            }`}
          >
            <Icon size={22} aria-hidden="true" />
          </div>
          {message && (
            <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap min-w-0 pt-1">
              {message}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button ref={cancelRef} variant="secondary" fullWidth onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={isDanger ? 'danger' : 'primary'} fullWidth onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
