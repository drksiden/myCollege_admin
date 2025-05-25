import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Trash2, Loader2, CalendarPlus, ListChecks, FileText, PlusCircle, MoreHorizontal, Eye, Edit2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { getAllSchedules, updateSchedule, getSchedule } from '@/lib/firebaseService/scheduleService';
import { getAllGroups } from '@/lib/firebaseService/groupService';
import { getAllTeachers } from '@/lib/firebaseService/teacherService';
import { getAllSubjects } from '@/services/firestore';
import { getAllScheduleTemplates, saveScheduleTemplate, deleteScheduleTemplate, updateScheduleTemplate, type ScheduleTemplate } from '@/lib/firebaseService/scheduleTemplateService';
import { updateDoc, writeBatch, doc, Timestamp } from 'firebase/firestore';
import type { Schedule, Group, Teacher, Lesson, Subject } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
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
import ScheduleMetadataForm from '@/components/admin/schedules/ScheduleMetadataForm';
import LessonForm from '@/components/admin/schedules/LessonForm';
import ScheduleCalendar from '@/components/admin/schedules/ScheduleCalendar';
import ScheduleFilters, { type ScheduleFilters as ScheduleFiltersType } from '@/components/admin/schedules/ScheduleFilters';
import BulkLessonForm from '@/components/admin/schedules/BulkLessonForm';
import ScheduleTemplateForm from '@/components/admin/schedules/ScheduleTemplateForm';
import ScheduleTemplatesList from '@/components/admin/schedules/ScheduleTemplatesList';
import ScheduleExport from '@/components/admin/schedules/ScheduleExport';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { v4 as uuidv4 } from 'uuid';

