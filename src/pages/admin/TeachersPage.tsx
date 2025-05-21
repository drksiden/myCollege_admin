import React, { useEffect, useMemo, useState } from 'react';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  getPaginationRowModel,
  getFilteredRowModel,
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
import { Input } from '@/components/ui/input';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { UserFormDialog } from '@/components/admin/users/UserForm';
import { Toaster, toast } from "sonner";
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
import type { User } from '@/pages/admin/UsersPage';
import { functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';

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

const TeachersPage: React.FC = () => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [globalFilter, setGlobalFilter] = useState('');

  const fetchTeachers = async () => {
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
        // Фильтруем только преподавателей
        const teachers = resultData.users.filter(user => user.role === 'teacher');
        setData(teachers);
      } else {
        throw new Error(
          resultData.message || 'Не удалось получить список преподавателей.'
        );
      }
    } catch (err: unknown) {
      console.error('Ошибка при загрузке преподавателей:', err);
      let errorMessage = 'Произошла ошибка при загрузке данных.';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleUserCreatedOrUpdated = () => {
    fetchTeachers();
  };

  const openEditUserDialog = (user: User) => {
    setEditingUser(user);
    setIsUserFormOpen(true);
  };

  const closeUserDialog = () => {
    setIsUserFormOpen(false);
    setEditingUser(null);
  };

  const handleDeleteUser = async (user: User) => {
    try {
      const deleteUserFunction = httpsCallable(functions, 'deleteUser');
      const result = await deleteUserFunction({ userId: user.id });
      const resultData = result.data as { success: boolean; message: string };

      if (resultData.success) {
        toast.success(resultData.message);
        fetchTeachers();
      } else {
        throw new Error(resultData.message);
      }
    } catch (err: unknown) {
      console.error('Ошибка при удалении преподавателя:', err);
      let errorMessage = 'Произошла ошибка при удалении преподавателя.';
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
        accessorKey: 'teacherDetails.department',
        header: 'Кафедра',
        cell: ({ row }) => row.original.teacherDetails?.department || '—',
      },
      {
        accessorKey: 'teacherDetails.qualification',
        header: 'Квалификация',
        cell: ({ row }) => row.original.teacherDetails?.qualification || '—',
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
                    onClick={() => console.log('View teacher', user.id)}
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
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const columnsCount = columns.length;

  return (
    <>
      <Toaster richColors position="top-right" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col gap-4"
      >
        <div className="flex justify-between items-center">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Преподаватели
          </h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={fetchTeachers}
              disabled={loading}
              title="Обновить список"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={() => { setEditingUser(null); setIsUserFormOpen(true); }}>
              <UserPlusIcon className="mr-2 h-4 w-4" /> Добавить преподавателя
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

        <div className="flex items-center py-4">
          <Input
            placeholder="Поиск преподавателей..."
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="max-w-sm"
          />
        </div>

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
                    className={row.getIsSelected() ? 'bg-muted' : ''}
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
              Всего преподавателей: {data.length}
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
      </motion.div>

      <UserFormDialog
        key={editingUser ? editingUser.id : 'new-user'}
        open={isUserFormOpen}
        onOpenChange={closeUserDialog}
        onUserSubmitSuccess={handleUserCreatedOrUpdated}
        initialData={editingUser || undefined}
      />

      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить преподавателя?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Преподаватель будет удален из системы.
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
      </AlertDialog>
    </>
  );
};

export default TeachersPage; 