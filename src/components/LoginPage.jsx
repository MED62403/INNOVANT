import { useState } from 'react';
import { Eye, EyeOff, Loader2, AlertCircle, Leaf, Recycle, Droplets } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const { checkAppState } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!supabase) {
      setError('Configuration requise : ajoutez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env.local');
      return;
    }

    setLoading(true);
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
    if (authErr) {
      setError('Email ou mot de passe incorrect.');
    } else {
      await checkAppState();
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden flex-col justify-between p-12"
           style={{ background: 'hsl(148 58% 10%)' }}>

        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-20"
             style={{ background: 'hsl(145 65% 29%)' }} />
        <div className="absolute -bottom-40 -left-20 w-[26rem] h-[26rem] rounded-full opacity-10"
             style={{ background: 'hsl(145 65% 50%)' }} />
        <div className="absolute top-1/2 right-8 w-48 h-48 rounded-full opacity-5"
             style={{ background: 'hsl(145 65% 70%)' }} />

        <div className="relative z-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-6"
               style={{ background: 'hsl(145 55% 20%)' }}>
            <span className="text-emerald-400 text-xl font-bold">S</span>
          </div>
          <h1 className="text-[28px] font-bold tracking-tight leading-tight"
              style={{ color: 'hsl(0 0% 96%)' }}>
            SANYA SERVICES
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'hsl(145 30% 55%)' }}>
            Kérouané · Guinée
          </p>
        </div>

        <div className="relative z-10 space-y-3">
          {[
            { icon: Recycle,  label: "Ramassage des ordures" },
            { icon: Droplets, label: "Nettoyage & Désinfection" },
            { icon: Leaf,     label: "Entretien environnemental" },
          ].map(({ icon: Icon, label }) => (
            <div key={label}
                 className="flex items-center gap-3 px-4 py-3 rounded-xl"
                 style={{ background: 'hsl(148 50% 15%)' }}>
              <div className="flex items-center justify-center w-7 h-7 rounded-lg"
                   style={{ background: 'hsl(145 55% 20%)' }}>
                <Icon className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <span className="text-sm font-medium" style={{ color: 'hsl(0 0% 82%)' }}>{label}</span>
            </div>
          ))}
        </div>

        <div className="relative z-10">
          <p className="text-sm italic leading-relaxed" style={{ color: 'hsl(145 20% 55%)' }}>
            "Merci pour votre confiance. Ensemble, construisons un environnement propre et sain !"
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-[360px]">

          <div className="lg:hidden flex flex-col items-center mb-10">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-3 shadow-lg">
              <span className="text-white text-2xl font-bold">S</span>
            </div>
            <p className="font-bold text-xl text-foreground tracking-tight">SANYA SERVICES</p>
            <p className="text-xs text-muted-foreground mt-0.5">Kérouané · Guinée</p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Connexion</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Accédez à votre espace de gestion
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Adresse e-mail</label>
              <Input
                type="email"
                placeholder="vous@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="h-11 bg-card"
                required
                autoFocus
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Mot de passe</label>
              <div className="relative">
                <Input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="h-11 pr-10 bg-card"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(p => !p)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 bg-destructive/8 border border-destructive/20 rounded-lg px-3 py-2.5">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive leading-snug">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 font-semibold text-sm shadow-sm"
              disabled={loading}
            >
              {loading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : 'Se connecter'}
            </Button>
          </form>

          <p className="text-center text-[11px] text-muted-foreground/60 mt-10">
            Plateforme sécurisée · SANYA SERVICES © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}