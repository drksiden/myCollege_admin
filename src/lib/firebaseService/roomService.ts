import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export const getAllRooms = async (): Promise<string[]> => {
  const roomsRef = collection(db, 'rooms');
  const querySnapshot = await getDocs(roomsRef);
  
  return querySnapshot.docs.map(doc => doc.data().name as string);
}; 