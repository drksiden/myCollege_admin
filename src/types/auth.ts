import type { User } from './index';

export interface AuthContextType {
  user: User | null;
  currentUser: User | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
} 