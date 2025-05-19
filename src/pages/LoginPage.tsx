// src/pages/LoginPage.tsx
import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Импортируем Alert
import { AlertCircle } from 'lucide-react'; // Иконка для Alert
import { FirebaseError } from 'firebase/app';

// ... (useAuth импорт если он тут нужен, но для логина он не обязателен напрямую)

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/admin/dashboard');
    } catch (err: unknown) {
      let errorMessage = 'Произошла неизвестная ошибка при входе.';
      if (err instanceof FirebaseError) {
        // <--- Проверяем, является ли ошибка экземпляром FirebaseError
        // Теперь TypeScript знает, что у err есть свойство code
        switch (err.code) {
          case 'auth/invalid-credential':
            // Firebase может возвращать 'auth/invalid-credential' для нескольких сценариев:
            // - Пользователь не найден
            // - Неверный пароль
            // Поэтому общее сообщение здесь подходит
            errorMessage =
              'Неверный email или пароль. Пожалуйста, проверьте введенные данные.';
            break;
          case 'auth/user-not-found': // Хотя часто это будет invalid-credential
            errorMessage = 'Пользователь с таким email не найден.';
            break;
          case 'auth/wrong-password': // Аналогично, часто это будет invalid-credential
            errorMessage = 'Неверный пароль. Пожалуйста, попробуйте еще раз.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Некорректный формат email адреса.';
            break;
          case 'auth/user-disabled':
            errorMessage = 'Учетная запись этого пользователя отключена.';
            break;
          case 'auth/too-many-requests':
            errorMessage =
              'Слишком много неудачных попыток входа. Пожалуйста, попробуйте позже или сбросьте пароль.';
            break;
          // Можно добавить другие специфичные коды ошибок Firebase Auth
          default:
            // Для других ошибок Firebase, которых нет в switch, можно использовать err.message
            errorMessage = `Ошибка входа: ${err.message} (код: ${err.code})`;
        }
      } else if (err instanceof Error) {
        // Если это другая ошибка, не FirebaseError, но все еще Error
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        // Если ошибка - просто строка
        errorMessage = err;
      }
      setError(errorMessage);
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-sm shadow-2xl bg-card/80 backdrop-blur-md border-border/20">
        <CardHeader className="text-center">
          {/* Можно добавить иконку/логотип */}
          <CardTitle className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
            Админ-панель
          </CardTitle>
          <CardDescription className="text-muted-foreground/80 pt-1">
            Вход для администраторов системы
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="grid gap-6 py-6">
            {error && (
              <Alert
                variant="destructive"
                className="animate-in fade-in-50 slide-in-from-bottom-5 duration-500"
              >
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Ошибка входа</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-muted-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-background/70 focus:bg-background text-base py-2 px-4"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password" className="text-muted-foreground">
                Пароль
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-background/70 focus:bg-background text-base py-2 px-4"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 pb-6">
            <Button
              type="submit"
              className="w-full text-base py-6 font-semibold tracking-wider"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>{' '}
                  Обработка...
                </>
              ) : (
                'Войти'
              )}
            </Button>
            {/* Здесь можно добавить ссылку "Забыли пароль?", если нужно */}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default LoginPage;
