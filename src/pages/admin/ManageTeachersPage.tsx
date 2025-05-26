import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MoreHorizontal, PlusCircle, Edit2, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { getUsersFromFirestore } from '@/lib/firebaseService/userService';
import {
  getAllTeachers,
} from '@/lib/firebaseService/teacherService';
import TeacherProfileForm from '@/components/admin/teachers/TeacherProfileForm';
import type { User, Teacher } from '@/types';
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
import { writeBatch, doc } from 'firebase/firestore';
import { Toaster } from '@/components/ui/sonner';
import { Dialog as SimpleDialog } from '@/components/ui/dialog';

const ManageTeachersPage: React.FC = () => {
  const [teacherUsers, setTeacherUsers] = useState<User[]>([]);
  const [allTeacherProfiles, setAllTeacherProfiles] = useState<Teacher[]>([]);
  const [selectedUserForProfile, setSelectedUserForProfile] = useState<User | null>(null);
  const [selectedTeacherProfileForEdit, setSelectedTeacherProfileForEdit] = useState<Teacher | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [teacherToDelete, setTeacherToDelete] = useState<{profileId: string, userId: string, userName: string} | null>(null);
  const [showUserSelectDialog, setShowUserSelectDialog] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const allUsers = await getUsersFromFirestore();
      const teachers = allUsers.filter(user => user.role === 'teacher');
      setTeacherUsers(teachers);

      const profiles = await getAllTeachers();
      setAllTeacherProfiles(profiles);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load teacher data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenCreateProfileDialog = (user: User) => {
    setSelectedUserForProfile(user);
    setSelectedTeacherProfileForEdit(null);
    setFormMode('create');
    setShowProfileDialog(true);
  };

  const handleOpenEditProfileDialogFromProfilesList = (profile: Teacher) => {
    const user = teacherUsers.find(u => u.uid === profile.userId);
    setSelectedUserForProfile(user || null); 
    setSelectedTeacherProfileForEdit(profile);
    setFormMode('edit');
    setShowProfileDialog(true);
  };

  const handleFormSuccess = () => {
    setShowProfileDialog(false);
    setSelectedUserForProfile(null);
    setSelectedTeacherProfileForEdit(null);
    fetchData(); 
  };

  const handleDeleteInitiate = (profile: Teacher) => {
    const userName = getUserName(profile.userId);
    setTeacherToDelete({profileId: profile.id, userId: profile.userId, userName});
  };

  const confirmDeleteProfile = async () => {
    if (!teacherToDelete) return;
    try {
      const batch = writeBatch(db);
      // 1. Delete the teacher profile document
      const teacherProfileRef = doc(db, 'teachers', teacherToDelete.profileId);
      batch.delete(teacherProfileRef);
      
      // 2. Update the user document to remove teacherId
      const userRef = doc(db, 'users', teacherToDelete.userId);
      batch.update(userRef, { teacherId: null }); // Or use deleteField() if you prefer to remove the field

      await batch.commit();
      toast.success(`Teacher profile for ${teacherToDelete.userName} deleted and user unlinked.`);
      await fetchData();
    } catch (error) {
      console.error('Error deleting teacher profile:', error);
      toast.error('Failed to delete teacher profile.');
    } finally {
      setTeacherToDelete(null);
    }
  };

  const getUserName = (userId: string | undefined): string => {
    if (!userId) return 'Unknown User';
    const user = teacherUsers.find(u => u.uid === userId);
    return user ? `${user.firstName} ${user.lastName}` : 'User Not Found';
  };

  if (isLoading && teacherUsers.length === 0 && allTeacherProfiles.length === 0) {
    return <p className="text-center p-10">Loading teacher management data...</p>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <Toaster richColors position="top-right" />
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Все преподаватели</h2>
        <Button
          variant="default"
          onClick={() => setShowUserSelectDialog(true)}
          className="flex items-center gap-2"
        >
          <PlusCircle className="w-5 h-5" />
          Создать преподавателя
        </Button>
      </div>
      <SimpleDialog open={showUserSelectDialog} onOpenChange={setShowUserSelectDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Выберите пользователя для профиля преподавателя</DialogTitle>
            <DialogDescription>
              Выберите пользователя с ролью "teacher", для которого ещё не создан профиль.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {teacherUsers.filter(u => !allTeacherProfiles.some(p => p.userId === u.uid)).length === 0 ? (
              <div className="text-muted-foreground">Нет пользователей без профиля преподавателя.</div>
            ) : (
              teacherUsers.filter(u => !allTeacherProfiles.some(p => p.userId === u.uid)).map(user => (
                <Button
                  key={user.uid}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    handleOpenCreateProfileDialog(user);
                    setShowUserSelectDialog(false);
                  }}
                >
                  {user.firstName} {user.lastName}
                </Button>
              ))
            )}
          </div>
        </DialogContent>
      </SimpleDialog>

      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {formMode === 'create' ? 'Создать профиль преподавателя' : 'Редактировать профиль преподавателя'}
            </DialogTitle>
            <DialogDescription>
              {formMode === 'create'
                ? 'Заполните информацию о преподавателе.'
                : 'Обновите информацию о преподавателе.'}
            </DialogDescription>
          </DialogHeader>
          {selectedUserForProfile && (
            <TeacherProfileForm
              mode={formMode}
              userId={selectedUserForProfile.uid}
              teacherProfileId={selectedTeacherProfileForEdit?.id}
              onFormSubmitSuccess={handleFormSuccess}
              onCancel={() => setShowProfileDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!teacherToDelete} onOpenChange={(open) => !open && setTeacherToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить профиль преподавателя?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Это навсегда удалит профиль преподавателя и отвяжет его от пользователя.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteProfile}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Имя</TableHead>
              <TableHead>Специализация</TableHead>
              <TableHead>Опыт</TableHead>
              <TableHead>Образование</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allTeacherProfiles.map((profile) => (
              <TableRow key={profile.id}>
                <TableCell>{getUserName(profile.userId)}</TableCell>
                <TableCell>{profile.specialization}</TableCell>
                <TableCell>{profile.experience} лет</TableCell>
                <TableCell>{profile.education}</TableCell>
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
                      <DropdownMenuItem onClick={() => handleOpenEditProfileDialogFromProfilesList(profile)}>
                        <Edit2 className="mr-2 h-4 w-4" />
                        Редактировать
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => handleDeleteInitiate(profile)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Удалить
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ManageTeachersPage;
