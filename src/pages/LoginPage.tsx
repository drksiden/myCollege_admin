// src/pages/LoginPage.tsx
import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase'; // Убедитесь, что путь правильный
import { useNavigate } from 'react-router-dom'; // Импортирован
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext'; // Импортируем useAuth для доступа к isAdmin

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate(); // Инициализирован
  const { isAdmin } = useAuth(); // Получаем isAdmin из контекста

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Пользователь успешно вошел. AuthContext обновит состояние.
      // Теперь используем navigate для перехода.
      // Проверим isAdmin уже после того, как AuthContext его обновит,
      // или просто перейдем на дашборд, а ProtectedRoute разберется.
      // Для простоты пока просто переходим на /admin/dashboard.
      // AuthProvider должен успеть обновить isAdmin до того, как ProtectedRoute отработает.
      navigate('/admin/dashboard'); // <--- ИСПОЛЬЗУЕМ NAVIGATE ЗДЕСЬ
    } catch (err: unknown) {
      // <--- ТИПИЗИРУЕМ ОШИБКУ КАК unknown
      if (err instanceof Error) {
        setError(err.message);
      } else if (typeof err === 'string') {
        setError(err);
      } else {
        setError('Произошла неизвестная ошибка при входе.');
      }
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Если пользователь уже залогинен и является админом, можно редиректить сразу
  // Однако, это может вызвать проблемы с "Cannot update a component while rendering a different component"
  // Лучше оставить эту логику в App.tsx или ProtectedRoute
  // useEffect(() => {
  //   if (currentUser && isAdmin) {
  //     navigate('/admin/dashboard');
  //   }
  // }, [currentUser, isAdmin, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Вход в Админ-панель</CardTitle>
          <CardDescription>
            Пожалуйста, введите ваши учетные данные для входа.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Вход...' : 'Войти'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default LoginPage;
