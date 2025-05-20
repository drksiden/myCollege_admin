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

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  patronymic?: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  groupId?: string;
  groupName?: string;
};

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
    } catch (err: unknown) { // Изменили any на unknown
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
          const role = row.getValue('role') as User['role'];
          // TODO: Заменить на Badge из Shadcn UI
          switch (role) {
            case 'student': return 'Студент';
            case 'teacher': return 'Преподаватель';
            case 'admin': return 'Администратор';
            default: return role;
          }
        },
      },
      {
        accessorKey: 'groupName',
        header: 'Группа',
        cell: ({ row }) => row.original.groupName || '—',
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
                    Просмотреть
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    // TODO: Реализовать открытие формы редактирования
                    onClick={() => console.log('Edit user', user.id)}
                  >
                    Редактировать
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive hover:!bg-destructive/10"
                    // TODO: Реализовать удаление
                    onClick={() => console.log('Delete user', user.id)}
                  >
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
    <motion.div
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
          <Button onClick={() => console.log('Открыть модальное окно создания')}>
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
            {/* Для информации о выборе строк, если будет */}
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
  );
};

export default UsersPage;