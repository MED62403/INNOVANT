import { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 6) return setError('Au moins 6 caractères requis.');
    if (password !== confirm) return setError('Les mots de passe ne correspondent pas.');
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setError('Erreur : ' + err.message);
    } else {
      setSuccess(true);
      setTimeout(() => { window.location.href = '/'; }, 2000);
    }
    setLoading(false);
  }

  if (!ready) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-6">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-3 shadow-lg">
            <Lock className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-lg font-bold text-foreground text-center">Nouveau mot de passe</h2>
          <p className="text-sm text-muted-foreground text-center mt-1">
            Choisissez un mot de passe sécurisé pour votre compte.
          </p>
        </div>

        {success ? (
          <div className="text-center py-4 space-y-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <p className="font-semibold text-foreground">Mot de passe modifié !</p>
            <p className="text-sm text-muted-foreground">Redirection en cours...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Input
                type={show ? 'text' : 'password'}
                placeholder="Nouveau mot de passe (min. 6 caractères)"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="pr-10"
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShow(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Input
              type={show ? 'text' : 'password'}
              placeholder="Confirmer le mot de passe"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Enregistrement...' : 'Définir le mot de passe'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}