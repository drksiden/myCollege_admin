// src/pages/admin/UsersPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  getPaginationRowModel,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input'; // Пока не используется
import {
  ArrowUpDown,
  MoreHorizontal,
  UserPlusIcon,
  RefreshCw,
  Trash2,
  Pencil,
  Eye,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
// import { Checkbox } from '@/components/ui/checkbox'; // Пока не используется
import { functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { motion /*, AnimatePresence */ } from 'framer-motion'; // AnimatePresence пока не используется
import { UserFormDialog } from '@/components/admin/users/UserForm'; // Импортируем нашу форму
import { Toaster, toast } from "sonner"; 
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  patronymic?: string;
  role: 'admin' | 'teacher' | 'student';
  teacherDetails?: {
    department: string;
    qualification: string;
  };
  studentDetails?: {
    groupId: string;
    studentId: string;
  };
}

const TableRowSkeleton: React.FC<{ columnsCount: number }> = ({
  columnsCount,
}) => (
  <TableRow>
    {Array.from({ length: columnsCount }).map((_, index) => (
      <TableCell key={index}>
        <Skeleton className="h-5 w-full" />
      </TableCell>
    ))}
  </TableRow>
);

const UsersPage: React.FC = () => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const listUsersFunction = httpsCallable(functions, 'listUsers');
      const result = await listUsersFunction();
      const resultData = result.data as {
        success: boolean;
        users?: User[];
        message?: string;
      };

      if (resultData.success && resultData.users) {
        setData(resultData.users);
      } else {
        throw new Error(
          resultData.message || 'Не удалось получить список пользователей.'
        );
      }
    } catch (err: unknown) {
      console.error('Ошибка при загрузке пользователей:', err);
      let errorMessage = 'Произошла ошибка при загрузке данных.';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      // Для более специфичных ошибок Firebase:
      // import { FirebaseError } from 'firebase/app';
      // if (err instanceof FirebaseError && err.code) { /* ... */ }
      setError(errorMessage);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUserCreatedOrUpdated = () => {
    fetchUsers(); // Обновляем список
  };

  const openEditUserDialog = (user: User) => {
    setEditingUser(user); // Сохраняем данные пользователя для редактирования
    setIsUserFormOpen(true); // Открываем тот же диалог
  };

  const closeUserDialog = () => {
    setIsUserFormOpen(false);
    setEditingUser(null); // Сбрасываем редактируемого пользователя
  }

  const handleDeleteUser = async (user: User) => {
    try {
      const deleteUserFunction = httpsCallable(functions, 'deleteUser');
      const result = await deleteUserFunction({ userId: user.id });
      const resultData = result.data as { success: boolean; message: string };

      if (resultData.success) {
        toast.success(resultData.message);
        fetchUsers();
      } else {
        throw new Error(resultData.message);
      }
    } catch (err: unknown) {
      console.error('Ошибка при удалении пользователя:', err);
      let errorMessage = 'Произошла ошибка при удалении пользователя.';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      toast.error(errorMessage);
    } finally {
      setUserToDelete(null);
    }
  };

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        accessorKey: 'fullName',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            ФИО
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) =>
          `${row.original.lastName} ${row.original.firstName} ${
            row.original.patronymic || ''
          }`,
        sortingFn: 'alphanumeric',
      },
      {
        accessorKey: 'email',
        header: 'Email',
      },
      {
        accessorKey: 'role',
        header: 'Роль',
        cell: ({ row }) => {
          const role = row.original.role;
          return (
            <Badge variant={role === 'admin' ? 'destructive' : role === 'teacher' ? 'default' : 'secondary'}>
              {role === 'admin' ? 'Администратор' : role === 'teacher' ? 'Преподаватель' : 'Студент'}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'studentDetails',
        header: 'Группа',
        cell: ({ row }) => row.original.studentDetails?.groupId || '—',
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Действия</div>,
        cell: ({ row }) => {
          const user = row.original;
          return (
            <div className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Открыть меню</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Действия</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => console.log('View user', user.id)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Просмотреть
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openEditUserDialog(user)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Редактировать
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive hover:!bg-destructive/10"
                    onClick={() => setUserToDelete(user)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Удалить
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const columnsCount = columns.length;

  return (
    <><Toaster richColors position="top-right" /><motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col gap-4"
    >
      <div className="flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Пользователи
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchUsers}
            disabled={loading}
            title="Обновить список"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          {/* TODO: Кнопка для открытия модального окна создания пользователя */}
          <Button onClick={() => { setEditingUser(null); setIsUserFormOpen(true); }}>
            <UserPlusIcon className="mr-2 h-4 w-4" /> Создать пользователя
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Ошибка!</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRowSkeleton key={i} columnsCount={columnsCount} />
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className={row.getIsSelected() ? 'bg-muted' : ''} // getIsSelected() если будете использовать выбор строк
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2.5">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </motion.tr>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columnsCount} className="h-24 text-center">
                  Нет данных.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {!loading && data.length > 0 && (
        <div className="flex items-center justify-between space-x-2 py-4">
          <div className="text-sm text-muted-foreground">
            Всего пользователей: {data.length}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Назад
            </Button>
            <span className="text-sm">
              Стр. {table.getState().pagination.pageIndex + 1} из{' '}
              {table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Вперед
            </Button>
          </div>
        </div>
      )}
    </motion.div><UserFormDialog
        key={editingUser ? editingUser.id : 'new-user'}
        open={isUserFormOpen}
        onOpenChange={closeUserDialog}
        onUserSubmitSuccess={handleUserCreatedOrUpdated}
        initialData={editingUser || undefined}
      />

      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить пользователя?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Пользователь будет удален из системы.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToDelete && handleDeleteUser(userToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog></>
  );
};

export default UsersPage;