// src/pages/admin/ManageSemestersPage.tsx
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { 
  PlusCircle, 
  Loader2, 
  Calendar, 
  CheckCircle, 
  Clock, 
  Archive,
  Edit2,
  Trash2,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { toast } from 'sonner';
import { getSemesters, deleteSemester } from '@/lib/firebaseService/semesterService';
import type { Semester } from '@/types';
import SemesterFormDialog from '@/components/admin/semesters/SemesterFormDialog';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Активный</Badge>;
      case 'planning':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Планируется</Badge>;
      case 'archived':
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">Архивный</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'planning':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'archived':
        return <Archive className="h-4 w-4 text-gray-500" />;
      default:
        return <Calendar className="h-4 w-4 text-gray-500" />;
    }
  };

  // Статистика
  const stats = {
    total: semesters.length,
    active: semesters.filter(s => s.status === 'active').length,
    planning: semesters.filter(s => s.status === 'planning').length,
    archived: semesters.filter(s => s.status === 'archived').length,
  };

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const cardVariants = {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Управление семестрами</h1>
          <p className="text-muted-foreground">
            Создавайте и управляйте учебными семестрами и периодами
          </p>
        </div>
        <Button onClick={handleOpenCreateDialog} className="gap-2">
          <PlusCircle className="h-4 w-4" />
          Добавить семестр
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { 
            title: 'Всего семестров', 
            value: stats.total, 
            icon: Calendar, 
            color: 'text-blue-600',
            bgColor: 'bg-blue-100 dark:bg-blue-900',
            description: 'Всех периодов'
          },
          { 
            title: 'Активных', 
            value: stats.active, 
            icon: CheckCircle, 
            color: 'text-green-600',
            bgColor: 'bg-green-100 dark:bg-green-900',
            description: 'Текущих семестров'
          },
          { 
            title: 'Планируется', 
            value: stats.planning, 
            icon: Clock, 
            color: 'text-orange-600',
            bgColor: 'bg-orange-100 dark:bg-orange-900',
            description: 'Будущих семестров'
          },
          { 
            title: 'Архивных', 
            value: stats.archived, 
            icon: Archive, 
            color: 'text-gray-600',
            bgColor: 'bg-gray-100 dark:bg-gray-900',
            description: 'Завершенных семестров'
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.title}
            variants={cardVariants}
            initial="initial"
            animate="animate"
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover:shadow-md transition-all duration-200 hover:-translate-y-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`h-8 w-8 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Semesters Table */}
      <Card>
        <CardHeader>
          <CardTitle>Список семестров</CardTitle>
          <CardDescription>
            Управление учебными периодами и семестрами
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : semesters.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">Нет семестров</h3>
              <p className="text-muted-foreground mb-4">
                Добавьте новый семестр, чтобы начать работу
              </p>
              <Button onClick={handleOpenCreateDialog} className="gap-2">
                <PlusCircle className="h-4 w-4" />
                Создать первый семестр
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Семестр</TableHead>
                    <TableHead>Учебный год</TableHead>
                    <TableHead>Период</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {semesters.map((semester, index) => (
                      <motion.tr
                        key={semester.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-muted/50"
                      >
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                              {getStatusIcon(semester.status)}
                            </div>
                            <div>
                              <div className="font-medium">{semester.name}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{semester.academicYear}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center text-sm">
                              <Calendar className="h-3 w-3 mr-1 text-muted-foreground" />
                              {format(new Date(semester.startDate.seconds * 1000), 'dd MMM', { locale: ru })} - {format(new Date(semester.endDate.seconds * 1000), 'dd MMM yyyy', { locale: ru })}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(semester.status)}
                        </TableCell>
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
                              <DropdownMenuItem onClick={() => handleOpenEditDialog(semester)}>
                                <Edit2 className="mr-2 h-4 w-4" />
                                Редактировать
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => handleDeleteClick(semester)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Удалить
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <AlertDialog open={!!semesterToDelete} onOpenChange={() => setSemesterToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Подтверждение удаления</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие навсегда удалит семестр
              {semesterToDelete && ` "${semesterToDelete.name}"`} и все связанные с ним данные.
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Удалить семестр
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Form Dialog */}
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
    </motion.div>
  );
}