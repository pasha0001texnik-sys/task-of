import * as React from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const addToast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 3000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              layout
              className={cn(
                "pointer-events-auto relative w-80 md:w-96 overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 backdrop-blur-md border border-white/10",
                toast.type === 'success' ? "bg-emerald-950/80 text-emerald-200 ring-emerald-500/30" :
                toast.type === 'error' ? "bg-rose-950/80 text-rose-200 ring-rose-500/30" :
                "bg-zinc-950/80 text-zinc-200 ring-white/10"
              )}
            >
              <div className="p-4 flex items-start">
                <div className="flex-shrink-0">
                  {toast.type === 'success' && <CheckCircle className="h-5 w-5 text-emerald-400" />}
                  {toast.type === 'error' && <AlertCircle className="h-5 w-5 text-rose-400" />}
                  {toast.type === 'info' && <Info className="h-5 w-5 text-zinc-400" />}
                </div>
                <div className="ml-3 w-0 flex-1 pt-0.5">
                  <p className="text-sm font-medium text-white">{toast.message}</p>
                </div>
                <div className="ml-4 flex flex-shrink-0">
                  <button
                    type="button"
                    className="inline-flex rounded-md bg-transparent text-white/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-transparent"
                    onClick={() => removeToast(toast.id)}
                  >
                    <span className="sr-only">Close</span>
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
