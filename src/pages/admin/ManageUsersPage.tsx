import React, { useState, useCallback } from 'react';
import CreateUserForm from '@/components/admin/users/CreateUserForm';
import UserList from '@/components/admin/users/UserList';
import { Toaster } from '@/components/ui/sonner'; // Ensure Toaster is rendered for toast notifications

const ManageUsersPage: React.FC = () => {
  // State to trigger UserList refresh after a new user is created or an existing one is updated/deleted.
  // Changing the key of a component forces it to re-mount.
  const [userListKey, setUserListKey] = useState(0);

  const handleUserChange = useCallback(() => {
    setUserListKey(prevKey => prevKey + 1);
  }, []);

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          User Management
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Create, view, edit, and manage user accounts.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-1 space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-200">Create New User</h2>
            <div className="p-6 bg-white dark:bg-gray-800 shadow rounded-lg">
              <CreateUserForm onUserCreated={handleUserChange} />
            </div>
          </div>
        </section>

        <section className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-200">User List</h2>
            <div className="p-0 sm:p-2 md:p-4 bg-white dark:bg-gray-800 shadow rounded-lg">
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
            </div>
          </div>
        </section>
      </div>
      <Toaster richColors /> {/* Ensure Toaster is included for sonner notifications */}
    </div>
  );
};

export default ManageUsersPage;
