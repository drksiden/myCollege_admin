import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { AppUser } from '@/types';
import type { AuthContextType } from '@/types/auth';
import { Timestamp, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getUserById } from '@/lib/firebaseService/userService';

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
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in
        const userData = await getUserById(firebaseUser.uid);
        if (userData) {
          setUser(userData);
        } else {
          // If user document doesn't exist, create a pending user
          const pendingUser: AppUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            firstName: firebaseUser.displayName?.split(' ')[0] || '',
            lastName: firebaseUser.displayName?.split(' ')[1] || '',
            iin: '000000000000', // Временное значение, которое нужно будет обновить
            role: 'pending_approval',
            status: 'pending_approval',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          };
          
          // Create user document in Firestore
          try {
            await setDoc(doc(db, 'users', firebaseUser.uid), pendingUser);
            setUser(pendingUser);
          } catch (error) {
            console.error('Error creating user document:', error);
          }
        }
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

  const value = {
    user,
    currentUser: user,
    isAdmin: user?.role === 'admin',
    loading,
    signIn: async () => {},
    signOut,
    logout: signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
