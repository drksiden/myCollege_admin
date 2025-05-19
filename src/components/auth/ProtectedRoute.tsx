// src/components/auth/ProtectedRoute.tsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'; // Убедитесь, что путь правильный

interface ProtectedRouteProps {
  isAdminRoute?: boolean; // Если true, то проверяем еще и роль админа
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ isAdminRoute = false }) => {
  const { currentUser, isAdmin, loading } = useAuth();

  if (loading) {
    // Можно показать скелетон или спиннер загрузки
    return <div>Загрузка аутентификации...</div>;
  }

  if (!currentUser) {
    // Пользователь не аутентифицирован, редирект на страницу входа
    return <Navigate to="/login" replace />;
  }

  if (isAdminRoute && !isAdmin) {
    // Пользователь аутентифицирован, но не админ, редирект на "доступ запрещен" или главную
    // Можно создать специальную страницу "Доступ запрещен"
    alert("У вас нет прав доступа к этому разделу.");
    return <Navigate to="/" replace />; // или на другую страницу
  }

  return <Outlet />; // Если все проверки пройдены, показываем дочерний маршрут
};

export default ProtectedRoute;