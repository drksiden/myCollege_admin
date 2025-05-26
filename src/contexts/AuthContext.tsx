import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { User } from '@/types';
import type { AuthContextType } from '@/types/auth';
import { Timestamp } from 'firebase/firestore';

const AuthContext = createContext<AuthContextType>({
  user: null,
  currentUser: null,
  isAdmin: false,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in
        const userData: User = {
          id: firebaseUser.uid, // Using uid as id for now
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          firstName: firebaseUser.displayName?.split(' ')[0] || '',
          lastName: firebaseUser.displayName?.split(' ')[1] || '',
          iin: '', // Required field, but we don't have it from Firebase Auth
          birthDate: Timestamp.now(), // Required field, but we don't have it from Firebase Auth
          role: 'admin', // Default role for now
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
        setUser(userData);
      } else {
        // User is signed out
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      currentUser: user,
      isAdmin: user?.role === 'admin',
      loading,
      signIn: async () => {},
      signOut,
      logout: signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
