// src/components/ui/delete-dialog.tsx
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Trash2, Loader2 } from 'lucide-react';

interface DeleteDialogProps {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => Promise<void>;
  children: React.ReactNode;
  disabled?: boolean;
}

export function DeleteDialog({
  title = 'Подтверждение удаления',
  description = 'Это действие нельзя отменить.',
  confirmText = 'Удалить',
  cancelText = 'Отмена',
  onConfirm,
  children,
  disabled = false
}: DeleteDialogProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      setOpen(false);
    } catch (error) {
      console.error('Delete error:', error);
      // Ошибка уже должна быть обработана в onConfirm
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild disabled={disabled}>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-line">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Удаление...
              </>
            ) : (
              confirmText
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Специальный компонент для пунктов меню
interface DeleteMenuItemProps {
  title?: string;
  description?: string;
  onConfirm: () => Promise<void>;
  disabled?: boolean;
}

export function DeleteMenuItem({
  title = 'Подтверждение удаления',
  description = 'Это действие нельзя отменить.',
  onConfirm,
  disabled = false
}: DeleteMenuItemProps) {
  return (
    <DeleteDialog
      title={title}
      description={description}
      onConfirm={onConfirm}
      disabled={disabled}
    >
      <div className="flex items-center px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950 cursor-pointer rounded">
        <Trash2 className="mr-2 h-4 w-4" />
        Удалить
      </div>
    </DeleteDialog>
  );
}

// Пример использования в компоненте ManageUsersPage
/*
// В DropdownMenu:
<DropdownMenuContent align="end">
  <DropdownMenuLabel>Действия</DropdownMenuLabel>
  <DropdownMenuItem onClick={() => handleEdit(user)}>
    Редактировать
  </DropdownMenuItem>
  <DropdownMenuSeparator />
  
  <DeleteDialog
    title="Удаление пользователя"
    description={`Вы уверены, что хотите удалить ${getRoleName(user.role).toLowerCase()} "${user.lastName} ${user.firstName}"?

${user.role === 'student' ? 'Все связанные данные студента (оценки, посещаемость) также будут удалены.' : ''}
${user.role === 'teacher' ? 'Все связанные данные преподавателя (журналы, расписание) могут быть затронуты.' : ''}

Это действие нельзя отменить.`}
    onConfirm={async () => {
      const deleteToastId = toast.loading('Удаление пользователя...', { duration: Infinity });
      try {
        await deleteUser(user.uid);
        await loadUsers(true);
        toast.success(`Пользователь ${user.firstName} ${user.lastName} успешно удален`, { id: deleteToastId });
      } catch (error) {
        toast.error('Не удалось удалить пользователя', { id: deleteToastId });
        throw error;
      }
    }}
  >
    <div className="flex items-center px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950 cursor-pointer rounded w-full">
      <Trash2 className="mr-2 h-4 w-4" />
      Удалить
    </div>
  </DeleteDialog>
</DropdownMenuContent>

// Или для обычных кнопок:
<DeleteDialog
  title="Удаление группы"
  description={`Удалить группу "${group.name}"? Все студенты будут откреплены.`}
  onConfirm={async () => {
    await deleteGroup(group.id);
    await loadGroups();
    toast.success('Группа удалена');
  }}
>
  <Button variant="destructive" size="sm">
    <Trash2 className="h-4 w-4 mr-2" />
    Удалить
  </Button>
</DeleteDialog>
*/