import { useState } from 'react';
import { Eye, EyeOff, X, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ChangePasswordModal({ onClose }) {
  const [newPwd, setNewPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (newPwd.length < 6) return setError('Au moins 6 caractères requis.');
    if (newPwd !== confirm) return setError('Les mots de passe ne correspondent pas.');
    if (!supabase) return setError('Supabase non configuré.');
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password: newPwd });
    if (err) {
      setError('Erreur lors du changement : ' + err.message);
    } else {
      setSuccess(true);
      setTimeout(onClose, 1800);
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-foreground">Modifier le mot de passe</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {success ? (
          <div className="text-center py-4 space-y-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <p className="font-semibold text-foreground">Mot de passe modifié !</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Nouveau mot de passe</label>
              <div className="relative">
                <Input
                  type={show ? 'text' : 'password'}
                  placeholder="Min. 6 caractères"
                  value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
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
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Confirmer</label>
              <Input
                type={show ? 'text' : 'password'}
                placeholder="Répéter le mot de passe"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full mt-1" disabled={loading}>
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}