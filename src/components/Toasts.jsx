import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Icon from './Icon.jsx';

const ToastContext = createContext(null);

const VARIANTS = {
  success: { className: 'text-bg-success', title: 'Sucesso' },
  danger: { className: 'text-bg-danger', title: 'Erro' },
  warning: { className: 'text-bg-warning', title: 'Atenção' },
  info: { className: 'text-bg-info', title: 'Informação' },
};

/** Provedor de notificações temporárias (toasts). Use `useToast()` nas telas. */
export function ToastProvider({ children, duration = 5000 }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const showToast = useCallback(
    ({ message, variant = 'success', title }) => {
      const id = nextId.current++;
      setToasts((list) => [...list, { id, message, variant, title }]);
      if (duration > 0)
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), duration),
        );
      return id;
    },
    [duration, dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((timer) => clearTimeout(timer));
  }, []);

  const value = useMemo(() => ({ showToast, dismiss }), [showToast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="nx-toasts toast-container" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => {
          const v = VARIANTS[toast.variant] || VARIANTS.info;
          return (
            <div
              key={toast.id}
              className={`toast show align-items-center border-0 mb-2 ${v.className}`}
              role={toast.variant === 'danger' ? 'alert' : 'status'}
            >
              <div className="d-flex">
                <div className="toast-body">
                  <strong className="d-block">{toast.title || v.title}</strong>
                  {toast.message}
                </div>
                <button
                  type="button"
                  className="btn btn-sm me-2 m-auto text-reset"
                  aria-label="Fechar notificação"
                  onClick={() => dismiss(toast.id)}
                >
                  <Icon name="close" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast deve ser usado dentro de <ToastProvider>.');
  return ctx;
}
