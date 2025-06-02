import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Pencil, Trash2 } from 'lucide-react';
import type { AppUser, UserRole, UserStatus } from '@/types/index';

interface UserListProps {
  users: AppUser[];
  onEdit: (user: AppUser) => void;
  onDelete: (user: AppUser) => void;
  onApprove?: (user: AppUser) => void;
}

const roleLabels: Record<UserRole, string> = {
  admin: 'Администратор',
  teacher: 'Преподаватель',
  student: 'Студент',
  pending_approval: 'На одобрении',
};

const statusLabels: Record<UserStatus, string> = {
  active: 'Активен',
  suspended: 'Заблокирован',
  pending_approval: 'Ожидает одобрения',
};

export default function UserList({ users, onEdit, onDelete, onApprove }: UserListProps) {
  const getRoleBadge = (role: UserRole) => {
    const colors: Record<UserRole, string> = {
      admin: 'bg-red-500',
      teacher: 'bg-blue-500',
      student: 'bg-green-500',
      pending_approval: 'bg-yellow-500',
    };
    return <Badge className={colors[role]}>{roleLabels[role]}</Badge>;
  };

  const getStatusBadge = (status: UserStatus) => {
    const colors: Record<UserStatus, string> = {
      active: 'bg-green-500',
      suspended: 'bg-red-500',
      pending_approval: 'bg-yellow-500',
    };
    return <Badge className={colors[status]}>{statusLabels[status]}</Badge>;
  };

  if (!users.length) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-lg font-medium text-muted-foreground">Нет пользователей</p>
        <p className="text-sm text-muted-foreground">Создайте нового пользователя, нажав на кнопку выше</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg shadow">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ФИО</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Роль</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead className="text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.uid}>
              <TableCell>{`${user.lastName} ${user.firstName} ${user.middleName || ''}`}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{getRoleBadge(user.role)}</TableCell>
              <TableCell>{getStatusBadge(user.status)}</TableCell>
              <TableCell>
                <div className="flex justify-end gap-2">
                  {user.status === 'pending_approval' && onApprove && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onApprove(user)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Одобрить
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(user)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Изменить
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onDelete(user)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Удалить
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 