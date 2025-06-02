// src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import LoginPage from '@/pages/LoginPage';
import AdminLayout from '@/components/layout/AdminLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardPage from '@/pages/admin/DashboardPage';
import { GroupDetailsPage } from '@/components/admin/groups/GroupDetailsPage';
import SchedulePage from '@/pages/admin/SchedulePage';
import { GradesPage } from '@/components/admin/grades/GradesPage';
import { AttendancePage } from '@/components/admin/attendance/AttendancePage';
import ManageUsersPage from '@/pages/admin/ManageUsersPage';
import ManageGroupsPage from '@/pages/admin/ManageGroupsPage';
import ManageJournalsPage from '@/pages/admin/ManageJournalsPage';
import ManageSchedulesPage from '@/pages/admin/ManageSchedulesPage';
import ManageSubjectsPage from '@/pages/admin/ManageSubjectsPage';
import ManageSemestersPage from '@/pages/admin/ManageSemestersPage';
import ChatPage from '@/pages/admin/ChatPage';
import NewsPage from '@/pages/admin/NewsPage';
import { Loader2 } from 'lucide-react';

function App() {
  const { currentUser, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
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
          <Route path="manage/semesters" element={<ManageSemestersPage />} />

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
