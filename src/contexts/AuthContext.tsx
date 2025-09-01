import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { userService } from '../services/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  clienteId?: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const login = useCallback(async (token: string) => {
    try {
      if (!token) {
        console.error('❌ ERRO: Token é null ou undefined!');
        return;
      }
      
      localStorage.setItem('token', token);
      const userData = await userService.getMe();
      setUser(userData);
      
    } catch (error) {
      console.error('❌ Erro ao fazer login:', error);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (token) {
      login(token);
    } else {
      setLoading(false);
    }
  }, [login]);

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const isAdmin = user?.is_admin || false;
  const clienteId = user?.cliente_id;

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, clienteId }}>
      {children}
    </AuthContext.Provider>
  );
};
