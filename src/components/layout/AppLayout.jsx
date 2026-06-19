import { useState, useEffect, useCallback } from 'react';
import { Outlet, useOutletContext } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { Loader2 } from 'lucide-react';
import Layout from '@/components/Layout';

const SUPERADMIN = 'kouroumalayefgi00@gmail.com';

async function fetchFullUser() {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const isSuperAdmin = user.email?.toLowerCase() === SUPERADMIN.toLowerCase();

  return {
    id: user.id,
    email: user.email,
    full_name: profile?.full_name || user.user_metadata?.full_name || '',
    role: isSuperAdmin ? 'superAdmin' : (profile?.role || 'Coordinateur'),
    is_active: profile?.is_active !== false,
    permissions_custom: profile?.permissions_custom || {},
  };
}

export default function AppLayout() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      const fullUser = await fetchFullUser();
      setUser(fullUser);
    } catch {
      setUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!user?.id || !supabase) return;
    const channel = supabase
      .channel('profile-changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${user.id}`,
      }, loadUser)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user?.id, loadUser]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
          <span className="text-white text-2xl font-bold">S</span>
        </div>
        <p className="font-bold text-xl text-foreground">SANYA SERVICES</p>
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (user?.is_active === false) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background gap-4 p-6">
        <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <span className="text-destructive text-2xl font-bold">!</span>
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">Compte désactivé</h2>
          <p className="text-sm text-muted-foreground">
            Votre compte a été désactivé. Contactez un administrateur.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Layout user={user}>
      <Outlet context={{ user, reloadUser: loadUser }} />
    </Layout>
  );
}

export function useAppUser() {
  return useOutletContext();
}