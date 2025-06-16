import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth } from './firebase';
import type { AppUser } from '@/types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

interface AuthContextType {
  user: AppUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  loading: true,
});

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user: FirebaseUser | null) => {
      setFirebaseUser(user);
      if (user) {
        const userData = await getUserById(user.uid);
        setUser(userData);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    firebaseUser,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export const getUserById = async (uid: string): Promise<AppUser | null> => {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    return null;
  }

  return {
    uid: userSnap.id,
    ...userSnap.data(),
  } as AppUser;
}; 