import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Circle, Loader2, Lock, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AuthLayout, BrandHeader } from './LoginPage';

const RULES: [string, (p: string) => boolean][] = [
  ['8 caractères minimum', (p) => p.length >= 8],
  ['Une majuscule', (p) => /[A-Z]/.test(p)],
  ['Une minuscule', (p) => /[a-z]/.test(p)],
  ['Un chiffre', (p) => /\d/.test(p)],
];

/** Écran imposé quand le mot de passe est temporaire (compte créé ou réinitialisé par le Super Administrateur). */
export const ChangePasswordPage: React.FC = () => {
  const { session, changePassword, logout } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const valid = RULES.every(([, ok]) => ok(next)) && next === confirm && next !== current;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) {
      setError(next !== confirm ? 'Les deux mots de passe ne correspondent pas.' : 'Le nouveau mot de passe ne respecte pas les règles.');
      return;
    }
    setBusy(true);
    const r = await changePassword(current, next);
    setBusy(false);
    if (!r.success) setError(r.error || 'Changement impossible.');
  };

  const field = (id: string, label: string, value: string, set: (v: string) => void, auto: string) => (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
      <div className="relative">
        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input id={id} type="password" autoComplete={auto} value={value} onChange={(e) => { set(e.target.value); setError(null); }}
          className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-3.5 py-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D97F2E]/40 focus:border-[#D97F2E]" />
      </div>
    </div>
  );

  return (
    <AuthLayout>
      <div className="bg-white rounded-3xl shadow-[0_20px_60px_-25px_rgba(90,55,20,0.35)] border border-[#F1E2CD] px-7 py-8 sm:px-10">
        <BrandHeader subtitle="Choisissez votre mot de passe" />
        <p className="mt-2 text-center text-sm text-slate-500">
          Bonjour <strong>{session?.user.nom}</strong>, votre mot de passe est temporaire : remplacez-le pour accéder à la plateforme.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {field('cur', 'Mot de passe actuel (temporaire)', current, setCurrent, 'current-password')}
          {field('new', 'Nouveau mot de passe', next, setNext, 'new-password')}
          {field('conf', 'Confirmer le nouveau mot de passe', confirm, setConfirm, 'new-password')}
          <ul className="grid grid-cols-2 gap-1.5 text-xs">
            {RULES.map(([label, ok]) => (
              <li key={label} className={`flex items-center gap-1.5 ${ok(next) ? 'text-[#5B8A4A]' : 'text-slate-400'}`}>
                {ok(next) ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />} {label}
              </li>
            ))}
          </ul>
          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-800">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
            </div>
          )}
          <button type="submit" disabled={busy || !current} className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#D97F2E] hover:bg-[#C46F22] disabled:opacity-60 text-white font-bold py-3">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Enregistrer et continuer
          </button>
          <button type="button" onClick={() => logout()} className="w-full flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-700">
            <LogOut className="w-4 h-4" /> Se déconnecter
          </button>
        </form>
      </div>
    </AuthLayout>
  );
};
