'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  loginUser,
  registerUser,
  logoutUser as authLogout,
  getSession,
  type Session,
} from '@/lib/auth';

export interface AuthContextValue {
  user: { id: string; email: string; name: string } | null;
  session: Session | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    async function checkSession() {
      try {
        const existing = await getSession();
        setSession(existing);
      } catch {
        setSession(null);
      } finally {
        setIsLoading(false);
      }
    }
    checkSession();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginUser(email, password);
    if (result.success && result.session) {
      setSession(result.session);
    }
    return { success: result.success, error: result.error };
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const result = await registerUser(email, password, name);
    return { success: result.success, error: result.error };
  }, []);

  const logout = useCallback(() => {
    authLogout();
    setSession(null);
  }, []);

  const user = session
    ? { id: session.userId, email: session.email, name: session.name }
    : null;

  return (
    <AuthContext.Provider value={{ user, session, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
