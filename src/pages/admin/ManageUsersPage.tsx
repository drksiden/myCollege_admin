import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import CreateUserForm from '@/components/admin/users/CreateUserForm';
import UserList from '@/components/admin/users/UserList';
import { Toaster } from '@/components/ui/sonner';

const ManageUsersPage: React.FC = () => {
  // State to trigger UserList refresh after a new user is created or an existing one is updated/deleted.
  // Changing the key of a component forces it to re-mount.
  const [userListKey, setUserListKey] = useState(0);

  const handleUserChange = useCallback(() => {
    setUserListKey(prevKey => prevKey + 1);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto p-4 sm:p-6 lg:p-8"
    >
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl font-bold tracking-tight">
            Управление пользователями
          </CardTitle>
          <CardDescription>
            Создание, просмотр, редактирование и управление учетными записями пользователей
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Создание пользователя</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateUserForm onUserCreated={handleUserChange} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Список пользователей</CardTitle>
          </CardHeader>
          <CardContent>
            {/* 
                The UserList component now internally handles its data fetching and updates
                when EditUserDialog or its own delete action completes.
                The key-based refresh is still useful if CreateUserForm was completely separate,
                but since UserList fetches on mount and after its own operations,
                explicitly passing handleUserChange to UserList for its internal operations
                is not strictly necessary if it calls fetchUsers itself.
                However, ensuring CreateUserForm can trigger a list refresh is good.
              */}
            <UserList key={userListKey} />
          </CardContent>
        </Card>
      </div>

      <Toaster richColors />
    </motion.div>
  );
};

export default ManageUsersPage;
