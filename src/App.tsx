// src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import AdminLayout from './components/layout/AdminLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import DashboardPage from './pages/admin/DashboardPage';
import UsersPage from './pages/admin/UsersPage'; // Создайте этот файл
import GroupsPage from './pages/admin/GroupsPage'; // Создайте этот файл
// import SchedulePage from './pages/admin/SchedulePage'; // Создайте этот файл
import { useAuth } from './contexts/AuthContext';

function App() {
  const { currentUser, isAdmin, loading } = useAuth();

  if (loading) {
    return <div>Глобальная загрузка...</div>; // Или ваш компонент загрузки
  }

  return (
    <Routes>
      {/* Публичный маршрут для входа */}
      <Route
        path="/login"
        element={
          currentUser && isAdmin ? (
            <Navigate to="/admin/dashboard" replace />
          ) : (
            <LoginPage />
          )
        }
      />

      {/* Маршруты админ-панели, защищенные ProtectedRoute */}
      <Route element={<ProtectedRoute isAdminRoute={true} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="groups" element={<GroupsPage />} />
          {/* <Route path="schedule" element={<SchedulePage />} /> */}
          {/* Если пользователь пытается зайти на /admin без подмаршрута, перенаправляем на дашборд */}
          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>
      </Route>

      {/* Если пользователь залогинен, но не админ, и пытается попасть в админку (хотя ProtectedRoute должен это обработать)
          Или просто корневой маршрут для не-админов или неаутентифицированных */}
      <Route
        path="/*"
        element={
          currentUser ? (
            isAdmin ? (
              <Navigate to="/admin/dashboard" replace />
            ) : (
              <div>Добро пожаловать, {currentUser.email}! (Не админ)</div>
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

export default App;
