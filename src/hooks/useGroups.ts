import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebaseService/firebase';

export interface Group {
  id: string;
  name: string;
  studentCount: number;
}

export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchGroups() {
      try {
        const groupsRef = collection(db, 'groups');
        const snapshot = await getDocs(groupsRef);
        const groupsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Group));
        setGroups(groupsList);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch groups'));
      } finally {
        setLoading(false);
      }
    }

    fetchGroups();
  }, []);

  return { groups, loading, error };
} 