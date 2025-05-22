import React, { useEffect, useState, useCallback } from 'react';
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
import { MoreHorizontal, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { getUsersFromFirestore, deleteUserFromFirestore } from '@/lib/firebaseService/userService';
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

interface UserListProps {
  key?: number;
}

const UserList: React.FC<UserListProps> = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedUsers = await getUsersFromFirestore(db);
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Ошибка при загрузке пользователей:", error);
      toast.error("Не удалось загрузить пользователей");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setShowEditDialog(true);
  };

  const handleDeleteInitiate = (user: User) => {
    setDeletingUser(user);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deletingUser) return;
    try {
      await deleteUserFromFirestore(db, deletingUser.uid);
      toast.success(`Пользователь ${deletingUser.firstName} ${deletingUser.lastName} удален`);
      setUsers(prevUsers => prevUsers.filter(u => u.uid !== deletingUser.uid));
    } catch (error) {
      console.error("Ошибка при удалении пользователя:", error);
      toast.error("Не удалось удалить пользователя");
    } finally {
      setDeletingUser(null);
      setShowDeleteConfirm(false);
    }
  };

  const handleUserUpdated = () => {
    fetchUsers();
  };
  
  const formatDate = (timestamp: Timestamp | undefined | null): string => {
    if (!timestamp) return 'Н/Д';
    return new Date(timestamp.seconds * 1000).toLocaleDateString('ru-RU');
  };

  const getRoleBadge = (role: User['role']) => {
    const variants = {
      admin: 'destructive',
      teacher: 'secondary',
      student: 'default',
    } as const;

    const labels = {
      admin: 'Администратор',
      teacher: 'Преподаватель',
      student: 'Студент',
    } as const;

    return (
      <Badge variant={variants[role]}>
        {labels[role]}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ФИО</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Роль</TableHead>
            <TableHead>Дата создания</TableHead>
            <TableHead className="text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 && !loading ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                Пользователи не найдены
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.uid}>
                <TableCell>{`${user.firstName} ${user.lastName}`}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{getRoleBadge(user.role)}</TableCell>
                <TableCell>{formatDate(user.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Открыть меню</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Действия</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleEdit(user)}>
                        Редактировать
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDeleteInitiate(user)}
                        className="text-red-600 focus:text-red-600 focus:bg-red-50"
                      >
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

      {showEditDialog && editingUser && (
        <EditUserDialog
          user={editingUser}
          open={showEditDialog}
          onOpenChange={(open) => {
            setShowEditDialog(open);
            if (!open) setEditingUser(null);
          }}
          onUserUpdated={() => {
            setShowEditDialog(false);
            setEditingUser(null);
            handleUserUpdated();
          }}
        />
      )}

      {showDeleteConfirm && deletingUser && (
         <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
           <AlertDialogContent>
             <AlertDialogHeader>
               <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
               <AlertDialogDescription>
                 Это действие удалит пользователя <span className="font-semibold">{deletingUser.firstName} {deletingUser.lastName}</span> из базы данных.
                 <br />
                 <span className="font-semibold text-orange-600">Учетная запись в Firebase Authentication не будет удалена.</span>
                 <br />
                 Это действие нельзя отменить.
               </AlertDialogDescription>
             </AlertDialogHeader>
             <AlertDialogFooter>
               <AlertDialogCancel onClick={() => setDeletingUser(null)}>Отмена</AlertDialogCancel>
               <AlertDialogAction
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 dark:text-slate-50"
               >
                 Удалить
               </AlertDialogAction>
             </AlertDialogFooter>
           </AlertDialogContent>
         </AlertDialog>
      )}
    </div>
  );
};

export default UserList;
