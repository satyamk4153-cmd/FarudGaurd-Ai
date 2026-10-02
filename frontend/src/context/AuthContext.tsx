import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/client';
import type { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  isAnalyst: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('fraudguard_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('fraudguard_token');
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Validate session on mount
  useEffect(() => {
    let isMounted = true;
    const initAuth = async () => {
      const storedToken = localStorage.getItem('fraudguard_token');
      if (storedToken) {
        try {
          const currentUser = await authApi.getMe();
          if (!isMounted) return;
          setUser(currentUser);
          localStorage.setItem('fraudguard_user', JSON.stringify(currentUser));
        } catch {
          if (!isMounted) return;
          // Token expired or invalid
          localStorage.removeItem('fraudguard_token');
          localStorage.removeItem('fraudguard_user');
          setUser(null);
          setToken(null);
        }
      }
      if (isMounted) {
        setIsLoading(false);
      }
    };

    initAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await authApi.login(email, pass);
    setToken(res.access_token);
    setUser(res.user);
    localStorage.setItem('fraudguard_token', res.access_token);
    localStorage.setItem('fraudguard_user', JSON.stringify(res.user));
  };

  const register = async (email: string, pass: string, name: string) => {
    await authApi.register({ email, password: pass, name });
    // After register, automatically log in
    await login(email, pass);
  };

  const logout = () => {
    localStorage.removeItem('fraudguard_token');
    localStorage.removeItem('fraudguard_user');
    setUser(null);
    setToken(null);
  };

  const hasRole = (roles: UserRole[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const isAdmin = user?.role === 'ADMIN';
  const isAnalyst = user?.role === 'ANALYST' || user?.role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        isAdmin,
        isAnalyst,
        login,
        register,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
