import type { AppUser } from './index';

export interface AuthContextType {
  user: AppUser | null;
  currentUser: AppUser | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
} 