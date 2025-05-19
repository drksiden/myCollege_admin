import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase'; // Убедитесь, что путь правильный
import type { ReactNode } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';

interface UserProfile {
  uid: string;
  email: string | null;
  firstName?: string;
  lastName?: string;
  role?: 'student' | 'teacher' | 'admin'; // Добавляем роль
  // ... другие поля из вашей коллекции users
}

interface AuthContextType {
  currentUser: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser: FirebaseUser | null) => {
        if (firebaseUser) {
          // Пользователь аутентифицирован, получаем его профиль из Firestore
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data() as Omit<
              UserProfile,
              'uid' | 'email'
            >; // Типизируем данные
            const userProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              ...userData,
            };
            setCurrentUser(userProfile);
            setIsAdmin(userProfile.role === 'admin'); // Проверяем роль
          } else {
            // Случай, если пользователь есть в Auth, но нет в Firestore (не должно происходить при правильной регистрации)
            console.warn('User exists in Auth but not in Firestore DB.');
            setCurrentUser(null);
            setIsAdmin(false);
          }
        } else {
          // Пользователь не аутентифицирован
          setCurrentUser(null);
          setIsAdmin(false);
        }
        setLoading(false);
      }
    );

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
