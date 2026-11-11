import { useEffect, useId, useRef } from 'react';

/**
 * Modal genérico (renderizado pelo React, sem o JS do Bootstrap). Esc fecha (exceto ocupado);
 * o foco vai ao primeiro campo ao abrir e volta ao elemento anterior ao fechar.
 */
export default function Modal({ title, onClose, busy = false, children }) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const latest = useRef({ busy, onClose });

  useEffect(() => {
    latest.current = { busy, onClose };
  });

  useEffect(() => {
    const previous = document.activeElement;
    dialogRef.current?.querySelector('input, select, textarea, button')?.focus();
    function onKeyDown(event) {
      if (event.key === 'Escape' && !latest.current.busy) {
        event.preventDefault();
        latest.current.onClose?.();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previous && typeof previous.focus === 'function') previous.focus();
    };
  }, []);

  return (
    <>
      <div
        className="modal fade show nx-modal-open"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={dialogRef}
      >
        <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title h5" id={titleId}>
                {title}
              </h2>
            </div>
            {children}
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" />
    </>
  );
}
