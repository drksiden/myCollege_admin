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

const PAIRS = [
  { start: '08:00', end: '09:30', label: '1 пара' },
  { start: '09:40', end: '11:10', label: '2 пара' },
  { start: '11:25', end: '12:55', label: '3 пара' },
  { start: '13:25', end: '14:55', label: '4 пара' },
  { start: '15:05', end: '16:35', label: '5 пара' },
  { start: '16:50', end: '18:20', label: '6 пара' },
  { start: '18:30', end: '20:00', label: '7 пара' },
];

const getLessonTypeColor = (type: Lesson['type']) => {
  switch (type) {
    case 'lecture':
      return 'bg-blue-100 text-blue-800';
    case 'seminar':
      return 'bg-green-100 text-green-800';
    case 'lab':
      return 'bg-purple-100 text-purple-800';
    case 'exam':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
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
          {PAIRS.map(pair => (
            <div
              key={pair.label}
              className="h-20 border-b last:border-b-0 flex flex-col items-center justify-center text-sm text-muted-foreground"
            >
              <div className="font-medium">{pair.label}</div>
              <div>{pair.start}–{pair.end}</div>
            </div>
          ))}
        </div>

        {/* Days columns */}
        {DAYS_OF_WEEK.map((day, dayIndex) => (
          <div key={day} className="bg-muted/50">
            <div className="h-12 border-b flex items-center justify-center text-sm font-medium">
              {day}
            </div>
            {PAIRS.map(pair => {
              // Ищем все занятия, которые хотя бы частично попадают в интервал пары
              const lessons = schedule.lessons.filter(l =>
                l.dayOfWeek === dayIndex + 1 &&
                l.startTime < pair.end &&
                l.endTime > pair.start
              );
              return (
                <div
                  key={pair.label}
                  className="h-20 border-b last:border-b-0 flex flex-row items-stretch justify-stretch relative"
                >
                  {lessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className={cn(
                        'h-full rounded-md border p-2 cursor-pointer hover:shadow-md transition-shadow flex flex-col justify-center',
                        getLessonTypeColor(lesson.type)
                      )}
                      style={{ width: `${100 / lessons.length}%`, minWidth: 0 }}
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
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScheduleCalendar; 