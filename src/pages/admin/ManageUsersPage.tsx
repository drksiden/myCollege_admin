import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import CreateUserForm from '@/components/admin/users/CreateUserForm';
import EditUserDialog from '@/components/admin/users/EditUserDialog';
import ApproveUserDialog from '@/components/admin/users/ApproveUserDialog';
import UserList from '@/components/admin/users/UserList';
import { toast } from 'sonner';
import { getUsers, deleteUser } from '@/lib/firebaseService/userService';
import type { AppUser } from '@/types/index';

export default function ManageUsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);

  const loadUsers = async () => {
    try {
      const { users: loadedUsers } = await getUsers();
      setUsers(loadedUsers);
    } catch {
      toast.error('Не удалось загрузить список пользователей');
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false);
    loadUsers();
    toast.success('Пользователь успешно создан');
  };

  const handleEdit = (user: AppUser) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    setSelectedUser(null);
    loadUsers();
    toast.success('Пользователь успешно обновлен');
  };

  const handleApprove = (user: AppUser) => {
    setSelectedUser(user);
    setIsApproveDialogOpen(true);
  };

  const handleApproveSuccess = () => {
    setIsApproveDialogOpen(false);
    setSelectedUser(null);
    loadUsers();
    toast.success('Пользователь успешно одобрен');
  };

  const handleDelete = async (user: AppUser) => {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) {
      return;
    }

    try {
      await deleteUser(user.uid);
      loadUsers();
      toast.success('Пользователь успешно удален');
    } catch {
      toast.error('Не удалось удалить пользователя');
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Управление пользователями</h1>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Создать пользователя
        </Button>
      </div>

      <UserList
        users={users}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onApprove={handleApprove}
      />

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создание пользователя</DialogTitle>
          </DialogHeader>
          <CreateUserForm
            onSuccess={handleCreateSuccess}
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {selectedUser && (
        <>
          <EditUserDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            user={selectedUser}
            onUserUpdated={handleEditSuccess}
          />

          <ApproveUserDialog
            open={isApproveDialogOpen}
            onOpenChange={setIsApproveDialogOpen}
            user={selectedUser}
            onApproved={handleApproveSuccess}
          />
        </>
      )}
    </div>
  );
}
