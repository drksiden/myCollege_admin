import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Lesson, Subject, TeacherUser } from '@/types';
import { ChevronLeft, ChevronRight, Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { getGroupSchedule, deleteLesson } from '@/lib/firebaseService/scheduleService';
import { getSubjects } from '@/lib/firebaseService/subjectService';
import { getUsers } from '@/lib/firebaseService/userService';
import LessonFormDialog from './LessonFormDialog';

interface ScheduleViewProps {
  semesterId: string;
  groupId: string;
  className?: string;
}

const DAYS_OF_WEEK = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
];

const TIME_SLOTS = [
  { start: '08:30', end: '10:00' },
  { start: '10:10', end: '11:40' },
  { start: '12:10', end: '13:40' },
  { start: '14:00', end: '15:30' },
  { start: '15:40', end: '17:10' },
  { start: '17:20', end: '18:50' },
];

const typeColors = {
  lecture: 'bg-blue-100 dark:bg-blue-900',
  seminar: 'bg-green-100 dark:bg-green-900',
  lab: 'bg-purple-100 dark:bg-purple-900',
  exam: 'bg-red-100 dark:bg-red-900',
};

const typeLabels = {
  lecture: 'Лекция',
  seminar: 'Семинар',
  lab: 'Лабораторная',
  exam: 'Экзамен',
};

const ScheduleView: React.FC<ScheduleViewProps> = ({
  semesterId,
  groupId,
  className,
}) => {
  const [currentWeek, setCurrentWeek] = useState(1);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<TeacherUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | undefined>();
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ dayOfWeek: number; start: string; end: string } | undefined>();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [lessonsData, subjectsData, teachersData] = await Promise.all([
          getGroupSchedule(semesterId, groupId),
          getSubjects(),
          getUsers({ role: 'teacher' }),
        ]);

        setLessons(lessonsData);
        setSubjects(subjectsData);
        setTeachers(teachersData.users.filter(user => user.role === 'teacher') as TeacherUser[]);
      } catch (error) {
        console.error('Error fetching schedule data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (semesterId && groupId) {
      fetchData();
    }
  }, [semesterId, groupId]);

  const handlePrevWeek = () => {
    setCurrentWeek(prev => Math.max(1, prev - 1));
  };

  const handleNextWeek = () => {
    setCurrentWeek(prev => Math.min(16, prev + 1));
  };

  const handleAddLesson = (dayOfWeek: number, timeSlot: { start: string; end: string }) => {
    setSelectedTimeSlot({ dayOfWeek, ...timeSlot });
    setSelectedLesson(undefined);
    setIsDialogOpen(true);
  };

  const handleEditLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setSelectedTimeSlot(undefined);
    setIsDialogOpen(true);
  };

  const handleDeleteLesson = async (lessonId: string) => {
    try {
      await deleteLesson(lessonId);
      setLessons(prev => prev.filter(lesson => lesson.id !== lessonId));
    } catch (error) {
      console.error('Error deleting lesson:', error);
    }
  };

  const handleSaveLesson = (lesson: Lesson) => {
    setLessons(prev => {
      const index = prev.findIndex(l => l.id === lesson.id);
      if (index >= 0) {
        const newLessons = [...prev];
        newLessons[index] = lesson;
        return newLessons;
      }
      return [...prev, lesson];
    });
  };

  const getEntriesForTimeSlot = (day: number, timeSlot: { start: string; end: string }) => {
    return lessons.filter(
      lesson =>
        lesson.dayOfWeek === day &&
        lesson.startTime === timeSlot.start &&
        lesson.endTime === timeSlot.end &&
        (lesson.weekType === 'all' || 
         (lesson.weekType === 'odd' && currentWeek % 2 === 1) ||
         (lesson.weekType === 'even' && currentWeek % 2 === 0))
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Загрузка расписания...</span>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Расписание</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevWeek}
            disabled={currentWeek === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">Неделя {currentWeek}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextWeek}
            disabled={currentWeek === 16}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-muted">
        <div className="bg-background p-2 text-center font-medium">Время</div>
        {DAYS_OF_WEEK.map((day) => (
          <div key={day} className="bg-background p-2 text-center font-medium">
            {day}
          </div>
        ))}

        {TIME_SLOTS.map((timeSlot) => (
          <React.Fragment key={`${timeSlot.start}-${timeSlot.end}`}>
            <div className="bg-background p-2 text-center text-sm">
              {timeSlot.start}
              <br />
              {timeSlot.end}
            </div>
            {DAYS_OF_WEEK.map((_, dayIndex) => {
              const entries = getEntriesForTimeSlot(dayIndex + 1, timeSlot);
              return (
                <div
                  key={`${dayIndex}-${timeSlot.start}`}
                  className="bg-background p-2 min-h-[100px] relative group"
                >
                  {entries.length > 0 ? (
                    entries.map(entry => {
                      const subject = subjects.find(s => s.id === entry.subjectId);
                      const teacher = teachers.find(t => t.uid === entry.teacherId);
                      return (
                        <div
                          key={entry.id}
                          className={cn(
                            'mb-2 rounded-md p-2 text-sm',
                            typeColors[entry.type]
                          )}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <div className="font-medium">{subject?.name || '—'}</div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleEditLesson(entry)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteLesson(entry.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {teacher ? `${teacher.lastName} ${teacher.firstName}` : '—'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {entry.room}
                          </div>
                          <Badge variant="secondary" className="mt-1">
                            {typeLabels[entry.type]}
                          </Badge>
                        </div>
                      );
                    })
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleAddLesson(dayIndex + 1, timeSlot)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      <LessonFormDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        mode={selectedLesson ? 'edit' : 'create'}
        initialData={selectedLesson || (selectedTimeSlot ? {
          semesterId,
          groupId,
          dayOfWeek: selectedTimeSlot.dayOfWeek,
          startTime: selectedTimeSlot.start,
          endTime: selectedTimeSlot.end,
        } : undefined)}
        onSave={handleSaveLesson}
      />
    </div>
  );
};

export default ScheduleView;
