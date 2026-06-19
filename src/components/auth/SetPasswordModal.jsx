import { useState } from 'react';
import { Eye, EyeOff, Lock, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SetPasswordModal({ onDone }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 6) return setError('Minimum 6 caractères requis.');
    if (password !== confirm) return setError('Les mots de passe ne correspondent pas.');
    setSaving(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setError('Erreur : ' + err.message);
    } else {
      onDone?.();
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-6">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-3 shadow-lg">
            <Lock className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-lg font-bold text-foreground text-center">Bienvenue sur SANYA SERVICES !</h2>
          <p className="text-sm text-muted-foreground text-center mt-1">
            Définissez votre mot de passe personnel pour sécuriser votre accès.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Input
              type={show ? 'text' : 'password'}
              placeholder="Nouveau mot de passe (min. 6 caractères)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="pr-10 rounded-xl"
              required
              autoFocus
            />
            <button type="button" onClick={() => setShow(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Input
            type={show ? 'text' : 'password'}
            placeholder="Confirmer le mot de passe"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className="rounded-xl"
            required
          />
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          <Button type="submit" className="w-full rounded-xl h-11" disabled={saving}>
            {saving ? 'Enregistrement...' : (
              <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />Définir mon mot de passe</span>
            )}
          </Button>
        </form>

        <p className="text-[10px] text-muted-foreground text-center mt-4">
          Votre email + ce mot de passe seront vos identifiants permanents.
        </p>
      </div>
    </div>
  );
}