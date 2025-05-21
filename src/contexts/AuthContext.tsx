import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import type { ReactNode } from 'react';
import type { User } from '../types';
import { getUser, createUser } from '../services/firestore';
import { Timestamp } from 'firebase/firestore';

interface AuthContextType {
  currentUser: User | null;
  isAdmin: boolean;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        // Получаем профиль пользователя из Firestore
        const userProfile = await getUser(firebaseUser.uid);

        if (userProfile) {
          setCurrentUser(userProfile);
          setIsAdmin(userProfile.role === 'admin');
          console.log('[AuthContext] Пользователь найден в Firestore:', userProfile);
        } else {
          // Автоматически создаём профиль, если его нет (только для DEV/эмулятора!)
          if (import.meta.env.DEV) {
            const newUser: Omit<User, 'createdAt' | 'updatedAt'> = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              firstName: '',
              lastName: '',
              role: 'admin',
            };
            await createUser(newUser);
            const now = Timestamp.now();
            setCurrentUser({ ...newUser, createdAt: now, updatedAt: now });
            setIsAdmin(true);
            console.warn('[AuthContext] Автоматически создан профиль пользователя в Firestore.');
          } else {
            console.warn('[AuthContext] User exists in Auth but not in Firestore DB. UID:', firebaseUser.uid);
            setCurrentUser(null);
            setIsAdmin(false);
          }
        }
      } else {
        // Пользователь не аутентифицирован
        setCurrentUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    setLoading(true);
    await auth.signOut();
    setCurrentUser(null);
    setIsAdmin(false);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ currentUser, isAdmin, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
