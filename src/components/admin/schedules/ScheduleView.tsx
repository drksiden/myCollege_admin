import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Schedule, Lesson, Subject, Teacher } from '@/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ScheduleViewProps {
  schedule: Schedule;
  subjects: Subject[];
  teachers: Teacher[];
  onLessonClick?: (lesson: Lesson) => void;
  className?: string;
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
  { start: '08:30', end: '10:00' },
  { start: '10:10', end: '11:40' },
  { start: '12:10', end: '13:40' },
  { start: '14:00', end: '15:30' },
  { start: '15:40', end: '17:10' },
  { start: '17:20', end: '18:50' },
];

const ScheduleView: React.FC<ScheduleViewProps> = ({
  schedule,
  subjects,
  teachers,
  onLessonClick,
  className,
}) => {
  const [currentWeek, setCurrentWeek] = React.useState(1);

  const enrichedLessons = React.useMemo(() => {
    const subjectMap = new Map(subjects.map(s => [s.id, s.name]));
    const teacherMap = new Map(teachers.map(t => [t.id, `${t.firstName} ${t.lastName}`.trim()]));

    return schedule.lessons.map(lesson => ({
      ...lesson,
      subjectName: subjectMap.get(lesson.subjectId) || 'Неизвестный предмет',
      teacherName: teacherMap.get(lesson.teacherId) || 'Неизвестный преподаватель',
    }));
  }, [schedule.lessons, subjects, teachers]);

  const getLessonsForTimeSlot = (day: number, timeSlot: { start: string; end: string }) => {
    return enrichedLessons.filter(
      lesson =>
        lesson.dayOfWeek === day &&
        lesson.startTime === timeSlot.start &&
        lesson.endTime === timeSlot.end &&
        (lesson.weekType === 'all' || 
         (lesson.weekType === 'odd' && currentWeek % 2 === 1) ||
         (lesson.weekType === 'even' && currentWeek % 2 === 0))
    );
  };

  const handlePrevWeek = () => {
    setCurrentWeek(prev => Math.max(1, prev - 1));
  };

  const handleNextWeek = () => {
    setCurrentWeek(prev => Math.min(16, prev + 1));
  };

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

      <ScrollArea className="h-[600px] rounded-md border">
        <div className="grid grid-cols-8 gap-px bg-muted">
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
                const lessons = getLessonsForTimeSlot(dayIndex + 1, timeSlot);
                return (
                  <div
                    key={`${dayIndex}-${timeSlot.start}`}
                    className="bg-background p-2 min-h-[100px]"
                  >
                    {lessons.map(lesson => (
                      <div
                        key={lesson.id}
                        className={cn(
                          'mb-2 rounded-md p-2 text-sm cursor-pointer hover:bg-accent',
                          {
                            'bg-blue-100 dark:bg-blue-900': lesson.type === 'lecture',
                            'bg-green-100 dark:bg-green-900': lesson.type === 'practice',
                            'bg-purple-100 dark:bg-purple-900': lesson.type === 'laboratory',
                          }
                        )}
                        onClick={() => onLessonClick?.(lesson)}
                      >
                        <div className="font-medium">{lesson.subjectName}</div>
                        <div className="text-xs text-muted-foreground">
                          {lesson.teacherName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {lesson.room}
                        </div>
                        <Badge variant="outline" className="mt-1">
                          {lesson.type === 'lecture'
                            ? 'Лекция'
                            : lesson.type === 'practice'
                            ? 'Практика'
                            : 'Лабораторная'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ScheduleView;
