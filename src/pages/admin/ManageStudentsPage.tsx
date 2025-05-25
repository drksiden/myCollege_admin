import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Trash2, PlusCircle, MoreHorizontal, Edit2, Loader2 } from 'lucide-react';
import { getAllStudents, deleteStudentProfile } from '@/lib/firebaseService/studentService';
import { getAllGroups } from '@/lib/firebaseService/groupService';
import { getUsersFromFirestore } from '@/lib/firebaseService/userService';
import { db } from '@/lib/firebase';
import type { Student, Group, User } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import StudentProfileForm from '@/components/admin/students/StudentProfileForm';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ManageStudentsPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [studentToDelete, setStudentToDelete] = useState<Student | undefined>(undefined);
  const [selectedStudent, setSelectedStudent] = useState<Student | undefined>(undefined);
  const [selectedUser, setSelectedUser] = useState<User | undefined>(undefined);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showUserSelectDialog, setShowUserSelectDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [profiles, fetchedGroups, fetchedUsers] = await Promise.all([
        getAllStudents(),
        getAllGroups(),
        getUsersFromFirestore(db)
      ]);
      setStudents(profiles);
      setGroups(fetchedGroups);
      setUsers(fetchedUsers.filter(user => !user.role || user.role === 'student'));
    } catch (error) {
      console.error('Ошибка при загрузке данных:', error);
      toast.error('Не удалось загрузить данные.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenCreateProfileDialog = () => {
    setSelectedStudent(undefined);
    setSelectedUser(undefined);
    setFormMode('create');
    setShowUserSelectDialog(true);
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setShowUserSelectDialog(false);
    setShowProfileDialog(true);
  };

  const handleOpenEditProfileDialog = (student: Student) => {
    setSelectedStudent(student);
    setSelectedUser(users.find(u => u.uid === student.userId));
    setFormMode('edit');
    setShowProfileDialog(true);
  };

  const handleDeleteStudentInitiate = (student: Student) => {
    setStudentToDelete(student);
  };

  const confirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    setIsSubmitting(true);
    try {
      await deleteStudentProfile(studentToDelete.id);
      toast.success(`Student profile deleted successfully.`);
      fetchData();
    } catch (err) {
      console.error('Failed to delete student:', err);
      toast.error('Failed to delete student.');
    } finally {
      setStudentToDelete(undefined);
      setIsSubmitting(false);
    }
  };

  if (isLoading && students.length === 0) {
    return <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin" /> 
      <span className="ml-2">Загрузка студентов...</span>
    </div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Управление студентами</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Создание, просмотр и управление профилями студентов.
            </p>
          </div>
          <Button onClick={handleOpenCreateProfileDialog} disabled={isLoading}>
            <PlusCircle className="mr-2 h-4 w-4" /> Создать профиль
          </Button>
        </div>
      </header>

      <section>
        <div className="bg-card shadow sm:rounded-lg">
          {students.length === 0 && !isLoading ? (
            <div className="p-10 text-center text-muted-foreground">
              <PlusCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium">Профили студентов не найдены</h3>
              <p className="mt-1 text-sm">Начните с создания нового профиля студента.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[20%]">Номер студенческого</TableHead>
                  <TableHead className="w-[30%]">ФИО</TableHead>
                  <TableHead className="w-[25%]">Группа</TableHead>
                  <TableHead className="w-[15%]">Статус</TableHead>
                  <TableHead className="w-[10%] text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map(student => {
                  const user = users.find(u => u.uid === student.userId);
                  const group = groups.find(g => g.id === student.groupId);
                  return (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        {student.studentCardId}
                      </TableCell>
                      <TableCell>
                        {user ? `${user.firstName} ${user.lastName}` : 'Неизвестно'}
                      </TableCell>
                      <TableCell>
                        {group ? group.name : 'Нет группы'}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          student.status === 'active' ? 'bg-green-100 text-green-800' :
                          student.status === 'inactive' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {student.status === 'active' ? 'Активный' :
                           student.status === 'inactive' ? 'Неактивный' :
                           'Выпускник'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Меню</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Действия</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleOpenEditProfileDialog(student)}>
                                <Edit2 className="mr-2 h-4 w-4" /> Редактировать
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteStudentInitiate(student)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Удалить
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </section>

      <Dialog open={showUserSelectDialog} onOpenChange={setShowUserSelectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Выбор пользователя</DialogTitle>
            <DialogDescription>
              Выберите пользователя для создания профиля студента.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select onValueChange={(userId) => {
              const user = users.find(u => u.uid === userId);
              if (user) handleUserSelect(user);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите пользователя" />
              </SelectTrigger>
              <SelectContent>
                {users
                  .filter(user => !students.some(student => student.userId === user.uid))
                  .map(user => (
                    <SelectItem key={user.uid} value={user.uid}>
                      {`${user.firstName} ${user.lastName} (${user.email})`}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {users.filter(user => !students.some(student => student.userId === user.uid)).length === 0 && (
              <p className="text-sm text-muted-foreground text-center">
                Нет доступных пользователей для создания профиля студента
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showProfileDialog} onOpenChange={(open) => { if (!open) setSelectedStudent(undefined); setShowProfileDialog(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {formMode === 'create' ? 'Создание профиля студента' : 'Редактирование профиля студента'}
              {selectedUser && ` для ${selectedUser.firstName} ${selectedUser.lastName}`}
            </DialogTitle>
            <DialogDescription>
              {formMode === 'create' ? 'Создание нового профиля студента.' : 'Редактирование существующего профиля студента.'}
            </DialogDescription>
          </DialogHeader>
          {showProfileDialog && (
            <StudentProfileForm
              mode={formMode}
              studentProfileId={selectedStudent?.id}
              userId={selectedUser?.uid}
              userName={selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : undefined}
              onFormSubmitSuccess={() => {
                setShowProfileDialog(false);
                fetchData();
              }}
              onCancel={() => setShowProfileDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!studentToDelete} onOpenChange={() => setStudentToDelete(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Профиль студента будет удален навсегда.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteStudent} disabled={isSubmitting}>
              {isSubmitting ? 'Удаление...' : 'Удалить'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ManageStudentsPage;
