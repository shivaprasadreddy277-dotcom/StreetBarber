import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

export default function Dialog({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'danger' }) {
  if (!isOpen) return null;

  const buttonClass =
    variant === 'danger'
      ? 'bg-coral-500 hover:bg-coral-600 text-white shadow-neon-coral'
      : 'bg-gradient-to-r from-neonPurple-500 to-electric-500 hover:from-neonPurple-600 hover:to-electric-600 text-white shadow-neon-purple';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-barberDark-950/80 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-barberDark-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden glass-panel z-10 p-6 animate-scale-up">
        <div className="flex justify-between items-start gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${variant === 'danger' ? 'bg-coral-500/10 text-coral-400' : 'bg-neonPurple-500/10 text-neonPurple-400'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white tracking-wide">{title}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="mt-4 text-sm text-slate-400 leading-relaxed">
          {message}
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4.5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 text-sm font-semibold transition-all"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all transform hover:-translate-y-0.5 ${buttonClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
