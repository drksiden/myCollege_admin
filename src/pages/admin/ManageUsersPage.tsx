import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import CreateUserForm from '@/components/admin/users/CreateUserForm';
import UserList from '@/components/admin/users/UserList';
import { Toaster } from '@/components/ui/sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const ManageUsersPage: React.FC = () => {
  // State to trigger UserList refresh after a new user is created or an existing one is updated/deleted.
  // Changing the key of a component forces it to re-mount.
  const [userListKey, setUserListKey] = useState(0);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const handleUserChange = useCallback(() => {
    setUserListKey(prevKey => prevKey + 1);
    setShowCreateDialog(false);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto p-4 sm:p-6 lg:p-8"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Управление пользователями</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Создание, просмотр, редактирование и управление учетными записями пользователей
          </p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="w-12 h-12 md:w-auto md:h-auto flex items-center justify-center gap-2"
                size="lg"
              >
                <PlusCircle className="h-5 w-5" />
                <span className="hidden sm:inline">Создать пользователя</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Новый пользователь</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="w-full bg-card shadow sm:rounded-lg overflow-x-auto">
        <UserList key={userListKey} />
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="w-full max-w-xs sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Создание пользователя</DialogTitle>
          </DialogHeader>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
          >
            <CreateUserForm onUserCreated={handleUserChange} />
          </motion.div>
        </DialogContent>
      </Dialog>

      <Toaster richColors />
    </motion.div>
  );
};

export default ManageUsersPage;
