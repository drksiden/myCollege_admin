// src/pages/admin/ManageSchedulesPage.tsx
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Plus, 
  FileText, 
  Calendar, 
  Settings, 
  Download, 
  Upload,
  Loader2,
  BookOpen,
  Users,
  MapPin,
  User,
  Filter
} from 'lucide-react';
import LessonForm from '@/components/admin/schedules/LessonForm';
import BulkLessonForm from '@/components/admin/schedules/BulkLessonForm';
import ScheduleTemplateForm from '@/components/admin/schedules/ScheduleTemplateForm';
import { ScheduleTemplatesList } from '@/components/admin/schedules/ScheduleTemplatesList';
import ScheduleCalendar from '@/components/admin/schedules/ScheduleCalendar';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { getGroupSchedule, createLesson, updateLesson, deleteLesson } from '@/lib/firebaseService/scheduleService';
import { saveScheduleTemplate, getAllScheduleTemplates, deleteScheduleTemplate, updateScheduleTemplate } from '@/lib/firebaseService/scheduleTemplateService';
import { getAllGroups } from '@/lib/firebaseService/groupService';
import { getUsers } from '@/lib/firebaseService/userService';
import { getAllSubjects } from '@/lib/firebaseService/subjectService';
import { getSemesters } from '@/lib/firebaseService/semesterService';
import type { Lesson, Group, TeacherUser, Subject, Semester, ScheduleTemplate } from '@/types';
import { Timestamp } from 'firebase/firestore';
import { motion } from 'framer-motion';

