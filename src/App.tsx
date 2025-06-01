// src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import AdminLayout from './components/layout/AdminLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import DashboardPage from './pages/admin/DashboardPage';
import { GroupDetailsPage } from './components/admin/groups/GroupDetailsPage';
import SchedulePage from './pages/admin/SchedulePage';
import { AttendancePage } from './components/admin/attendance/AttendancePage';
import { GradesPage } from './components/admin/grades/GradesPage';
import ManageUsersPage from './pages/admin/ManageUsersPage';
import ManageGroupsPage from './pages/admin/ManageGroupsPage';
import ManageJournalsPage from './pages/admin/ManageJournalsPage';
import ManageSchedulesPage from './pages/admin/ManageSchedulesPage';
import ManageSubjectsPage from './pages/admin/ManageSubjectsPage';
import ChatPage from './pages/admin/ChatPage';
import NewsPage from './pages/admin/NewsPage';
import { useAuth } from './contexts/AuthContext';

function App() {
  const { currentUser, isAdmin, loading } = useAuth();

  if (loading) {
    return <div>Глобальная загрузка...</div>;
  }

  return (
    <Routes>
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

      <Route element={<ProtectedRoute isAdminRoute={true} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<DashboardPage />} />
          
          {/* Основные страницы */}
          <Route path="groups/:groupId" element={<GroupDetailsPage />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="grades" element={<GradesPage />} />
          <Route path="attendance" element={<AttendancePage />} />

          {/* Страницы управления */}
          <Route path="manage/users" element={<ManageUsersPage />} />
          <Route path="manage/groups" element={<ManageGroupsPage />} />
          <Route path="manage/journals" element={<ManageJournalsPage />} />
          <Route path="manage/schedules" element={<ManageSchedulesPage />} />
          <Route path="manage/subjects" element={<ManageSubjectsPage />} />

          {/* Новые разделы */}
          <Route path="chat" element={<ChatPage />} />
          <Route path="news" element={<NewsPage />} />

          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>
      </Route>

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
