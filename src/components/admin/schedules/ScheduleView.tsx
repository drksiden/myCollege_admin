import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from '@/components/ui/table';
import { Edit2, Trash2, CalendarDays, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { getAllSubjects } from '@/lib/firebaseService/subjectService';
import { getAllTeachers as getAllTeacherProfiles } from '@/lib/firebaseService/teacherService';
import { getUsersFromFirestore } from '@/lib/firebaseService/userService';
import type { Schedule, Lesson } from '@/types';
// LessonForm and AlertDialog will be handled by the parent component managing this view

interface ScheduleViewProps {
  schedule: Schedule | null; // Allow null if schedule is being loaded or not selected
  onEditLesson: (lesson: Lesson) => void; 
  onRemoveLesson: (lessonId: string) => void; 
  isLoading?: boolean; // Parent can indicate overall loading/processing state
  className?: string;
}

interface EnrichedLesson extends Lesson {
  subjectName?: string;
  teacherName?: string;
}

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const ScheduleView: React.FC<ScheduleViewProps> = ({
  schedule,
  onEditLesson,
  onRemoveLesson,
  isLoading: parentIsLoading, // Renamed to avoid conflict
  className,
}) => {
  const [enrichedLessons, setEnrichedLessons] = useState<EnrichedLesson[]>([]);
  const [internalLoading, setInternalLoading] = useState(true); // For fetching subjects/teachers

  useEffect(() => {
    const fetchDataForDisplay = async () => {
      if (!schedule || !schedule.lessons || schedule.lessons.length === 0) {
        setEnrichedLessons([]);
        setInternalLoading(false);
        return;
      }
      setInternalLoading(true);
      try {
        // These can be cached in a context or Zustand store in a real app for efficiency
        const [subjects, teacherProfiles, users] = await Promise.all([
          getAllSubjects(db),
          getAllTeacherProfiles(db),
          getUsersFromFirestore(db),
        ]);

        const subjectMap = new Map(subjects.map(s => [s.id, s.name]));
        const userMap = new Map(users.map(u => [u.uid, `${u.firstName} ${u.lastName}`.trim()]));
        
        const teacherDisplayMap = new Map<string, string>();
        teacherProfiles.forEach(tp => {
            teacherDisplayMap.set(tp.id, userMap.get(tp.userId) || 'Unknown Teacher');
        });
        
        const lessonsWithDetails = schedule.lessons.map(lesson => ({
          ...lesson,
          subjectName: subjectMap.get(lesson.subjectId) || 'Unknown Subject',
          teacherName: teacherDisplayMap.get(lesson.teacherId) || 'Unknown Teacher',
        }));
        setEnrichedLessons(lessonsWithDetails);
      } catch (error) {
        toast.error("Failed to load lesson details (subjects/teachers).");
        console.error("Error fetching details for schedule view:", error);
        // Fallback to IDs if names can't be fetched
        setEnrichedLessons(schedule.lessons.map(l => ({ 
            ...l, 
            subjectName: l.subjectId, 
            teacherName: l.teacherId 
        })));
      } finally {
        setInternalLoading(false);
      }
    };

    fetchDataForDisplay();
  }, [schedule]); // Rerun when the schedule prop changes

  const lessonsByDay = useMemo(() => {
    const grouped: { [key: number]: EnrichedLesson[] } = {};
    enrichedLessons.forEach(lesson => {
      if (!grouped[lesson.dayOfWeek]) {
        grouped[lesson.dayOfWeek] = [];
      }
      grouped[lesson.dayOfWeek].push(lesson);
    });
    // Sort lessons within each day by start time
    for (const day in grouped) {
      grouped[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return grouped;
  }, [enrichedLessons]);


  if (internalLoading) {
    return <div className="flex justify-center items-center p-10"><Loader2 className="h-8 w-8 animate-spin" /> <span className="ml-2">Loading schedule details...</span></div>;
  }

  if (!schedule || schedule.lessons.length === 0) {
    return (
      <div className={`text-center p-6 border rounded-md ${className}`}>
        <CalendarDays className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium">No lessons in this schedule yet.</h3>
        <p className="mt-1 text-sm text-muted-foreground">Add lessons to build the schedule.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {daysOfWeek.map((dayName, index) => {
        const dayNumber = index + 1;
        const lessonsForDay = lessonsByDay[dayNumber];
        
        if (!lessonsForDay || lessonsForDay.length === 0) {
          // Optionally render a message for empty days or skip rendering
          return (
            <div key={dayNumber} className="pt-2 pb-1">
              <h3 className="text-lg font-semibold mb-1 text-muted-foreground sticky top-0 bg-background/95 backdrop-blur py-1 z-10 border-b">
                {dayName} - No lessons
              </h3>
            </div>
          );
        }
        return (
          <div key={dayNumber}>
            <h3 className="text-lg font-semibold mb-2 sticky top-0 bg-background/95 backdrop-blur py-2 z-10 border-b">
              {dayName}
            </h3>
            <Table>
              <TableCaption className="mt-0 mb-2 sr-only">Lessons for {dayName}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[15%] sm:w-[12%]">Time</TableHead>
                  <TableHead className="w-[25%] sm:w-[30%]">Subject</TableHead>
                  <TableHead className="w-[20%] sm:w-[23%]">Teacher</TableHead>
                  <TableHead className="w-[15%] sm:w-[15%]">Room</TableHead>
                  <TableHead className="w-[10%] sm:w-[10%]">Type</TableHead>
                  <TableHead className="text-right w-[15%] sm:w-[10%]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lessonsForDay.map((lesson) => (
                  <TableRow key={lesson.id} className="text-xs sm:text-sm">
                    <TableCell>{lesson.startTime} - {lesson.endTime}</TableCell>
                    <TableCell>{lesson.subjectName}</TableCell>
                    <TableCell>{lesson.teacherName}</TableCell>
                    <TableCell>{lesson.room}</TableCell>
                    <TableCell className="capitalize">{lesson.type}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => onEditLesson(lesson)} 
                        disabled={parentIsLoading} 
                        className="mr-1 h-7 w-7 sm:h-8 sm:w-8"
                        aria-label="Edit lesson"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => onRemoveLesson(lesson.id)} 
                        disabled={parentIsLoading} 
                        className="text-red-500 hover:text-red-600 h-7 w-7 sm:h-8 sm:w-8"
                        aria-label="Remove lesson"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );
      })}
    </div>
  );
};

export default ScheduleView;
