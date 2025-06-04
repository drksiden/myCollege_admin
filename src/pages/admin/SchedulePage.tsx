// src/pages/admin/SchedulePage.tsx
import React, { useEffect, useState } from 'react';
import { getGroups } from '@/lib/firebaseService/groupService';
import { getSemesters } from '@/lib/firebaseService/semesterService';
import { getGroupSchedule } from '@/lib/firebaseService/scheduleService';
import { getAllSubjects } from '@/lib/firebaseService/subjectService';
import { getUsers } from '@/lib/firebaseService/userService';
import type { Group, Semester, Lesson, Subject, TeacherUser } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  Calendar, 
  Clock, 
  Users, 
  BookOpen,
  MapPin,
  User,
  RefreshCw,
  Download,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { motion, AnimatePresence } from 'framer-motion';

const DAYS_OF_WEEK = [
  { value: 1, label: 'Понедельник', short: 'ПН' },
  { value: 2, label: 'Вторник', short: 'ВТ' },
  { value: 3, label: 'Среда', short: 'СР' },
  { value: 4, label: 'Четверг', short: 'ЧТ' },
  { value: 5, label: 'Пятница', short: 'ПТ' },
  { value: 6, label: 'Суббота', short: 'СБ' },
];

const LESSON_TYPES = {
  lecture: { label: 'Лекция', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  seminar: { label: 'Семинар', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  lab: { label: 'Лабораторная', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  exam: { label: 'Экзамен', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
};

const SchedulePage: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<TeacherUser[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      toast.loading('Загрузка данных...', { id: 'initial-load' });
      try {
        const [groupsData, semestersData, subjectsData] = await Promise.all([
          getGroups(),
          getSemesters(), // Убираем фильтр 'active' чтобы получить все семестры
          getAllSubjects(),
        ]);

        const { users: teachersData } = await getUsers({ role: 'teacher' });

        setGroups(groupsData);
        setSemesters(semestersData);
        setSubjects(subjectsData);
        setTeachers(teachersData as TeacherUser[]);
        
        // Отладочная информация
        console.log('Loaded data:', {
          groups: groupsData.length,
          semesters: semestersData.length,
          subjects: subjectsData.length,
          teachers: teachersData.length
        });
        
        // Автоматически выбираем первый семестр если есть
        if (semestersData.length > 0 && !selectedSemesterId) {
          setSelectedSemesterId(semestersData[0].id);
          console.log('Auto-selected semester:', semestersData[0].id);
        }
        
        toast.success('Данные загружены', { id: 'initial-load' });
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Не удалось загрузить данные', { id: 'initial-load' });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const fetchSchedule = async (groupId: string, semesterId: string) => {
    setScheduleLoading(true);
    toast.loading('Загрузка расписания...', { id: 'schedule-load' });
    
    try {
      const scheduleData = await getGroupSchedule({ groupId, semesterId });
      setLessons(scheduleData);
      toast.success('Расписание загружено', { id: 'schedule-load' });
    } catch (error) {
      console.error('Error fetching schedule:', error);
      toast.error('Не удалось загрузить расписание', { id: 'schedule-load' });
      setLessons([]);
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleSemesterChange = (semesterId: string) => {
    console.log('Changing semester to:', semesterId); // Отладка
    setSelectedSemesterId(semesterId);
    setSelectedGroupId('');
    setLessons([]);
  };

  const handleGroupChange = (groupId: string) => {
    console.log('Changing group to:', groupId); // Отладка
    setSelectedGroupId(groupId);
    if (selectedSemesterId) {
      fetchSchedule(groupId, selectedSemesterId);
    }
  };

  const getSubjectName = (subjectId: string) => {
    return subjects.find(s => s.id === subjectId)?.name || 'Неизвестный предмет';
  };

  const getTeacherName = (teacherId: string | null) => {
    if (!teacherId) return 'Не назначен';
    const teacher = teachers.find(t => t.uid === teacherId);
    return teacher ? `${teacher.lastName} ${teacher.firstName}` : 'Неизвестный преподаватель';
  };

  const getLessonsByDay = (dayOfWeek: number) => {
    return lessons
      .filter(lesson => lesson.dayOfWeek === dayOfWeek)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const selectedGroup = groups.find(g => g.id === selectedGroupId);
  const selectedSemester = semesters.find(s => s.id === selectedSemesterId);

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const cardVariants = {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
  };

  if (loading) {
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
      <Toaster richColors position="top-right" />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Расписание занятий</h1>
          <p className="text-muted-foreground">
            Просмотр расписания по группам и семестрам
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => selectedGroupId && selectedSemesterId && fetchSchedule(selectedGroupId, selectedSemesterId)}
            disabled={!selectedGroupId || !selectedSemesterId || scheduleLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${scheduleLoading ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
          <Button variant="outline" className="gap-2" disabled={!lessons.length}>
            <Download className="h-4 w-4" />
            Экспорт
          </Button>
        </div>
      </div>

      {/* Filters */}
      <motion.div variants={cardVariants} initial="initial" animate="animate">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Фильтры
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Семестр</label>
                <Select value={selectedSemesterId} onValueChange={handleSemesterChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите семестр">
                      {selectedSemesterId && semesters.find(s => s.id === selectedSemesterId)?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] overflow-y-auto">
                    {semesters.map((semester) => (
                      <SelectItem key={semester.id} value={semester.id}>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {semester.name} ({semester.academicYear})
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {semesters.length === 0 && (
                  <p className="text-sm text-muted-foreground">Нет доступных семестров</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Группа</label>
                <Select
                  value={selectedGroupId}
                  onValueChange={handleGroupChange}
                  disabled={!selectedSemesterId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedSemesterId ? "Выберите группу" : "Сначала выберите семестр"}>
                      {selectedGroupId && groups.find(g => g.id === selectedGroupId)?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] overflow-y-auto">
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {group.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {groups.length === 0 && (
                  <p className="text-sm text-muted-foreground">Нет доступных групп</p>
                )}
              </div>
            </div>

            {selectedGroup && selectedSemester && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Выбрано:</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedGroup.name} • {selectedSemester.name}
                    </p>
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    <BookOpen className="h-3 w-3" />
                    {lessons.length} занятий
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Schedule Content */}
      {selectedGroupId && selectedSemesterId ? (
        scheduleLoading ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Загрузка расписания...</p>
              </div>
            </CardContent>
          </Card>
        ) : lessons.length > 0 ? (
          <div className="grid gap-4">
            <AnimatePresence>
              {DAYS_OF_WEEK.map((day, dayIndex) => {
                const dayLessons = getLessonsByDay(day.value);
                
                return (
                  <motion.div
                    key={day.value}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: dayIndex * 0.1 }}
                  >
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                              {day.short}
                            </div>
                            {day.label}
                          </div>
                          <Badge variant="secondary" className="gap-1">
                            <Clock className="h-3 w-3" />
                            {dayLessons.length}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {dayLessons.length === 0 ? (
                          <div className="text-center py-6 text-muted-foreground">
                            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Нет занятий</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {dayLessons.map((lesson, lessonIndex) => (
                              <motion.div
                                key={lesson.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: (dayIndex * 0.1) + (lessonIndex * 0.05) }}
                                className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-gradient-to-r from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50"
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-mono text-sm font-medium">
                                      {lesson.startTime} - {lesson.endTime}
                                    </span>
                                  </div>
                                  <Badge className={LESSON_TYPES[lesson.type as keyof typeof LESSON_TYPES]?.color || 'bg-gray-100 text-gray-800'}>
                                    {LESSON_TYPES[lesson.type as keyof typeof LESSON_TYPES]?.label || lesson.type}
                                  </Badge>
                                </div>

                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <BookOpen className="h-4 w-4 text-blue-500" />
                                    <span className="font-medium">{getSubjectName(lesson.subjectId)}</span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-green-500" />
                                    <span className="text-sm text-muted-foreground">
                                      {getTeacherName(lesson.teacherId)}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-orange-500" />
                                    <span className="text-sm text-muted-foreground">
                                      {lesson.room || 'Аудитория не указана'}
                                    </span>
                                  </div>

                                  {lesson.topic && (
                                    <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded text-sm">
                                      <span className="font-medium">Тема: </span>
                                      {lesson.topic}
                                    </div>
                                  )}

                                  {lesson.weekType && lesson.weekType !== 'all' && (
                                    <div className="mt-2">
                                      <Badge variant="outline" className="text-xs">
                                        {lesson.weekType === 'odd' ? 'Нечетная неделя' : 'Четная неделя'}
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">Расписание пусто</h3>
                <p className="text-muted-foreground">
                  Для выбранной группы и семестра нет занятий
                </p>
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <div className="h-12 w-12 mx-auto mb-4 rounded-lg bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-medium mb-2">Выберите группу и семестр</h3>
              <p className="text-muted-foreground">
                Чтобы просмотреть расписание, выберите семестр и группу
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
};

export default SchedulePage;