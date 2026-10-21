import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, ShieldCheck, Wallet, BadgeCheck, HeartHandshake, AlertCircle, KeyRound, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { InformalSectorIllustration } from './InformalSectorIllustration';

/** Mise en page commune aux écrans d'authentification : illustration à gauche, carte à droite. */
export const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-[#FBF5EC] flex">
    {/* Volet illustré (écrans larges) */}
    <aside className="hidden lg:flex lg:w-[55%] xl:w-[58%] h-screen sticky top-0 relative overflow-hidden gap-4 bg-gradient-to-br from-[#FFF8EE] via-[#FCEBD3] to-[#F7D9B0] flex-col justify-between p-10 xl:p-14">
      <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full border-[18px] border-[#D97F2E]/10" />
      <div className="absolute -bottom-32 -right-20 w-96 h-96 rounded-full border-[3px] border-[#E5C21E]/40" />

      <div className="relative z-10">
        <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-[#5B8A4A]">Coopérative du secteur informel</p>
        <h1 className="mt-3 font-['Outfit',sans-serif] text-3xl xl:text-[2.6rem] font-extrabold leading-tight text-[#3A2A1C]">
          Ensemble, on protège <br />
          <span className="text-[#D97F2E]">ceux qui font vivre le pays.</span>
        </h1>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[#6B5440]">
          Commerçantes, artisans, conducteurs de moto-taxi, couturières, maraîchers : la COSITI accompagne les travailleurs
          indépendants vers la prévoyance sociale et l'immatriculation CNPS.
        </p>
      </div>

      <InformalSectorIllustration className="relative z-10 w-full max-w-[720px] max-h-[50vh] min-h-0 mx-auto drop-shadow-sm" />

      <div className="relative z-10 grid grid-cols-3 gap-3 max-w-2xl">
        {[
          { icon: Wallet, title: 'Cotisations', text: 'Espèces & Mobile Money' },
          { icon: BadgeCheck, title: 'Immatriculation', text: 'Suivi CNPS dès 15 000 F' },
          { icon: HeartHandshake, title: 'Protection', text: 'Allocations & prestations' },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex items-start gap-2.5 rounded-2xl bg-white/70 backdrop-blur-sm px-3.5 py-3 border border-white">
            <span className="mt-0.5 rounded-xl bg-[#D97F2E]/12 p-2 text-[#D97F2E]">
              <Icon className="w-4 h-4" />
            </span>
            <span>
              <span className="block text-sm font-bold text-[#3A2A1C]">{title}</span>
              <span className="block text-xs text-[#7A6450]">{text}</span>
            </span>
          </div>
        ))}
      </div>
    </aside>

    {/* Carte de connexion */}
    <main className="flex-1 flex items-center justify-center px-4 py-10 sm:px-8">
      <div className="w-full max-w-md">{children}</div>
    </main>
  </div>
);

export const BrandHeader: React.FC<{ subtitle?: string }> = ({ subtitle }) => (
  <div className="text-center">
    {/* le fichier du logo a de larges marges blanches : on recadre sur l'emblème et le nom */}
    <div className="mx-auto w-52 h-52 overflow-hidden rounded-3xl">
      <img src="/cositi-logo.jpg" alt="COSITI — Coopérative du secteur informel et des travailleurs indépendants" className="w-full h-full object-cover scale-150" />
    </div>
    {subtitle && <h2 className="mt-6 font-['Outfit',sans-serif] text-2xl font-bold text-[#3A2A1C]">{subtitle}</h2>}
  </div>
);

export const LoginPage: React.FC = () => {
  const { login, endReason } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Saisissez votre e-mail et votre mot de passe.');
      return;
    }
    setBusy(true);
    setError(null);
    const r = await login(email, password);
    setBusy(false);
    if (!r.success) {
      setError(r.error || 'Connexion impossible.');
      setLocked(!!r.locked);
      setPassword('');
    }
  };

  return (
    <AuthLayout>
      <div className="bg-white rounded-3xl shadow-[0_20px_60px_-25px_rgba(90,55,20,0.35)] border border-[#F1E2CD] px-7 py-8 sm:px-10">
        <BrandHeader subtitle="Connexion à votre espace" />
        <p className="mt-1.5 text-center text-sm text-slate-500">Gestion des adhérents, cotisations et dossiers CNPS</p>

        {endReason === 'expired' && !error && (
          <div className="mt-5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            Votre session a expiré. Veuillez vous reconnecter.
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1.5">Adresse e-mail</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="email"
                type="email"
                autoComplete="username"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="prenom.nom@cositi-ci.org"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-3.5 py-3 text-[15px] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D97F2E]/40 focus:border-[#D97F2E] transition"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1.5">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-11 py-3 text-[15px] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D97F2E]/40 focus:border-[#D97F2E] transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div role="alert" className={`flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-sm ${locked ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#D97F2E] hover:bg-[#C46F22] disabled:opacity-70 text-white font-bold py-3 text-[15px] shadow-sm transition active:scale-[0.99]"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            {busy ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-slate-500">
          Mot de passe oublié ou compte bloqué ? Contactez le <strong className="text-slate-700">Super Administrateur</strong> de la plateforme.
        </p>
      </div>

      <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-[#7A6450]">
        <ShieldCheck className="w-3.5 h-3.5 text-[#5B8A4A]" />
        Connexion sécurisée — toutes les actions sont journalisées.
      </p>
    </AuthLayout>
  );
};
