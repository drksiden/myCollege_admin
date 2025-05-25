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
import { MoreHorizontal, PlusCircle, Edit2, Trash2, BookOpen } from 'lucide-react';
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
import {
  getAllSubjects,
  deleteSubject,
} from '@/lib/firebaseService/subjectService';
import { getAllTeachers as getAllTeacherProfiles } from '@/lib/firebaseService/teacherService';
import { getUsersFromFirestore } from '@/lib/firebaseService/userService';
import SubjectForm from '@/components/admin/subjects/SubjectForm';
import type { Subject } from '@/types';
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
import { Toaster } from '@/components/ui/sonner';
// import { format } from 'date-fns'; // Not strictly needed for this page's current display

const ManageSubjectsPage: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [showSubjectDialog, setShowSubjectDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
  const [teachers, setTeachers] = useState<Array<{ id: string; firstName: string; lastName: string; patronymic?: string }>>([]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedSubjects, fetchedTeacherProfiles, allUsers] = await Promise.all([
        getAllSubjects(db),
        getAllTeacherProfiles(db),
        getUsersFromFirestore(db),
      ]);
      setSubjects(fetchedSubjects);

      // Map teacher profiles to include user names
      const userMap = new Map(allUsers.map(u => [u.uid, u]));
      const teachersWithNames = fetchedTeacherProfiles.map(t => ({
        id: t.id,
        firstName: userMap.get(t.userId)?.firstName || '',
        lastName: userMap.get(t.userId)?.lastName || '',
        patronymic: userMap.get(t.userId)?.middleName,
      }));
      setTeachers(teachersWithNames);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenCreateDialog = () => {
    setSelectedSubject(null);
    setFormMode('create');
    setShowSubjectDialog(true);
  };

  const handleOpenEditDialog = (subject: Subject) => {
    setSelectedSubject(subject);
    setFormMode('edit');
    setShowSubjectDialog(true);
  };

  const handleFormSuccess = () => {
    setShowSubjectDialog(false);
    setSelectedSubject(null); // Clear selection
    fetchData(); // Refresh data
  };

  const handleDeleteInitiate = (subject: Subject) => {
    setSubjectToDelete(subject);
  };

  const confirmDeleteSubject = async () => {
    if (!subjectToDelete) return;
    try {
      await deleteSubject(db, subjectToDelete.id);
      toast.success(`Subject "${subjectToDelete.name}" deleted successfully.`);
      await fetchData();
    } catch (error) {
      console.error('Error deleting subject:', error);
      toast.error('Failed to delete subject.');
    } finally {
      setSubjectToDelete(null); // Close dialog
    }
  };
  
  const getSubjectTypeName = (type: Subject['type'] | undefined) => {
    if (!type) return 'N/A';
    switch(type) {
      case 'lecture': return 'Lecture';
      case 'practice': return 'Practice';
      case 'laboratory': return 'Laboratory';
      default: 
        const exhaustiveCheck: never = type; // Ensures all cases are handled
        return 'N/A';
    }
  };

  if (isLoading && subjects.length === 0) {
    return <p className="text-center p-10">Loading subjects...</p>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <Toaster richColors position="top-right" />
      <Dialog open={showSubjectDialog} onOpenChange={(open) => {
        if (!open) {
          setSelectedSubject(null); // Clear selection when dialog is closed by any means
        }
        setShowSubjectDialog(open);
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {formMode === 'create' ? 'Создать предмет' : 'Редактировать предмет'}
            </DialogTitle>
            <DialogDescription>
              {formMode === 'create'
                ? 'Заполните данные для добавления нового предмета.'
                : `Редактирование предмета: ${selectedSubject?.name || ''}`}
            </DialogDescription>
          </DialogHeader>
          {/* Render form only when dialog is open to ensure correct initial values */}
          {showSubjectDialog && (
            <SubjectForm
              mode={formMode}
              subjectId={selectedSubject?.id}
              onFormSubmitSuccess={handleFormSuccess}
              onCancel={() => setShowSubjectDialog(false)}
              teachers={teachers}
            />
          )}
        </DialogContent>
      </Dialog>

      {subjectToDelete && (
        <AlertDialog open={!!subjectToDelete} onOpenChange={() => setSubjectToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить предмет?</AlertDialogTitle>
              <AlertDialogDescription>
                Это действие навсегда удалит предмет <span className="font-semibold">"{subjectToDelete.name}"</span> из системы. Это действие нельзя отменить.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteSubject} className="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 dark:text-slate-50">Удалить</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Управление предметами</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Управляйте учебными предметами, которые преподаются в учреждении.
            </p>
          </div>
          <Button onClick={handleOpenCreateDialog}>
            <PlusCircle className="mr-2 h-4 w-4" /> Добавить предмет
          </Button>
        </div>
      </header>

      <section>
        <div className="bg-card shadow sm:rounded-lg">
          {subjects.length === 0 && !isLoading ? (
            <div className="p-10 text-center text-muted-foreground">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium">Нет предметов</h3>
              <p className="mt-1 text-sm">Добавьте новый предмет в каталог.</p>
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[25%]">Название</TableHead>
                <TableHead className="w-[20%]">Преподаватель</TableHead>
                <TableHead className="w-[15%] text-center">Часы в неделю</TableHead>
                <TableHead className="w-[35%]">Описание</TableHead>
                <TableHead className="text-right w-[10%]">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjects.map(subject => {
                const teacher = teachers.find(t => t.id === subject.teacherId);
                return (
                  <TableRow key={subject.id}>
                    <TableCell className="font-medium">{subject.name}</TableCell>
                    <TableCell>{teacher ? `${teacher.lastName} ${teacher.firstName} ${teacher.patronymic || ''}` : '—'}</TableCell>
                    <TableCell className="text-center">{subject.hoursPerWeek || '-'}</TableCell>
                    <TableCell className="truncate max-w-sm" title={subject.description}>{subject.description}</TableCell>
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
                          <DropdownMenuItem onClick={() => handleOpenEditDialog(subject)}>
                            <Edit2 className="mr-2 h-4 w-4" /> Редактировать
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteInitiate(subject)} 
                            className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-800"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          )}
        </div>
      </section>
    </div>
  );
};

export default ManageSubjectsPage;
