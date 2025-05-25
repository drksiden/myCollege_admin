import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Loader2, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { getUsersFromFirestore } from '@/lib/firebaseService/userService';
import type { User } from '@/types';
import EditUserDialog from './EditUserDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Timestamp } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { Progress } from "@/components/ui/progress";
import { ru } from 'date-fns/locale';
import { Search } from 'lucide-react';
import type { CheckedState } from '@radix-ui/react-checkbox';

interface UserListProps {
  key?: number;
}

const UserList: React.FC<UserListProps> = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [lastDeletedUser, setLastDeletedUser] = useState<User | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [undoProgress, setUndoProgress] = useState(0);
  const undoTimeoutRef = useRef<NodeJS.Timeout>();
  const progressIntervalRef = useRef<NodeJS.Timeout>();

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const fetchedUsers = await getUsersFromFirestore(db);
      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSelectUser = (checked: CheckedState, userId: string) => {
    setSelectedUsers(prev => {
      const newSelected = new Set(prev);
      if (checked) {
        newSelected.add(userId);
      } else {
        newSelected.delete(userId);
      }
      return newSelected;
    });
  };

  const handleSelectAll = (checked: CheckedState) => {
    if (checked) {
      setSelectedUsers(new Set(filteredUsers.map(user => user.uid)));
    } else {
      setSelectedUsers(new Set());
    }
  };

  const startUndoTimer = () => {
    const duration = 5000; // 5 seconds
    const interval = 50; // Update every 50ms
    const steps = duration / interval;
    let currentStep = 0;

    setUndoProgress(0);
    progressIntervalRef.current = setInterval(() => {
      currentStep++;
      const progress = (currentStep / steps) * 100;
      setUndoProgress(progress);
    }, interval);

    undoTimeoutRef.current = setTimeout(() => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      setLastDeletedUser(null);
      setUndoProgress(0);
    }, duration);
  };

  const handleDelete = async (user: User) => {
    try {
      const functions = getFunctions(undefined, 'asia-southeast1');
      const deleteUserFn = httpsCallable(functions, 'deleteUserFunction');
      setLastDeletedUser(user);
      await deleteUserFn({ userId: user.uid });
      setUsers(prevUsers => prevUsers.filter(u => u.uid !== user.uid));
      
      toast.success(`User ${user.firstName} ${user.lastName} deleted successfully`, {
        action: {
          label: 'Undo',
          onClick: async () => {
            if (!lastDeletedUser) return;
            const restoreUser = httpsCallable(functions, 'createUserFunction');
            try {
              await restoreUser({ ...lastDeletedUser, password: 'TempPassword123!' });
              setUsers(prev => [...prev, lastDeletedUser]);
              toast.success('User restored');
              setLastDeletedUser(null);
              if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
              if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
              setUndoProgress(0);
            } catch (e) {
              console.error('Error restoring user:', e);
              toast.error('Failed to restore user');
            }
          },
        },
        duration: 5000,
      });

      startUndoTimer();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    } finally {
      setDeletingUser(null);
      setShowDeleteConfirm(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.size === 0) return;

    try {
      const functions = getFunctions(undefined, 'asia-southeast1');
      const deleteUserFn = httpsCallable(functions, 'deleteUserFunction');
      const deletedUsers: User[] = [];

      for (const userId of selectedUsers) {
        const user = users.find(u => u.uid === userId);
        if (user) {
          await deleteUserFn({ userId });
          deletedUsers.push(user);
        }
      }

      setUsers(prevUsers => prevUsers.filter(u => !selectedUsers.has(u.uid)));
      setSelectedUsers(new Set());

      toast.success(`Deleted ${deletedUsers.length} users successfully`, {
        action: {
          label: 'Undo',
          onClick: async () => {
            const restoreUser = httpsCallable(functions, 'createUserFunction');
            try {
              for (const user of deletedUsers) {
                await restoreUser({ ...user, password: 'TempPassword123!' });
              }
              setUsers(prev => [...prev, ...deletedUsers]);
              toast.success('Users restored');
            } catch (e) {
              console.error('Error restoring users:', e);
              toast.error('Failed to restore users');
            }
          },
        },
        duration: 5000,
      });

      startUndoTimer();
    } catch (error) {
      console.error('Error deleting users:', error);
      toast.error('Failed to delete users');
    }
  };

  const handleUserUpdated = () => {
    fetchUsers();
  };

  const filteredUsers = users.filter(user => 
    user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.middleName && user.middleName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск пользователей..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 py-2 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary/30 transition"
          />
        </div>
        <div className="flex items-center space-x-2 mt-2 sm:mt-0">
          {selectedUsers.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              className="flex items-center gap-2 rounded-lg shadow-md"
            >
              <Trash2 className="h-4 w-4" />
              Удалить выбранных ({selectedUsers.size})
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-muted/50">
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                  onCheckedChange={handleSelectAll}
                  className="translate-y-[2px]"
                />
              </TableHead>
              <TableHead>Фамилия</TableHead>
              <TableHead>Имя</TableHead>
              <TableHead>Отчество</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Роль</TableHead>
              <TableHead>Дата создания</TableHead>
              <TableHead className="w-[100px]">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  Пользователи не найдены
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.uid} className="hover:bg-primary/5 transition">
                  <TableCell>
                    <Checkbox
                      checked={selectedUsers.has(user.uid)}
                      onCheckedChange={(checked) => handleSelectUser(checked, user.uid)}
                      className="translate-y-[2px]"
                    />
                  </TableCell>
                  <TableCell className="font-medium">{user.lastName}</TableCell>
                  <TableCell className="font-medium">{user.firstName}</TableCell>
                  <TableCell className="font-medium">{user.middleName || '-'}</TableCell>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={
                      user.role === 'admin' ? 'destructive' :
                      user.role === 'teacher' ? 'default' :
                      'secondary'
                    } className={
                      user.role === 'admin' ? 'bg-red-500/80 text-white' :
                      user.role === 'teacher' ? 'bg-blue-500/80 text-white' :
                      'bg-green-500/80 text-white'
                    }>
                      {user.role === 'admin' ? 'Администратор' :
                       user.role === 'teacher' ? 'Преподаватель' :
                       'Студент'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.createdAt instanceof Timestamp
                      ? format(user.createdAt.toDate(), 'd MMMM yyyy', { locale: ru })
                      : 'Н/Д'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 rounded-full hover:bg-primary/10">
                          <span className="sr-only">Открыть меню</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Действия</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => setEditingUser(user)}
                          className="cursor-pointer"
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Редактировать
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="cursor-pointer text-destructive focus:text-destructive"
                          onClick={() => {
                            setDeletingUser(user);
                            setShowDeleteConfirm(true);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {undoProgress > 0 && (
        <div className="fixed bottom-4 right-4 w-64 bg-background p-4 rounded-md shadow border">
          <div className="text-sm font-medium mb-2">Доступна отмена</div>
          <Progress value={undoProgress} className="h-2" />
        </div>
      )}

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие удалит пользователя и все связанные с ним данные. Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deletingUser && handleDelete(deletingUser)} 
              className="bg-destructive hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editingUser && (
        <EditUserDialog
          user={editingUser}
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
          onUserUpdated={handleUserUpdated}
        />
      )}
    </div>
  );
};

export default UserList;
