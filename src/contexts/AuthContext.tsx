import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import type { ReactNode } from 'react';
import type { User } from '../types';
import { doc, getDoc } from 'firebase/firestore';

interface AuthContextType {
  currentUser: User | null;
  isAdmin: boolean;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      try {
        if (firebaseUser) {
          // Получаем данные пользователя из Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          const userData = userDoc.data();

          if (!userData || userData.role !== 'admin') {
            // Если пользователь не админ, выходим из системы
            await signOut(auth);
            setCurrentUser(null);
            setIsAdmin(false);
            return;
          }

          setCurrentUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: userData.role,
            createdAt: userData.createdAt,
            updatedAt: userData.updatedAt,
          } as User);
          setIsAdmin(true);
        } else {
          setCurrentUser(null);
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Error checking user role:', error);
        // В случае ошибки также выходим из системы
        await signOut(auth);
        setCurrentUser(null);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    setLoading(true);
    await signOut(auth);
    setCurrentUser(null);
    setIsAdmin(false);
    setLoading(false);
  };

  const value = {
    currentUser,
    isAdmin,
    loading,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
