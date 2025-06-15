// src/pages/admin/ManageSubjectsPage.tsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  MoreHorizontal, 
  PlusCircle, 
  Edit2, 
  Trash2, 
  BookOpen,
  Search,
  Loader2,
  Clock,
  FileText,
  Calendar
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { getAllSubjects, deleteSubject as deleteSubjectService } from '@/lib/firebaseService/subjectService';
import type { Subject } from '@/types';
import { Toaster } from '@/components/ui/sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import SubjectFormDialog from '@/components/admin/subjects/SubjectFormDialog';

const ManageSubjectsPage: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);
  const [selectedSubjectForEdit, setSelectedSubjectForEdit] = useState<Subject | undefined>();
  const [showSubjectFormDialog, setShowSubjectFormDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    toast.loading('Загрузка предметов...', { id: 'fetch-subjects' });
    try {
      const fetchedSubjects = await getAllSubjects();
      console.log('Данные из Firebase:', fetchedSubjects);
      setSubjects(fetchedSubjects);
      toast.success('Предметы успешно загружены', { id: 'fetch-subjects' });
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast.error('Не удалось загрузить предметы', { id: 'fetch-subjects' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Фильтрация предметов
  useEffect(() => {
    const filtered = subjects.filter(subject => {
      const matchesSearch = searchQuery.trim() === '' || 
        subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (subject.description && subject.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      return matchesSearch;
    });

    setFilteredSubjects(filtered);
    
    // Отладочная информация
    console.log('Загруженные предметы:', subjects);
    console.log('Отфильтрованные предметы:', filtered);
  }, [subjects, searchQuery]);

  const handleOpenCreateSubjectDialog = () => {
    setSelectedSubjectForEdit(undefined);
    setShowSubjectFormDialog(true);
  };

  const handleOpenEditSubjectDialog = (subject: Subject) => {
    setSelectedSubjectForEdit(subject);
    setShowSubjectFormDialog(true);
  };

  const handleSubjectFormSuccess = () => {
    setShowSubjectFormDialog(false);
    setSelectedSubjectForEdit(undefined);
    toast.success('Предмет успешно сохранен');
    fetchData(); 
  };

  const handleDeleteInitiate = (subject: Subject) => {
    setSubjectToDelete(subject);
  };

  const getSubjectIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('математика') || lowerName.includes('алгебра')) return '📐';
    if (lowerName.includes('физика')) return '⚛️';
    if (lowerName.includes('информатика') || lowerName.includes('программирование') || lowerName.includes('программное')) return '💻';
    if (lowerName.includes('язык') || lowerName.includes('английский') || lowerName.includes('русский')) return '🗣️';
    if (lowerName.includes('история')) return '📚';
    if (lowerName.includes('химия')) return '🧪';
    if (lowerName.includes('биология')) return '🧬';
    return '📖';
  };

  // Статистика
  const stats = {
    total: subjects.length,
    withDescription: subjects.filter(s => s.description && s.description.length > 0).length,
    withHours: subjects.filter(s => s.hoursPerWeek && s.hoursPerWeek > 0).length,
    avgHours: subjects.length > 0 ? Math.round(subjects.reduce((sum, s) => sum + (s.hoursPerWeek || 0), 0) / subjects.filter(s => s.hoursPerWeek).length) || 0 : 0,
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
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Управление предметами</h1>
          <p className="text-muted-foreground">
            Создавайте и управляйте учебными предметами и курсами
          </p>
        </div>
        <Button onClick={handleOpenCreateSubjectDialog} className="gap-2">
          <PlusCircle className="h-4 w-4" />
          Создать предмет
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { 
            title: 'Всего предметов', 
            value: stats.total, 
            icon: BookOpen, 
            color: 'text-blue-600',
            bgColor: 'bg-blue-100 dark:bg-blue-900',
            description: 'Активных предметов'
          },
          { 
            title: 'С описанием', 
            value: stats.withDescription, 
            icon: FileText, 
            color: 'text-green-600',
            bgColor: 'bg-green-100 dark:bg-green-900',
            description: `${stats.total > 0 ? Math.round((stats.withDescription / stats.total) * 100) : 0}% от всех`
          },
          { 
            title: 'С часами', 
            value: stats.withHours, 
            icon: Clock, 
            color: 'text-purple-600',
            bgColor: 'bg-purple-100 dark:bg-purple-900',
            description: 'Предметов с указанными часами'
          },
          { 
            title: 'Средние часы/неделя', 
            value: stats.avgHours, 
            icon: Calendar, 
            color: 'text-orange-600',
            bgColor: 'bg-orange-100 dark:bg-orange-900',
            description: 'Академических часов'
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

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Поиск предметов</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по названию или описанию..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Subjects Table */}
      <Card>
        <CardHeader>
          <CardTitle>Список предметов</CardTitle>
          <CardDescription>
            Найдено {filteredSubjects.length} предметов
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredSubjects.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">Предметы не найдены</h3>
              <p className="text-muted-foreground mb-4">
                {subjects.length === 0 
                  ? 'Начните с создания нового предмета' 
                  : 'Попробуйте изменить параметры поиска'
                }
              </p>
              {subjects.length === 0 && (
                <Button onClick={handleOpenCreateSubjectDialog} className="gap-2">
                  <PlusCircle className="h-4 w-4" />
                  Создать первый предмет
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Предмет</TableHead>
                    <TableHead>Описание</TableHead>
                    <TableHead>Часов/неделя</TableHead>
                    <TableHead>Создан</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filteredSubjects.map((subject, index) => (
                      <motion.tr
                        key={subject.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-muted/50"
                      >
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-lg">
                              {getSubjectIcon(subject.name)}
                            </div>
                            <div>
                              <div className="font-medium">{subject.name}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          {subject.description ? (
                            <div className="truncate" title={subject.description}>
                              {subject.description}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Нет описания</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {subject.hoursPerWeek ? (
                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{subject.hoursPerWeek}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Не указано</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {subject.createdAt && format(subject.createdAt.toDate(), 'dd MMM yyyy', { locale: ru })}
                          </div>
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
                              <DropdownMenuItem onClick={() => handleOpenEditSubjectDialog(subject)}>
                                <Edit2 className="mr-2 h-4 w-4" />
                                Редактировать
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => handleDeleteInitiate(subject)} 
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

      {/* Delete Confirmation Dialog */}
      {subjectToDelete && (
        <AlertDialog open={!!subjectToDelete} onOpenChange={() => setSubjectToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Подтверждение удаления</AlertDialogTitle>
              <AlertDialogDescription>
                Это действие навсегда удалит предмет <span className="font-semibold">"{subjectToDelete.name}"</span>.
                Все связанные данные также могут быть затронуты. Это действие нельзя отменить.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction 
                onClick={async () => {
                  const deleteToastId = toast.loading('Удаление предмета...', { duration: Infinity });
                  try {
                    await deleteSubjectService(subjectToDelete.id);
                    setSubjectToDelete(null);
                    toast.success('Предмет успешно удален', { id: deleteToastId });
                    fetchData();
                  } catch (error) {
                    console.error('Error deleting subject:', error);
                    toast.error('Не удалось удалить предмет', { id: deleteToastId });
                  }
                }} 
                className="bg-red-600 hover:bg-red-700"
              >
                Удалить предмет
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Subject Form Dialog */}
      <SubjectFormDialog
        open={showSubjectFormDialog}
        onOpenChange={setShowSubjectFormDialog}
        mode={selectedSubjectForEdit ? 'edit' : 'create'}
        subjectId={selectedSubjectForEdit?.id}
        onSuccess={handleSubjectFormSuccess}
      />
    </motion.div>
  );
};

export default ManageSubjectsPage;