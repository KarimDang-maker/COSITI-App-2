import React from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

/** Notifications des actions envoyées au serveur (erreurs de droits, validation, code incorrect...) */
export const Notifications: React.FC = () => {
  const { notifications, dismissNotification } = useApp();
  if (!notifications.length) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[min(420px,calc(100vw-2rem))]" aria-live="polite">
      {notifications.map((n) => (
        <div
          key={n.id}
          role={n.type === 'error' ? 'alert' : 'status'}
          className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 shadow-lg text-sm bg-white ${n.type === 'error' ? 'border-rose-200 text-rose-800' : 'border-emerald-200 text-emerald-800'}`}
        >
          {n.type === 'error' ? <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />}
          <span className="flex-1">{n.message}</span>
          <button onClick={() => dismissNotification(n.id)} aria-label="Fermer" className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
