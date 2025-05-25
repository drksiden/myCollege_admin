// import type { ReactNode } from 'react';
import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext'; // Убедитесь, что путь правильный
import {
  Home,
  Users,
  LogOut,
  Settings,
  GraduationCap,
  UserCog,
  BookOpen,
  ClipboardList,
  BookMarked,
  Menu,
  Calendar,
  CalendarCheck,
  School,
  BookOpenCheck,
} from 'lucide-react'; // Иконки от lucide-react
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

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
      title: 'Основное',
      items: [
        {
          to: '/admin/dashboard',
          icon: <Home className="h-5 w-5" />,
          label: 'Главная',
        },
      ],
    },
    {
      title: 'Управление данными',
      items: [
        {
          to: '/admin/manage/users',
          icon: <Users className="h-5 w-5" />,
          label: 'Пользователи',
        },
        {
          to: '/admin/manage/students',
          icon: <GraduationCap className="h-5 w-5" />,
          label: 'Студенты',
        },
        {
          to: '/admin/manage/teachers',
          icon: <UserCog className="h-5 w-5" />,
          label: 'Преподаватели',
        },
        {
          to: '/admin/manage/groups',
          icon: <School className="h-5 w-5" />,
          label: 'Группы',
        },
        {
          to: '/admin/manage/subjects',
          icon: <BookOpen className="h-5 w-5" />,
          label: 'Предметы',
        },
      ],
    },
    {
      title: 'Расписание',
      items: [
        {
          to: '/admin/manage/schedules',
          icon: <Calendar className="h-5 w-5" />,
          label: 'Управление расписанием',
        },
        {
          to: '/admin/schedule',
          icon: <CalendarCheck className="h-5 w-5" />,
          label: 'Просмотр расписания',
        },
      ],
    },
    {
      title: 'Учебный процесс',
      items: [
        {
          to: '/admin/manage/journals',
          icon: <BookMarked className="h-5 w-5" />,
          label: 'Журналы',
        },
        {
          to: '/admin/grades',
          icon: <BookOpenCheck className="h-5 w-5" />,
          label: 'Оценки',
        },
        {
          to: '/admin/attendance',
          icon: <ClipboardList className="h-5 w-5" />,
          label: 'Посещаемость',
        },
      ],
    },
    {
      title: 'Общение и новости',
      items: [
        {
          to: '/admin/chat',
          icon: <Users className="h-5 w-5" />,
          label: 'Чат',
        },
        {
          to: '/admin/news',
          icon: <BookOpen className="h-5 w-5" />,
          label: 'Новости',
        },
      ],
    },
  ];

  const renderNavItems = () => (
    <ScrollArea className="flex-1">
      <div className="space-y-4 py-4">
        {navItems.map((group) => (
          <div key={group.title} className="px-3 py-2">
            <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
              {group.title}
            </h2>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = location.pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent",
                      isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );

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
      {renderNavItems()}
      <div className="mt-auto p-4">
        <div className="h-px bg-border mb-4" />
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
  const location = useLocation();
  const currentPage = location.pathname.split('/').pop() || 'dashboard';

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-muted/40 md:block">
        <Sidebar />
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6 md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
              <SheetHeader className="p-4">
                <SheetTitle>Админ-панель</SheetTitle>
              </SheetHeader>
              <Sidebar />
            </SheetContent>
          </Sheet>
          <span className="font-bold capitalize">{currentPage}</span>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background">
          <Outlet /> {/* Здесь будут рендериться дочерние страницы админки */}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
