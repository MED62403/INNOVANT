import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';

const SESSION_KEY = 'sanya_session_verified';
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [sessionVerified, setSessionVerified] = useState(() =>
    sessionStorage.getItem(SESSION_KEY) === 'true'
  );
  const inactivityTimer = useRef(null);

  const markSessionVerified = useCallback(() => {
    sessionStorage.setItem(SESSION_KEY, 'true');
    setSessionVerified(true);
  }, []);

  const clearSession = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setSessionVerified(false);
  }, []);

  useEffect(() => {
    if (!sessionVerified) return;
    const reset = () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(clearSession, INACTIVITY_TIMEOUT_MS);
    };
    const events = ['mousemove', 'keydown', 'click', 'touchstart'];
    events.forEach(e => window.addEventListener(e, reset));
    reset();
    return () => {
      events.forEach(e => window.removeEventListener(e, reset));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [sessionVerified, clearSession]);

  const checkAppState = useCallback(async () => {
    setIsLoadingAuth(true);
    setAuthError(null);

    if (!supabase) {
      setAuthError({ type: 'not_configured', message: 'Supabase non configuré' });
      setIsLoadingAuth(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        setIsAuthenticated(true);
        markSessionVerified();
      } else {
        setAuthError({ type: 'auth_required', message: 'Connexion requise' });
        setIsAuthenticated(false);
      }
    } catch (err) {
      setAuthError({ type: 'unknown', message: err.message });
    }

    setIsLoadingAuth(false);
  }, [markSessionVerified]);

  useEffect(() => {
    checkAppState();
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setIsAuthenticated(true);
        setAuthError(null);
        markSessionVerified();
      } else {
        setUser(null);
        setIsAuthenticated(false);
        clearSession();
      }
    });
    return () => subscription.unsubscribe();
  }, [checkAppState, markSessionVerified, clearSession]);

  const logout = useCallback(async () => {
    clearSession();
    setUser(null);
    setIsAuthenticated(false);
    if (supabase) await supabase.auth.signOut();
  }, [clearSession]);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings: false,
      authError,
      appPublicSettings: null,
      authChecked: !isLoadingAuth,
      sessionVerified,
      markSessionVerified,
      clearSession,
      logout,
      navigateToLogin: () => setAuthError({ type: 'auth_required', message: 'Connexion requise' }),
      checkUserAuth: checkAppState,
      checkAppState,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
