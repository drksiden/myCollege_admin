// import type { ReactNode } from 'react';
import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext'; // Убедитесь, что путь правильный
import {
  Home,
  Users,
  Library,
  CalendarDays,
  LogOut,
  Settings,
  GraduationCap,
  UserCog,
} from 'lucide-react'; // Иконки от lucide-react

const Sidebar: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation(); // Для определения активной ссылки

  const handleLogout = async () => {
    await logout();
    navigate('/login'); // Перенаправляем на страницу входа после выхода
  };

  const navItems = [
    {
      to: '/admin/dashboard',
      icon: <Home className="h-5 w-5" />,
      label: 'Главная',
    },
    {
      to: '/admin/users',
      icon: <Users className="h-5 w-5" />,
      label: 'Пользователи',
    },
    {
      to: '/admin/students',
      icon: <GraduationCap className="h-5 w-5" />,
      label: 'Студенты',
    },
    {
      to: '/admin/teachers',
      icon: <UserCog className="h-5 w-5" />,
      label: 'Преподаватели',
    },
    {
      to: '/admin/groups',
      icon: <Library className="h-5 w-5" />,
      label: 'Группы',
    },
    {
      to: '/admin/schedule',
      icon: <CalendarDays className="h-5 w-5" />,
      label: 'Расписание',
    },
    // Добавьте другие пункты меню
  ];

  return (
    <div className="flex h-full max-h-screen flex-col gap-2">
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link
          to="/admin/dashboard"
          className="flex items-center gap-2 font-semibold"
        >
          <Settings className="h-6 w-6" /> {/* Иконка для логотипа */}
          <span className="">Админ-панель</span>
        </Link>
      </div>
      <div className="flex-1">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.label}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all duration-150 ease-in-out hover:text-primary hover:bg-primary/10
                            ${isActive ? 'bg-primary/10 text-primary font-semibold' : ''}`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="mt-auto p-4">
        <Button
          size="sm"
          variant="ghost"
          className="w-full justify-start"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Выйти
        </Button>
      </div>
    </div>
  );
};

const AdminLayout: React.FC = () => {
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-muted/40 md:block">
        <Sidebar />
      </div>
      {/* TODO: Мобильное меню (Sheet от Shadcn UI) */}
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6 md:hidden">
          {/* Кнопка для мобильного меню */}
          <span className="font-bold">Админ-панель</span>{' '}
          {/* Или название текущей страницы */}
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background">
          <Outlet /> {/* Здесь будут рендериться дочерние страницы админки */}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