const ManageSchedulesPage: React.FC = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  
  const [showMetadataDialog, setShowMetadataDialog] = useState(false);
  const [metadataFormMode, setMetadataFormMode] = useState<'create' | 'edit'>('create');
  const [selectedScheduleForMetadata, setSelectedScheduleForMetadata] = useState<Schedule | null>(null);

  const [showManageLessonsDialog, setShowManageLessonsDialog] = useState(false);
  const [currentManagingSchedule, setCurrentManagingSchedule] = useState<Schedule | null>(null);
  
  const [showLessonFormDialog, setShowLessonFormDialog] = useState(false);
  const [lessonFormMode, setLessonFormMode] = useState<'create' | 'edit'>('create');
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [selectedLessonSchedule, setSelectedLessonSchedule] = useState<Schedule | null>(null);

  const [scheduleToDelete, setScheduleToDelete] = useState<Schedule | null>(null);
  const [lessonToRemove, setLessonToRemove] = useState<{ lessonId: string} | null>(null); // scheduleId is in currentManagingSchedule

  const [isLoading, setIsLoading] = useState(true); // For initial data load
  const [isSubmitting, setIsSubmitting] = useState(false); // For any submit operation

  const [filters, setFilters] = useState<ScheduleFiltersType>({
    search: '',
    groupId: '',
    course: '',
    semester: '',
    year: '',
  });

  const [showBulkLessonForm, setShowBulkLessonForm] = useState(false);

  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showTemplatesList, setShowTemplatesList] = useState(false);
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);

  const [editingTemplate, setEditingTemplate] = useState<ScheduleTemplate | null>(null);

  const [showExportDialog, setShowExportDialog] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedSchedules, fetchedGroups, fetchedTeachers, fetchedSubjects, fetchedTemplates] = await Promise.all([
        getAllSchedules(db),
        getAllGroups(),
        getAllTeachers(db),
        getAllSubjects(),
        getAllScheduleTemplates(),
      ]);
      setSchedules(fetchedSchedules);
      setGroups(fetchedGroups);
      setTeachers(fetchedTeachers);
      setSubjects(fetchedSubjects);
      setTemplates(fetchedTemplates);
    } catch (err) {
      console.error('Ошибка при загрузке данных:', err);
      toast.error('Не удалось загрузить данные.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getGroupName = useCallback(
    (groupId: string) => groups.find(g => g.id === groupId)?.name || 'Unknown Group',
    [groups]
  );

  const handleOpenCreateScheduleDialog = () => {
    setSelectedScheduleForMetadata(null);
    setMetadataFormMode('create');
    setShowMetadataDialog(true);
  };

  const handleOpenEditScheduleMetadataDialog = (schedule: Schedule) => {
    setSelectedScheduleForMetadata(schedule);
    setMetadataFormMode('edit');
    setShowMetadataDialog(true);
  };

  const handleMetadataFormSuccess = async (scheduleId: string) => {
    setShowMetadataDialog(false);
    await fetchData(); 
    if (metadataFormMode === 'create') {
      const newSchedule = await getSchedule(db, scheduleId);
      if (newSchedule) {
        const groupToUpdate = groups.find(g => g.id === newSchedule.groupId);
        if (groupToUpdate && !groupToUpdate.scheduleId) {
          try {
            await updateDoc(doc(db, 'groups', newSchedule.groupId), { scheduleId: newSchedule.id });
            toast.info(`Расписание привязано к группе ${getGroupName(newSchedule.groupId)}.`);
            await fetchData();
          } catch (error) {
            console.error('Не удалось привязать расписание к группе:', error);
            toast.error('Не удалось привязать расписание к группе.');
          }
        } else if (groupToUpdate && groupToUpdate.scheduleId) {
          toast.info(`Группа ${getGroupName(newSchedule.groupId)} уже имеет расписание. Привязка не выполнена.`);
        }
        setCurrentManagingSchedule(newSchedule);
        setShowManageLessonsDialog(true);
      } else {
        toast.error("Не удалось загрузить новое расписание для управления занятиями.");
      }
    }
  };
  
  const handleDeleteScheduleInitiate = (schedule: Schedule) => setScheduleToDelete(schedule);

  const confirmDeleteSchedule = async () => {
    if (!scheduleToDelete) return;
    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'schedules', scheduleToDelete.id));
      const groupToUpdate = groups.find(g => g.scheduleId === scheduleToDelete.id);
      if (groupToUpdate) {
        batch.update(doc(db, 'groups', groupToUpdate.id), { scheduleId: "" });
      }
      await batch.commit();
      toast.success(`Расписание для группы ${getGroupName(scheduleToDelete.groupId)} успешно удалено.`);
      await fetchData();
    } catch (err) {
      console.error('Не удалось удалить расписание:', err);
      toast.error('Не удалось удалить расписание.');
    } finally {
      setScheduleToDelete(null);
      setIsSubmitting(false);
    }
  };

  const handleOpenManageLessons = async (schedule: Schedule) => {
    // Refetch the latest schedule data before opening, in case lessons changed
    setIsLoading(true);
    const freshSchedule = await getSchedule(db, schedule.id);
    if (freshSchedule) {
        setCurrentManagingSchedule(freshSchedule);
        setShowManageLessonsDialog(true);
    } else {
        toast.error("Could not load schedule details.");
    }
    setIsLoading(false);
  };

  const handleOpenAddLessonDialog = () => {
    if (!currentManagingSchedule) return;
    setSelectedLesson(null);
    setLessonFormMode('create');
    setShowLessonFormDialog(true);
  };

  const handleLessonFormSuccess = async () => {
    if (!currentManagingSchedule && !selectedLessonSchedule) return;
    setIsSubmitting(true);
    try {
      await fetchData();
      const updatedSchedule = await getSchedule(db, currentManagingSchedule?.id || selectedLessonSchedule?.id || '');
      if (updatedSchedule) {
        setCurrentManagingSchedule(updatedSchedule);
      }
      toast.success(`Занятие успешно ${lessonFormMode === 'create' ? 'добавлено' : 'обновлено'}.`);
      setShowLessonFormDialog(false);
      setSelectedLesson(null);
      setSelectedLessonSchedule(null);
    } catch (err) {
      console.error('Не удалось обновить занятие:', err);
      toast.error(`Не удалось ${lessonFormMode === 'create' ? 'добавить' : 'обновить'} занятие.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkAddLessons = async (lessons: Lesson[]) => {
    if (!currentManagingSchedule) return;
    setIsSubmitting(true);
    try {
      const updatedLessons = [...currentManagingSchedule.lessons, ...lessons];
      await updateSchedule(db, currentManagingSchedule.id, { lessons: updatedLessons });
      const freshSchedule = await getSchedule(db, currentManagingSchedule.id);
      if (freshSchedule) {
        setCurrentManagingSchedule(freshSchedule);
        setSchedules(prevSchedules => prevSchedules.map(s => s.id === freshSchedule.id ? freshSchedule : s));
      }
      toast.success(`Успешно добавлено ${lessons.length} занятий.`);
    } catch (error) {
      console.error('Не удалось добавить занятия:', error);
      toast.error('Не удалось добавить занятия.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveTemplate = async (template: { name: string; description: string; schedule: Schedule }) => {
    if (!currentManagingSchedule) return;
    setIsSubmitting(true);
    try {
      if (editingTemplate) {
        await updateScheduleTemplate(editingTemplate.id, {
          name: template.name,
          description: template.description,
          schedule: template.schedule,
        });
        toast.success('Шаблон успешно обновлен.');
      } else {
        await saveScheduleTemplate(template);
        toast.success('Шаблон успешно сохранен.');
      }
      const updatedTemplates = await getAllScheduleTemplates();
      setTemplates(updatedTemplates);
      setEditingTemplate(null);
    } catch (error) {
      console.error('Не удалось сохранить шаблон:', error);
      toast.error(`Не удалось ${editingTemplate ? 'обновить' : 'сохранить'} шаблон.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTemplate = (template: ScheduleTemplate) => {
    setEditingTemplate(template);
    setShowTemplateForm(true);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    setIsSubmitting(true);
    try {
      await deleteScheduleTemplate(templateId);
      const updatedTemplates = await getAllScheduleTemplates();
      setTemplates(updatedTemplates);
      toast.success('Шаблон успешно удален.');
    } catch (error) {
      console.error('Не удалось удалить шаблон:', error);
      toast.error('Не удалось удалить шаблон.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyTemplate = async (template: ScheduleTemplate) => {
    if (!currentManagingSchedule) return;
    setIsSubmitting(true);
    try {
      // Для каждого занятия из шаблона генерируем новый id
      const lessonsFromTemplate = template.schedule.lessons.map(lesson => ({ ...lesson, id: uuidv4() }));
      const updatedLessons = [...currentManagingSchedule.lessons, ...lessonsFromTemplate];
      await updateSchedule(db, currentManagingSchedule.id, { lessons: updatedLessons });
      const updatedSchedule = { ...currentManagingSchedule, lessons: updatedLessons, updatedAt: Timestamp.now() };
      setCurrentManagingSchedule(updatedSchedule);
      setSchedules(prevSchedules => prevSchedules.map(s => s.id === updatedSchedule.id ? updatedSchedule : s));
      toast.success('Шаблон успешно применен.');
      setShowTemplatesList(false);
    } catch (error) {
      console.error('Не удалось применить шаблон:', error);
      toast.error('Не удалось применить шаблон.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmRemoveLesson = async () => {
    const schedule = selectedLessonSchedule || currentManagingSchedule;
    if (!lessonToRemove || !schedule) return;
    setIsSubmitting(true);
    try {
      const updatedLessons = schedule.lessons.filter(l => l.id !== lessonToRemove.lessonId);
      await updateSchedule(db, schedule.id, { lessons: updatedLessons });
      const updatedSchedule = { ...schedule, lessons: updatedLessons, updatedAt: Timestamp.now() };
      if (selectedLessonSchedule) setSelectedLessonSchedule(updatedSchedule);
      if (currentManagingSchedule && schedule.id === currentManagingSchedule.id) setCurrentManagingSchedule(updatedSchedule);
      setSchedules(prevSchedules => prevSchedules.map(s => s.id === updatedSchedule.id ? updatedSchedule : s));
      toast.success("Занятие успешно удалено.");
      await fetchData();
    } catch (err) {
      console.error('Не удалось удалить занятие:', err);
      toast.error("Не удалось удалить занятие.");
    } finally {
      setLessonToRemove(null);
      setIsSubmitting(false);
      setSelectedLessonSchedule(null);
    }
  };

  const handleLessonClick = (lesson: Lesson, schedule: Schedule) => {
    setSelectedLesson(lesson);
    setSelectedLessonSchedule(schedule);
    setLessonFormMode('edit');
    setShowLessonFormDialog(true);
  };

  const filteredSchedules = React.useMemo(() => {
    return schedules.filter(schedule => {
      const group = groups.find(g => g.id === schedule.groupId);
      const matchesSearch = filters.search === '' || 
        getGroupName(schedule.groupId).toLowerCase().includes(filters.search.toLowerCase()) ||
        schedule.lessons.some(lesson => 
          lesson.subjectId.toLowerCase().includes(filters.search.toLowerCase()) ||
          lesson.room.toLowerCase().includes(filters.search.toLowerCase())
        );
      const matchesGroup = !filters.groupId || filters.groupId === 'all' || schedule.groupId === filters.groupId;
      const matchesCourse = !filters.course || (group && group.course?.toString() === filters.course);
      const matchesSemester = !filters.semester || schedule.semester?.toString() === filters.semester;
      const matchesYear = !filters.year || schedule.year?.toString() === filters.year;
      return matchesSearch && matchesGroup && matchesCourse && matchesSemester && matchesYear;
    });
  }, [schedules, filters, getGroupName, groups]);

  if (isLoading && schedules.length === 0 && groups.length === 0) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /> <span className="ml-2">Loading schedules...</span></div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <Dialog open={showMetadataDialog} onOpenChange={(open) => { if (!open) setSelectedScheduleForMetadata(null); setShowMetadataDialog(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{metadataFormMode === 'create' ? 'Создать новое расписание' : 'Редактировать расписание'}</DialogTitle>
            <DialogDescription>
              {metadataFormMode === 'create' 
                ? 'Выберите группу, семестр и учебный год' 
                : `Редактирование расписания для группы: ${getGroupName(selectedScheduleForMetadata?.groupId || '')}`}
            </DialogDescription>
          </DialogHeader>
          {showMetadataDialog && (
            <ScheduleMetadataForm 
              mode={metadataFormMode} 
              scheduleId={selectedScheduleForMetadata?.id} 
              onFormSubmitSuccess={handleMetadataFormSuccess} 
              onCancel={() => setShowMetadataDialog(false)} 
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showManageLessonsDialog} onOpenChange={(open) => { if (!open) setCurrentManagingSchedule(null); setShowManageLessonsDialog(open); }}>
        <DialogContent className="max-w-3xl lg:max-w-4xl xl:max-w-6xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Управление расписанием: {getGroupName(currentManagingSchedule?.groupId || '')} 
              ({currentManagingSchedule?.year} г., Семестр {currentManagingSchedule?.semester})
            </DialogTitle>
            <DialogDescription>Добавление, редактирование или удаление занятий в расписании.</DialogDescription>
          </DialogHeader>
          {currentManagingSchedule && (
            <>
              <div className="py-2 border-b mb-2 flex items-center gap-2">
                <Button onClick={handleOpenAddLessonDialog} size="sm" disabled={isSubmitting}>
                  <CalendarPlus className="mr-2 h-4 w-4" /> Добавить занятие
                </Button>
                <Button onClick={() => setShowBulkLessonForm(true)} size="sm" disabled={isSubmitting}>
                  <ListChecks className="mr-2 h-4 w-4" /> Массовое добавление
                </Button>
                <Button onClick={() => setShowTemplateForm(true)} size="sm" disabled={isSubmitting}>
                  <FileText className="mr-2 h-4 w-4" /> Сохранить как шаблон
                </Button>
                <Button onClick={() => setShowTemplatesList(true)} size="sm" disabled={isSubmitting}>
                  <FileText className="mr-2 h-4 w-4" /> Применить шаблон
                </Button>
              </div>
              <div className="mb-4 flex-1 min-h-0 overflow-y-auto">
                <ScheduleCalendar
                  schedule={currentManagingSchedule}
                  subjects={subjects}
                  teachers={teachers}
                  onLessonClick={(lesson) => handleLessonClick(lesson, currentManagingSchedule)}
                  hideWeekSwitcher={true}
                />
              </div>
              <DialogFooter className="mt-auto pt-4 border-t">
                <DialogClose asChild>
                  <Button type="button" variant="outline">Закрыть</Button>
                </DialogClose>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showLessonFormDialog} onOpenChange={(open) => { if (!open) setSelectedLesson(null); setShowLessonFormDialog(open); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {lessonFormMode === 'create'
                ? 'Добавить новое занятие'
                : `Редактировать занятие: ${selectedLesson ? (subjects.find(s => s.id === selectedLesson.subjectId)?.name || '') : ''}`}
            </DialogTitle>
            <DialogDescription>
              Расписание: {getGroupName(currentManagingSchedule?.groupId || '')}
              {currentManagingSchedule ? ` (${currentManagingSchedule.year} г., Семестр ${currentManagingSchedule.semester})` : ''}
            </DialogDescription>
          </DialogHeader>
          {showLessonFormDialog && ((currentManagingSchedule && lessonFormMode === 'create') || (selectedLessonSchedule && lessonFormMode === 'edit')) && (
            <LessonForm
              mode={lessonFormMode}
              scheduleId={(lessonFormMode === 'create' ? currentManagingSchedule?.id : selectedLessonSchedule?.id) || ''}
              lessonId={selectedLesson?.id}
              subjects={subjects}
              onFormSubmitSuccess={handleLessonFormSuccess}
              onCancel={() => { setShowLessonFormDialog(false); setSelectedLessonSchedule(null); }}
              onRemoveLesson={selectedLesson ? () => setLessonToRemove({ lessonId: selectedLesson.id }) : undefined}
              groupName={getGroupName((lessonFormMode === 'create' ? currentManagingSchedule?.groupId : selectedLessonSchedule?.groupId) || '')}
              year={lessonFormMode === 'create' ? currentManagingSchedule?.year || 0 : selectedLessonSchedule?.year || 0}
              semester={lessonFormMode === 'create' ? currentManagingSchedule?.semester || 0 : selectedLessonSchedule?.semester || 0}
            />
          )}
        </DialogContent>
      </Dialog>
      
      {scheduleToDelete && (
        <AlertDialog open={!!scheduleToDelete} onOpenChange={() => setScheduleToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
              <AlertDialogDescription>
                Удалить расписание для группы {getGroupName(scheduleToDelete.groupId)} 
                ({scheduleToDelete.year} г., Семестр {scheduleToDelete.semester})? 
                Это действие нельзя отменить.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDeleteSchedule} 
                className="bg-red-600 hover:bg-red-700" 
                disabled={isSubmitting}
              >
                {isSubmitting ? "Удаление..." : "Удалить"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      
      {lessonToRemove && (
        <AlertDialog open={!!lessonToRemove} onOpenChange={() => setLessonToRemove(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить занятие?</AlertDialogTitle>
              <AlertDialogDescription>
                Вы уверены, что хотите удалить это занятие?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmRemoveLesson} 
                className="bg-red-600 hover:bg-red-700" 
                disabled={isSubmitting}
              >
                {isSubmitting ? "Удаление..." : "Удалить"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {currentManagingSchedule && (
        <>
          <BulkLessonForm
            open={showBulkLessonForm}
            onOpenChange={setShowBulkLessonForm}
            onAddLessons={handleBulkAddLessons}
            subjects={subjects.map(s => ({ id: s.id, name: s.name, teacherId: s.teacherId }))}
          />
          <ScheduleTemplateForm
            open={showTemplateForm}
            onOpenChange={(open) => {
              if (!open) {
                setEditingTemplate(null);
              }
              setShowTemplateForm(open);
            }}
            onSaveTemplate={handleSaveTemplate}
            schedule={currentManagingSchedule}
            editingTemplate={editingTemplate}
          />
        </>
      )}

      <ScheduleTemplatesList
        open={showTemplatesList}
        onOpenChange={setShowTemplatesList}
        templates={templates}
        onDeleteTemplate={handleDeleteTemplate}
        onApplyTemplate={handleApplyTemplate}
        onEditTemplate={handleEditTemplate}
      />

      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Управление расписаниями</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Создание и управление учебными расписаниями
            </p>
          </div>
          <Button onClick={handleOpenCreateScheduleDialog} disabled={isLoading}>
            <PlusCircle className="mr-2 h-4 w-4" /> Создать расписание
          </Button>
        </div>
      </header>

      <section>
        <div className="bg-card shadow sm:rounded-lg">
          {schedules.length === 0 && !isLoading ? (
            <div className="p-10 text-center text-muted-foreground">
              <ListChecks className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium">Расписания не найдены</h3>
              <p className="mt-1 text-sm">Начните с создания нового расписания.</p>
            </div>
          ) : (
            <>
              <div className="p-4 border-b">
                <ScheduleFilters
                  groups={groups}
                  onFilterChange={setFilters}
                  filters={filters}
                />
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Группа</TableHead>
                    <TableHead className="text-center">Год</TableHead>
                    <TableHead className="text-center">Семестр</TableHead>
                    <TableHead className="text-center">Количество занятий</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSchedules.map(schedule => (
                    <TableRow key={schedule.id}>
                      <TableCell className="font-medium">
                        {getGroupName(schedule.groupId)}
                      </TableCell>
                      <TableCell className="text-center">{schedule.year}</TableCell>
                      <TableCell className="text-center">{schedule.semester}</TableCell>
                      <TableCell className="text-center">
                        {schedule.lessons?.length || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <ScheduleExport
                            schedule={schedule}
                            subjects={subjects.map(s => ({ id: s.id, name: s.name }))}
                            teachers={teachers.map(t => ({ id: t.id, firstName: t.firstName, lastName: t.lastName }))}
                            open={showExportDialog}
                            onOpenChange={setShowExportDialog}
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Меню</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Действия</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleOpenManageLessons(schedule)}>
                                <Eye className="mr-2 h-4 w-4" /> Просмотр/Управление занятиями
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenEditScheduleMetadataDialog(schedule)}>
                                <Edit2 className="mr-2 h-4 w-4" /> Редактировать детали
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteScheduleInitiate(schedule)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Удалить расписание
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </div>
      </section>
    </div>
  );
};
export default ManageSchedulesPage;