export default function ManageSchedulesPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [teachers, setTeachers] = useState<TeacherUser[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [isLessonFormOpen, setIsLessonFormOpen] = useState(false);
  const [isBulkLessonFormOpen, setIsBulkLessonFormOpen] = useState(false);
  const [isTemplateFormOpen, setIsTemplateFormOpen] = useState(false);
  const [isTemplatesListOpen, setIsTemplatesListOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<ScheduleTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      toast.loading('Загрузка данных...', { id: 'initial-load' });
      
      try {
        const [groupsData, subjectsData, semestersData, templatesData] = await Promise.all([
          getAllGroups(),
          getAllSubjects(),
          getSemesters(),
          getAllScheduleTemplates(),
        ]);

        // Получаем только преподавателей
        const { users: teachersData } = await getUsers({ role: 'teacher', limit: 100 });

        setGroups(groupsData);
        setTeachers(teachersData as TeacherUser[]);
        setSubjects(subjectsData);
        setSemesters(semestersData);
        setTemplates(templatesData);

        if (groupsData.length > 0) {
          setSelectedGroup(groupsData[0].id);
        }
        if (semestersData.length > 0) {
          setSelectedSemester(semestersData[0].id);
        }

        toast.success('Данные загружены', { id: 'initial-load' });
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Не удалось загрузить данные', { id: 'initial-load' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchLessons = async () => {
      if (selectedGroup && selectedSemester) {
        setScheduleLoading(true);
        toast.loading('Загрузка расписания...', { id: 'schedule-load' });
        
        try {
          const lessonsData = await getGroupSchedule({ 
            groupId: selectedGroup,
            semesterId: selectedSemester
          });
          setLessons(lessonsData);
          toast.success('Расписание загружено', { id: 'schedule-load' });
        } catch (error) {
          console.error('Error loading schedule:', error);
          toast.error('Не удалось загрузить расписание', { id: 'schedule-load' });
        } finally {
          setScheduleLoading(false);
        }
      }
    };

    fetchLessons();
  }, [selectedGroup, selectedSemester]);

  const handleCreateLesson = async (lesson: Omit<Lesson, 'id' | 'createdAt' | 'updatedAt'>) => {
    const createToastId = toast.loading('Создание занятия...', { duration: Infinity });
    
    try {
      await createLesson(lesson);
      const updatedLessons = await getGroupSchedule({ 
        groupId: selectedGroup,
        semesterId: selectedSemester
      });
      setLessons(updatedLessons);
      setIsLessonFormOpen(false);
      toast.success('Занятие успешно создано', { id: createToastId });
    } catch (error) {
      console.error('Error creating lesson:', error);
      toast.error('Не удалось создать занятие', { id: createToastId });
    }
  };

  const handleUpdateLesson = async (lesson: Omit<Lesson, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editingLesson || !editingLesson.id) {
      toast.error('Некорректный ID занятия для обновления');
      return;
    }

    const updateToastId = toast.loading('Обновление занятия...', { duration: Infinity });
    
    try {
      await updateLesson(editingLesson.id, lesson);
      const updatedLessons = await getGroupSchedule({ 
        groupId: selectedGroup,
        semesterId: selectedSemester
      });
      setLessons(updatedLessons);
      setEditingLesson(null);
      toast.success('Занятие успешно обновлено', { id: updateToastId });
    } catch (error) {
      console.error('Error updating lesson:', error);
      toast.error('Не удалось обновить занятие', { id: updateToastId });
    }
  };

  const handleDeleteLesson = async (id: string) => {
    if (!id) {
      toast.error('Некорректный ID занятия для удаления');
      return;
    }

    const deleteToastId = toast.loading('Удаление занятия...', { duration: Infinity });
    
    try {
      await deleteLesson(id);
      toast.success('Занятие удалено', { id: deleteToastId });
      // Обновляем список занятий
      const updatedLessons = await getGroupSchedule({ groupId: selectedGroup, semesterId: selectedSemester });
      setLessons(updatedLessons || []);
    } catch (error) {
      console.error('Failed to delete lesson:', error);
      toast.error('Не удалось удалить занятие', { id: deleteToastId });
    }
  };

  const handleSaveTemplate = async (template: { name: string; description: string; lessons: Lesson[] }) => {
    const saveToastId = toast.loading(editingTemplate ? 'Обновление шаблона...' : 'Создание шаблона...', { duration: Infinity });
    
    try {
      if (editingTemplate) {
        await updateScheduleTemplate(editingTemplate.id, template);
      } else {
        await saveScheduleTemplate(template);
      }
      const updatedTemplates = await getAllScheduleTemplates();
      setTemplates(updatedTemplates);
      setIsTemplateFormOpen(false);
      setEditingTemplate(null);
      toast.success(`Шаблон успешно ${editingTemplate ? 'обновлен' : 'создан'}`, { id: saveToastId });
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error(`Не удалось ${editingTemplate ? 'обновить' : 'создать'} шаблон`, { id: saveToastId });
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    const deleteToastId = toast.loading('Удаление шаблона...', { duration: Infinity });
    
    try {
      await deleteScheduleTemplate(templateId);
      const updatedTemplates = await getAllScheduleTemplates();
      setTemplates(updatedTemplates);
      toast.success('Шаблон успешно удален', { id: deleteToastId });
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Не удалось удалить шаблон', { id: deleteToastId });
    }
  };

  const handleApplyTemplate = async (template: ScheduleTemplate) => {
    if (!selectedGroup || !selectedSemester) {
      toast.error('Выберите группу и семестр');
      return;
    }

    const applyToastId = toast.loading('Применение шаблона...', { duration: Infinity });

    try {
      console.log('Начало применения шаблона:', {
        templateName: template.name,
        totalLessons: template.lessons.length,
        lessons: template.lessons
      });

      // Создаем новые занятия из шаблона
      const newLessons = template.lessons
        .filter(lesson => {
          // Проверяем наличие обязательных полей
          const hasRequiredFields = 
            typeof lesson.subjectId === 'string' &&
            typeof lesson.dayOfWeek === 'number' &&
            typeof lesson.startTime === 'string' &&
            typeof lesson.endTime === 'string' &&
            typeof lesson.room === 'string' &&
            typeof lesson.type === 'string';

          if (!hasRequiredFields) {
            console.warn('Пропущено занятие из-за отсутствия обязательных полей:', {
              lesson,
              fields: {
                subjectId: typeof lesson.subjectId,
                dayOfWeek: typeof lesson.dayOfWeek,
                startTime: typeof lesson.startTime,
                endTime: typeof lesson.endTime,
                room: typeof lesson.room,
                type: typeof lesson.type
              }
            });
            return false;
          }
          return true;
        })
        .map(lesson => {
          // Убеждаемся, что все обязательные поля имеют значения
          const fullLesson: Omit<Lesson, 'id' | 'createdAt' | 'updatedAt'> = {
            semesterId: selectedSemester,
            groupId: selectedGroup,
            subjectId: lesson.subjectId as string,
            teacherId: lesson.teacherId || null,
            dayOfWeek: lesson.dayOfWeek as number,
            startTime: lesson.startTime as string,
            endTime: lesson.endTime as string,
            room: lesson.room as string,
            type: lesson.type as Lesson['type'],
            weekType: lesson.weekType || 'all',
            topic: lesson.topic || ''
          };
          return fullLesson;
        });

      console.log('После фильтрации и преобразования:', {
        filteredLessons: newLessons.length,
        lessons: newLessons
      });

      if (newLessons.length === 0) {
        toast.error('В шаблоне нет валидных занятий для применения', { id: applyToastId });
        return;
      }

      // Сохраняем все занятия последовательно
      console.log('Начало сохранения занятий...');
      for (const lesson of newLessons) {
        await createLesson(lesson);
      }
      console.log('Занятия сохранены');

      // Даем время на обновление индексов
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Обновляем список занятий
      console.log('Получение обновленного расписания...');
      const updatedLessons = await getGroupSchedule({ 
        groupId: selectedGroup,
        semesterId: selectedSemester
      });
      console.log('Получено обновленное расписание:', {
        totalLessons: updatedLessons.length,
        lessons: updatedLessons
      });

      setLessons(updatedLessons);
      setIsTemplatesListOpen(false);
      toast.success(`Шаблон успешно применен. Добавлено ${newLessons.length} занятий.`, { id: applyToastId });
    } catch (error) {
      console.error('Error applying template:', error);
      toast.error('Не удалось применить шаблон', { id: applyToastId });
    }
  };

  // Статистика
  const stats = {
    totalLessons: lessons.length,
    subjects: new Set(lessons.map(l => l.subjectId)).size,
    teachers: new Set(lessons.map(l => l.teacherId).filter(Boolean)).size,
    rooms: new Set(lessons.map(l => l.room)).size,
  };

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const cardVariants = {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="container mx-auto py-6 space-y-6"
    >
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Управление расписанием</h1>
          <p className="text-muted-foreground">
            Создавайте и редактируйте расписание занятий
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsTemplatesListOpen(true)} variant="outline" className="gap-2">
            <FileText className="h-4 w-4" />
            Шаблоны
          </Button>
          <Button onClick={() => setIsTemplateFormOpen(true)} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Сохранить шаблон
          </Button>
          <Button onClick={() => setIsBulkLessonFormOpen(true)} variant="outline" className="gap-2">
            <Upload className="h-4 w-4" />
            Массовое добавление
          </Button>
          <Button onClick={() => setIsLessonFormOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Добавить занятие
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { 
            title: 'Всего занятий', 
            value: stats.totalLessons, 
            icon: BookOpen, 
            color: 'text-blue-600',
            bgColor: 'bg-blue-100 dark:bg-blue-900',
            description: 'В текущем расписании'
          },
          { 
            title: 'Предметов', 
            value: stats.subjects, 
            icon: BookOpen, 
            color: 'text-green-600',
            bgColor: 'bg-green-100 dark:bg-green-900',
            description: 'Уникальных предметов'
          },
          { 
            title: 'Преподавателей', 
            value: stats.teachers, 
            icon: User, 
            color: 'text-purple-600',
            bgColor: 'bg-purple-100 dark:bg-purple-900',
            description: 'Задействованных'
          },
          { 
            title: 'Аудиторий', 
            value: stats.rooms, 
            icon: MapPin, 
            color: 'text-orange-600',
            bgColor: 'bg-orange-100 dark:bg-orange-900',
            description: 'Используемых'
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

      {/* Filters */}
      <motion.div variants={cardVariants} initial="initial" animate="animate">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Выбор группы и семестра
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Группа</label>
                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите группу" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] overflow-y-auto">
                    {groups.map(group => (
                      <SelectItem key={group.id} value={group.id}>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {group.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Семестр</label>
                <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите семестр" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] overflow-y-auto">
                    {semesters.map(semester => (
                      <SelectItem key={semester.id} value={semester.id}>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {semester.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Schedule Content */}
      {selectedGroup && selectedSemester && (
        <motion.div
          variants={cardVariants}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Редактор расписания
              </CardTitle>
              <CardDescription>
                {scheduleLoading ? 'Загрузка расписания...' : `Расписание для ${groups.find(g => g.id === selectedGroup)?.name}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {scheduleLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="bg-card rounded-lg border shadow-sm">
                  <ScheduleCalendar
                    schedule={{
                      id: `${selectedSemester}_${selectedGroup}`,
                      semesterId: selectedSemester,
                      groupId: selectedGroup,
                      groupName: groups.find(g => g.id === selectedGroup)?.name || '',
                      lessons,
                      createdAt: Timestamp.now(),
                      updatedAt: Timestamp.now(),
                      semester: 1,
                      year: 2024,
                    }}
                    subjects={subjects}
                    teachers={teachers.map(teacher => ({
                      id: teacher.uid,
                      firstName: teacher.firstName || '',
                      lastName: teacher.lastName || '',
                      middleName: teacher.middleName || undefined,
                    }))}
                    onLessonClick={(lesson) => {
                      setEditingLesson(lesson);
                      setIsLessonFormOpen(true);
                    }}
                    className="p-4"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Lesson Form */}
      <LessonForm
        open={isLessonFormOpen}
        onOpenChange={setIsLessonFormOpen}
        lesson={editingLesson}
        groupId={selectedGroup}
        semesterId={selectedSemester}
        subjects={subjects}
        teachers={teachers}
        groups={groups}
        onSubmit={editingLesson ? handleUpdateLesson : handleCreateLesson}
        onDelete={handleDeleteLesson}
      />

      {/* Bulk Lesson Form */}
      <BulkLessonForm
        open={isBulkLessonFormOpen}
        onOpenChange={setIsBulkLessonFormOpen}
        onSave={handleCreateLesson}
        groupId={selectedGroup}
        semesterId={selectedSemester}
        subjects={subjects}
        teachers={teachers}
        groups={groups}
      />

      {/* Schedule Template Form */}
      <ScheduleTemplateForm
        open={isTemplateFormOpen}
        onOpenChange={setIsTemplateFormOpen}
        onSaveTemplate={handleSaveTemplate}
        template={editingTemplate}
        lessons={lessons}
      />

      {/* Schedule Templates List */}
      <ScheduleTemplatesList
        open={isTemplatesListOpen}
        onOpenChange={setIsTemplatesListOpen}
        templates={templates}
        onApplyTemplate={handleApplyTemplate}
        onEditTemplate={(template) => {
          setEditingTemplate(template);
          setIsTemplateFormOpen(true);
        }}
        onDeleteTemplate={handleDeleteTemplate}
      />
    </motion.div>
  );
}