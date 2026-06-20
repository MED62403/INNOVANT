import { useState, useEffect } from 'react';
import { Users, UserPlus, ShieldCheck, Briefcase, Search, Trash2, ToggleLeft, ToggleRight, Mail, Loader2, Key } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { hasPermission, normalizeRole, SUPERADMIN_EMAIL, getRoleLabel, PERM_GROUPS, PERMISSION_LABELS, getEffectivePermissions } from '@/lib/permissions';

const ROLE_COLORS = {
  superAdmin:   'bg-violet-100 text-violet-700 border-violet-200',
  Admin:        'bg-green-100 text-green-700 border-green-200',
  Coordinateur: 'bg-blue-100 text-blue-700 border-blue-200',
  user:         'bg-blue-100 text-blue-700 border-blue-200',
};

export default function Utilisateurs() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const [invEmail, setInvEmail] = useState('');
  const [invRole, setInvRole] = useState('Coordinateur');
  const [invPwd, setInvPwd] = useState('');
  const [inviting, setInviting] = useState(false);
  const [invMsg, setInvMsg] = useState('');

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const list = await base44.functions.invoke('listUsers', {});
      setUsers(Array.isArray(list) ? list : list?.users || []);
    } catch {
      const list = await base44.entities.User.list();
      setUsers(list.map(({ custom_password_hash, reset_token_hash, ...u }) => u));
    }
    setLoading(false);
  }

  async function handleInvite(e) {
    e.preventDefault();
    if (!invEmail || !invPwd) return;
    setInviting(true); setInvMsg('');
    try {
      const data = await base44.functions.invoke('sendInvitation', {
        email: invEmail,
        metierRole: invRole,
        defaultPassword: invPwd,
        appUrl: window.location.origin,
        inviterName: 'Administrateur SANYA',
      });
      setInvEmail(''); setInvPwd(''); setInvRole('Coordinateur');
      if (data?.email_warning) {
        toast.warning('Compte créé — email non envoyé (vérifier config email)');
      } else {
        toast.success(`Compte créé pour ${invEmail} — email envoyé avec les identifiants`);
      }
      setTimeout(() => { setShowInvite(false); setInvMsg(''); loadUsers(); }, 1000);
    } catch(err) {
      const msg = err?.message || '';
      if (msg.includes('402')) {
        toast.warning(`Compte pré-enregistré pour ${invEmail} — l'utilisateur doit d'abord se connecter via son lien Base44 pour activer son compte, son rôle sera appliqué automatiquement.`);
        setShowInvite(false);
        loadUsers();
      } else {
        setInvMsg('Erreur : ' + (msg || 'Impossible de créer le compte.'));
      }
    }
    setInviting(false);
  }

  async function handleUpdateRole(userId, role, perms, isActive) {
    setSaving(true);
    try {
      await base44.functions.invoke('updateUserRole', { targetUserId: userId, role, permissions: perms, is_active: isActive });
    } catch {
      await base44.entities.User.update(userId, { role, permissions_custom: perms, is_active: isActive });
    }
    await loadUsers();
    setSelectedUser(null);
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await base44.functions.invoke('deleteUser', { targetUserId: deleteTarget.id });
    } catch {
      await base44.entities.User.delete(deleteTarget.id);
    }
    setDeleteTarget(null);
    loadUsers();
  }

  const filtered = users.filter(u =>
    u.email !== SUPERADMIN_EMAIL &&
    (u.email?.toLowerCase().includes(search.toLowerCase()) || u.full_name?.toLowerCase().includes(search.toLowerCase()))
  );

  const superAdminUser = users.find(u => u.email === SUPERADMIN_EMAIL);
  const admins = users.filter(u => normalizeRole(u.role) === 'Admin' && u.email !== SUPERADMIN_EMAIL).length;
  const coords = users.filter(u => normalizeRole(u.role) === 'Coordinateur').length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Utilisateurs</h1>
          <p className="text-sm text-muted-foreground">{users.length} membre(s) enregistré(s)</p>
        </div>
        <Button size="sm" className="gap-2 rounded-lg bg-[#1a7a4a] hover:bg-[#15623b]" onClick={() => setShowInvite(true)}>
          <UserPlus className="h-4 w-4" />
          Inviter
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <Users className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
          <p className="text-xl font-bold text-foreground">{users.length}</p>
          <p className="text-[10px] text-muted-foreground">Total</p>
        </div>
        <div className="bg-card border border-green-200 rounded-xl p-3 text-center">
          <ShieldCheck className="h-4 w-4 mx-auto text-green-600 mb-1" />
          <p className="text-xl font-bold text-green-700">{admins}</p>
          <p className="text-[10px] text-muted-foreground">Admins</p>
        </div>
        <div className="bg-card border border-blue-200 rounded-xl p-3 text-center">
          <Briefcase className="h-4 w-4 mx-auto text-blue-600 mb-1" />
          <p className="text-xl font-bold text-blue-700">{coords}</p>
          <p className="text-[10px] text-muted-foreground">Coordinateurs</p>
        </div>
      </div>

      {superAdminUser && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 mb-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold shrink-0">S</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{superAdminUser.full_name || 'Super Administrateur'}</p>
            <p className="text-xs text-muted-foreground">{superAdminUser.email}</p>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200">Super Admin</span>
        </div>
      )}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher un utilisateur..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 rounded-xl" />
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-2">
          {filtered.map(u => {
            const role = normalizeRole(u.role);
            return (
              <button key={u.id} onClick={() => setSelectedUser(u)} className="w-full text-left bg-card border border-border rounded-xl p-4 hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${ROLE_COLORS[role] || 'bg-muted text-muted-foreground'}`}>
                    {(u.full_name || u.email || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-foreground truncate">{u.full_name || '—'}</p>
                      {u.is_active === false && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Désactivé</span>}
                      {u.is_online && <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${ROLE_COLORS[role]}`}>{getRoleLabel(role)}</Badge>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><UserPlus className="h-4 w-4" />Inviter un utilisateur</DialogTitle></DialogHeader>
          <form onSubmit={handleInvite} className="space-y-3 py-2">
            <div><label className="text-sm font-medium mb-1 block">Email *</label><Input type="email" placeholder="email@exemple.com" value={invEmail} onChange={e => setInvEmail(e.target.value)} className="rounded-lg" required /></div>
            <div>
              <label className="text-sm font-medium mb-1 block">Rôle *</label>
              <Select value={invRole} onValueChange={setInvRole}>
                <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Administrateur — Accès complet</SelectItem>
                  <SelectItem value="Coordinateur">Coordinateur — Interventions, clients, rapports</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><label className="text-sm font-medium mb-1 block">Mot de passe temporaire *</label><Input type="text" placeholder="Ex: Sanya2025!" value={invPwd} onChange={e => setInvPwd(e.target.value)} className="rounded-lg" required /></div>
            {invMsg && <p className={`text-sm text-center ${invMsg.startsWith('✓') ? 'text-green-700' : 'text-destructive'}`}>{invMsg}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowInvite(false)}>Annuler</Button>
              <Button type="submit" disabled={inviting} className="bg-[#1a7a4a] hover:bg-[#15623b]">
                {inviting ? <><Loader2 className="h-3 w-3 animate-spin mr-1" />Envoi...</> : 'Inviter'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {selectedUser && (
        <UserDetailDialog
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onSave={handleUpdateRole}
          onDelete={() => { setDeleteTarget(selectedUser); setSelectedUser(null); }}
          saving={saving}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet utilisateur ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible. L'utilisateur perdra tout accès.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function UserDetailDialog({ user, onClose, onSave, onDelete, saving }) {
  const [role, setRole] = useState(normalizeRole(user.role));
  const [isActive, setIsActive] = useState(user.is_active !== false);
  const [perms, setPerms] = useState(user.permissions_custom || {});

  const effectivePerms = getEffectivePermissions(role, perms);

  function togglePerm(perm) {
    const current = effectivePerms[perm];
    setPerms(prev => ({ ...prev, [perm]: !current }));
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${ROLE_COLORS[role] || 'bg-muted'}`}>
              {(user.full_name || user.email || '?')[0].toUpperCase()}
            </div>
            {user.full_name || user.email}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{user.email}</div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Rôle</label>
            <Select value={role} onValueChange={v => { setRole(v); setPerms({}); }}>
              <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Admin">Administrateur</SelectItem>
                <SelectItem value="Coordinateur">Coordinateur</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between bg-muted/40 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-medium">Compte actif</p>
              <p className="text-xs text-muted-foreground">{isActive ? 'L\'utilisateur peut se connecter' : 'Accès bloqué'}</p>
            </div>
            <button onClick={() => setIsActive(p => !p)} className="text-muted-foreground hover:text-foreground">
              {isActive ? <ToggleRight className="h-6 w-6 text-green-600" /> : <ToggleLeft className="h-6 w-6" />}
            </button>
          </div>

          <div>
            <p className="text-sm font-semibold mb-2">Permissions</p>
            <div className="space-y-3">
              {PERM_GROUPS.map(group => (
                <div key={group.label}>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">{group.label}</p>
                  <div className="grid grid-cols-1 gap-1">
                    {group.perms.map(perm => (
                      <label key={perm} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/40 px-2 py-1 rounded-lg">
                        <input
                          type="checkbox"
                          checked={!!effectivePerms[perm]}
                          onChange={() => togglePerm(perm)}
                          className="accent-[#1a7a4a] h-3.5 w-3.5"
                        />
                        <span className={effectivePerms[perm] ? 'text-foreground' : 'text-muted-foreground'}>{PERMISSION_LABELS[perm]}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5 mr-1" />Supprimer
          </Button>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button className="bg-[#1a7a4a] hover:bg-[#15623b]" onClick={() => onSave(user.id, role, perms, isActive)} disabled={saving}>
            {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}