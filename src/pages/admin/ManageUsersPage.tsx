import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import CreateUserForm from '@/components/admin/users/CreateUserForm';
import EditUserDialog from '@/components/admin/users/EditUserDialog';
import ApproveUserDialog from '@/components/admin/users/ApproveUserDialog';
import UserList from '@/components/admin/users/UserList';
import { toast } from 'sonner';
import { getUsers, deleteUser } from '@/lib/firebaseService/userService';
import type { AppUser, UserRole, UserStatus } from '@/types/index';
import { Toaster } from '@/components/ui/sonner';
import type { DocumentSnapshot } from 'firebase/firestore';

export default function ManageUsersPage() {
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AppUser[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<UserStatus | 'all'>('all');
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | undefined>(undefined);

  const loadUsers = useCallback(async (reset = false) => {
    let loadedUsers: AppUser[] = [];
    try {
      setIsLoading(true);
      if (reset) {
        setHasMore(true);
        setLastDoc(undefined);
      }

      if (!hasMore && !reset) {
        setIsLoading(false);
        return;
      }

      const result = await getUsers({
        role: selectedRole === 'all' ? undefined : selectedRole,
        status: selectedStatus === 'all' ? undefined : selectedStatus,
        limit: 20,
        startAfterDoc: reset ? undefined : lastDoc,
      });
      loadedUsers = result.users;
      setAllUsers(prev => reset ? loadedUsers : [...prev, ...loadedUsers]);
      setLastDoc(result.lastDoc || undefined);
      setHasMore(loadedUsers.length === 20);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Не удалось загрузить список пользователей');
    } finally {
      setIsLoading(false);
    }
  }, [selectedRole, selectedStatus, lastDoc, hasMore]);

  useEffect(() => {
    loadUsers(true);
  }, [loadUsers]);

  // Фильтрация пользователей при изменении поискового запроса или фильтров
  useEffect(() => {
    const filtered = allUsers.filter(user => {
      const matchesSearch = searchQuery.trim() === '' || 
        `${user.firstName} ${user.lastName} ${user.middleName || ''} ${user.email}`.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesRole = selectedRole === 'all' || user.role === selectedRole;
      const matchesStatus = selectedStatus === 'all' || user.status === selectedStatus;
      
      return matchesSearch && matchesRole && matchesStatus;
    });

    setFilteredUsers(filtered);
  }, [allUsers, searchQuery, selectedRole, selectedStatus]);

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false);
    loadUsers(true);
    toast.success('Пользователь успешно создан');
  };

  const handleEdit = (user: AppUser) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    setSelectedUser(null);
    loadUsers(true);
    toast.success('Пользователь успешно обновлен');
  };

  const handleApprove = (user: AppUser) => {
    setSelectedUser(user);
    setIsApproveDialogOpen(true);
  };

  const handleApproveSuccess = () => {
    setIsApproveDialogOpen(false);
    setSelectedUser(null);
    loadUsers(true);
    toast.success('Пользователь успешно одобрен');
  };

  const handleDelete = async (user: AppUser) => {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) {
      return;
    }

    try {
      await deleteUser(user.uid);
      loadUsers(true);
      toast.success('Пользователь успешно удален');
    } catch {
      toast.error('Не удалось удалить пользователя');
    }
  };

  return (
    <div className="container mx-auto py-6">
      <Toaster richColors position="top-right" />

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Управление пользователями</h1>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Создать пользователя
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по имени, email или ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as UserRole | 'all')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Роль" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все роли</SelectItem>
              <SelectItem value="admin">Администратор</SelectItem>
              <SelectItem value="teacher">Преподаватель</SelectItem>
              <SelectItem value="student">Студент</SelectItem>
              <SelectItem value="pending_approval">На одобрении</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as UserStatus | 'all')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="active">Активен</SelectItem>
              <SelectItem value="suspended">Заблокирован</SelectItem>
              <SelectItem value="pending_approval">Ожидает одобрения</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading && allUsers.length === 0 && (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {(allUsers.length > 0 || !isLoading) && (
        <>
      <UserList
            users={filteredUsers}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onApprove={handleApprove}
      />
        </>
      )}

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
