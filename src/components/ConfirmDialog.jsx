import { useEffect, useId, useRef } from 'react';

/**
 * Diálogo de confirmação para ações destrutivas ou irreversíveis.
 * Renderizado pelo React (sem o JS do Bootstrap). Esc ou "Cancelar" fecham;
 * o foco vai para "Cancelar" ao abrir e volta ao elemento anterior ao fechar.
 */
export default function ConfirmDialog({
  show,
  title = 'Confirmar ação',
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  busy = false,
  onConfirm,
  onCancel,
}) {
  const titleId = useId();
  const bodyId = useId();
  const cancelRef = useRef(null);
  const dialogRef = useRef(null);
  const latest = useRef({ busy, onCancel });

  useEffect(() => {
    latest.current = { busy, onCancel };
  });

  useEffect(() => {
    if (!show) return undefined;
    const previous = document.activeElement;
    cancelRef.current?.focus();

    function onKeyDown(event) {
      if (event.key === 'Escape' && !latest.current.busy) {
        event.preventDefault();
        latest.current.onCancel?.();
      } else if (event.key === 'Tab' && dialogRef.current) {
        // Mantém o foco dentro do diálogo.
        const focusables = dialogRef.current.querySelectorAll('button:not([disabled])');
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previous && typeof previous.focus === 'function') previous.focus();
    };
  }, [show]);

  if (!show) return null;

  return (
    <>
      <div
        className="modal fade show nx-modal-open"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={message ? bodyId : undefined}
        ref={dialogRef}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title h5" id={titleId}>
                {title}
              </h2>
            </div>
            {message && (
              <div className="modal-body" id={bodyId}>
                {message}
              </div>
            )}
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={onCancel}
                ref={cancelRef}
                disabled={busy}
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                className={`btn btn-${variant}`}
                onClick={onConfirm}
                disabled={busy}
              >
                {busy && (
                  <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                )}
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" />
    </>
  );
}
