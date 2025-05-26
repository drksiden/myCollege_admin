import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import NotificationCenter from '@/components/notifications/NotificationCenter';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/" className="text-xl font-bold">
            Admin Panel
          </Link>
          {user && (
            <div className="flex items-center space-x-4">
              <Link to="/students">
                <Button variant="ghost">Students</Button>
              </Link>
              <Link to="/subjects">
                <Button variant="ghost">Subjects</Button>
              </Link>
              <Link to="/groups">
                <Button variant="ghost">Groups</Button>
              </Link>
              <Link to="/grades">
                <Button variant="ghost">Grades</Button>
              </Link>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-4">
          {user && <NotificationCenter />}
          {user ? (
            <Button variant="outline" onClick={logout}>
              Выйти
            </Button>
          ) : (
            <Link to="/login">
              <Button>Sign In</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
} 