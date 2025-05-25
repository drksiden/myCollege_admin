import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Schedule, Lesson } from '@/types';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ru } from 'date-fns/locale';

interface ScheduleCalendarProps {
  schedule: Schedule;
  subjects: { id: string; name: string }[];
  teachers: { id: string; firstName: string; lastName: string; middleName?: string }[];
  onLessonClick?: (lesson: Lesson) => void;
  className?: string;
  hideWeekSwitcher?: boolean;
}

const DAYS_OF_WEEK = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье',
];

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:10', '18:50'
];

const DAY_START = 8 * 60; // 08:00 в минутах
const DAY_END = 21 * 60;  // 21:00 в минутах
const DAY_DURATION = DAY_END - DAY_START;

const getLessonStyle = (lesson: Lesson) => {
  const [sh, sm] = lesson.startTime.split(':').map(Number);
  const [eh, em] = lesson.endTime.split(':').map(Number);
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;
  const duration = endMinutes - startMinutes;

  // Высота и top в процентах от всего дня
  const height = `${(duration / DAY_DURATION) * 100}%`;
  const top = `${((startMinutes - DAY_START) / DAY_DURATION) * 100}%`;

  return { height, top };
};

const getLessonTypeColor = (type: Lesson['type']) => {
  switch (type) {
    case 'lecture':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'practice':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'laboratory':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getWeekTypeBadge = (weekType?: string) => {
  if (!weekType || weekType === 'all') return null;
  return (
    <Badge variant="outline" className="ml-1 text-xs">
      {weekType === 'odd' ? 'Odd' : 'Even'}
    </Badge>
  );
};

const getLessonTitle = (
  lesson: Lesson,
  subjects: { id: string; name: string }[],
  teachers: { id: string; firstName: string; lastName: string; middleName?: string }[]
) => {
  const subject = subjects.find(s => s.id === lesson.subjectId)?.name || lesson.subjectId;
  const teacher = teachers.find(t => t.id === lesson.teacherId);
  let teacherName = '';
  if (teacher && teacher.firstName && teacher.lastName) {
    teacherName = `${teacher.lastName} ${teacher.firstName[0]}.`;
    if (teacher.middleName) teacherName += `${teacher.middleName[0]}.`;
  }
  // Если преподавателя нет — не добавлять его в строку
  return teacherName
    ? `${subject} (${lesson.room}) ${teacherName}`
    : `${subject} (${lesson.room})`;
};

const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({
  schedule,
  subjects,
  teachers,
  onLessonClick,
  className,
  hideWeekSwitcher,
}) => {
  const [currentWeek, setCurrentWeek] = React.useState(new Date());

  const nextWeek = () => {
    setCurrentWeek(prev => {
      const next = new Date(prev);
      next.setDate(next.getDate() + 7);
      return next;
    });
  };

  const prevWeek = () => {
    setCurrentWeek(prev => {
      const next = new Date(prev);
      next.setDate(next.getDate() - 7);
      return next;
    });
  };

  const getLessonsForDay = (dayIndex: number) => {
    return schedule.lessons.filter(lesson => lesson.dayOfWeek === dayIndex + 1);
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {!hideWeekSwitcher && (
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={prevWeek}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium">
            {format(currentWeek, 'd MMMM', { locale: ru })} - {format(new Date(currentWeek.getTime() + 6 * 24 * 60 * 60 * 1000), 'd MMMM, yyyy', { locale: ru })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={nextWeek}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="grid grid-cols-8 gap-px bg-border rounded-lg overflow-hidden">
        {/* Time column */}
        <div className="bg-muted/50">
          <div className="h-12 border-b" /> {/* Header spacer */}
          {TIME_SLOTS.map(time => (
            <div
              key={time}
              className="h-16 border-b last:border-b-0 flex items-center justify-center text-sm text-muted-foreground"
            >
              {time}
            </div>
          ))}
        </div>

        {/* Days columns */}
        {DAYS_OF_WEEK.map((day, dayIndex) => (
          <div key={day} className="bg-muted/50">
            <div className="h-12 border-b flex items-center justify-center text-sm font-medium">
              {day}
            </div>
            <div className="relative" style={{ height: `${DAY_DURATION}px` }}>
              {getLessonsForDay(dayIndex).map(lesson => {
                const style = getLessonStyle(lesson);
                return (
                  <div
                    key={lesson.id}
                    className={cn(
                      'absolute left-0 right-0 mx-1 rounded-md border p-2 cursor-pointer hover:shadow-md transition-shadow',
                      getLessonTypeColor(lesson.type)
                    )}
                    style={style}
                    onClick={() => onLessonClick?.(lesson)}
                  >
                    <div className="text-xs font-medium truncate">
                      {getLessonTitle(lesson, subjects, teachers)}
                      {getWeekTypeBadge(lesson.weekType)}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {lesson.startTime} - {lesson.endTime}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScheduleCalendar; 