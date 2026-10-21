import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { auth, errorMessage, onSessionChange, ApiError, type Session } from '../api/client';

type Status = 'loading' | 'anonymous' | 'authenticated';

interface AuthContextType {
  status: Status;
  session: Session | null;
  /** motif de la dernière déconnexion (« expired » : session expirée) */
  endReason?: string;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; locked?: boolean }>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<Status>('loading');
  const [session, setSessionState] = useState<Session | null>(null);
  const [endReason, setEndReason] = useState<string | undefined>();

  useEffect(() => {
    const off = onSessionChange((s, reason) => {
      setSessionState(s);
      setStatus(s ? 'authenticated' : 'anonymous');
      if (!s) setEndReason(reason);
    });
    // reprise de la session après un rechargement de la page
    auth
      .restore()
      .then((s) => {
        if (!s) setStatus('anonymous');
      })
      .catch(() => setStatus('anonymous'));
    return () => {
      off();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setEndReason(undefined);
      await auth.login(email.trim(), password);
      return { success: true };
    } catch (e) {
      return { success: false, error: errorMessage(e), locked: e instanceof ApiError && e.status === 423 };
    }
  }, []);

  const logout = useCallback(async () => {
    await auth.logout();
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    try {
      await auth.changePassword(currentPassword, newPassword);
      return { success: true };
    } catch (e) {
      return { success: false, error: errorMessage(e) };
    }
  }, []);

  return (
    <AuthContext.Provider value={{ status, session, endReason, login, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
};
