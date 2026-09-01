import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (msg, dur) => addToast(msg, 'success', dur),
    error: (msg, dur) => addToast(msg, 'error', dur),
    info: (msg, dur) => addToast(msg, 'info', dur),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast Portal */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => {
          let bgColor = 'bg-barberDark-800 border-slate-700';
          let Icon = Info;
          let iconColor = 'text-electric-400';

          if (t.type === 'success') {
            bgColor = 'bg-barberDark-800 border-emerald-500/30';
            Icon = CheckCircle;
            iconColor = 'text-emerald-400';
          } else if (t.type === 'error') {
            bgColor = 'bg-barberDark-800 border-coral-500/30';
            Icon = AlertCircle;
            iconColor = 'text-coral-500';
          }

          return (
            <div
              key={t.id}
              className={`flex items-start gap-3 p-4 rounded-xl border ${bgColor} shadow-lg pointer-events-auto transition-all duration-300 transform translate-y-0 animate-slide-in glass-panel`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${iconColor} mt-0.5`} />
              <div className="flex-1 text-sm font-medium text-slate-200">
                {t.message}
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
