import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PlusCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getSemesters, deleteSemester } from '@/lib/firebaseService/semesterService';
import type { Semester } from '@/types';
import SemesterFormDialog from '@/components/admin/semesters/SemesterFormDialog';
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

export default function ManageSemestersPage() {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedSemester, setSelectedSemester] = useState<Semester | null>(null);
  const [semesterToDelete, setSemesterToDelete] = useState<Semester | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const allSemesters = await getSemesters();
      setSemesters(allSemesters);
    } catch (error) {
      console.error('Error fetching semesters:', error);
      toast.error('Не удалось загрузить семестры');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreateDialog = () => {
    setSelectedSemester(null);
    setFormMode('create');
    setShowFormDialog(true);
  };

  const handleOpenEditDialog = (semester: Semester) => {
    setSelectedSemester(semester);
    setFormMode('edit');
    setShowFormDialog(true);
  };

  const handleFormSuccess = () => {
    setShowFormDialog(false);
    setSelectedSemester(null);
    fetchData();
  };

  const handleDeleteClick = (semester: Semester) => {
    setSemesterToDelete(semester);
  };

  const handleDeleteConfirm = async () => {
    if (!semesterToDelete) return;

    try {
      await deleteSemester(semesterToDelete.id);
      fetchData();
      toast.success('Семестр успешно удален');
    } catch (error) {
      console.error('Error deleting semester:', error);
      toast.error('Не удалось удалить семестр');
    } finally {
      setSemesterToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setSemesterToDelete(null);
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Управление семестрами</h1>
        <Button onClick={handleOpenCreateDialog}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Добавить семестр
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : semesters.length === 0 ? (
        <div className="p-10 text-center text-muted-foreground">
          <Loader2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium">Нет доступных семестров</h3>
          <p className="mt-1 text-sm">Добавьте новый семестр, чтобы начать работу.</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Учебный год</TableHead>
                <TableHead>Дата начала</TableHead>
                <TableHead>Дата окончания</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="w-[100px]">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {semesters.map((semester) => (
                <TableRow key={semester.id}>
                  <TableCell className="font-medium">{semester.name}</TableCell>
                  <TableCell>{semester.academicYear}</TableCell>
                  <TableCell>
                    {new Date(semester.startDate.seconds * 1000).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {new Date(semester.endDate.seconds * 1000).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {semester.status === 'active' && 'Активный'}
                    {semester.status === 'planning' && 'Планируется'}
                    {semester.status === 'archived' && 'Архивный'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEditDialog(semester)}
                      >
                        Редактировать
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600"
                        onClick={() => handleDeleteClick(semester)}
                      >
                        Удалить
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <SemesterFormDialog
        open={showFormDialog}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedSemester(null);
          }
          setShowFormDialog(open);
        }}
        mode={formMode}
        semesterId={selectedSemester?.id}
        onSuccess={handleFormSuccess}
      />

      <AlertDialog open={!!semesterToDelete} onOpenChange={handleDeleteCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Это навсегда удалит семестр
              {semesterToDelete && ` "${semesterToDelete.name}"`} и все связанные с ним данные.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 