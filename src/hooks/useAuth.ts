import { useEffect, useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { AppUser } from '@/types';
import { getUserById } from '@/lib/firebaseService/userService';

export const useAuth = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        const userData = await getUserById(firebaseUser.uid);
        setAppUser(userData);
      } else {
        setAppUser(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, appUser, loading };
}; 