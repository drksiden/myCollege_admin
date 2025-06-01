import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LessonFormDialog } from './LessonFormDialog';
import { getAllSubjects } from '@/lib/firebaseService/subjectService';
import { getUsers } from '@/lib/firebaseService/userService';
import { getGroupSchedule } from '@/lib/firebaseService/scheduleService';
import { toast } from 'sonner';

interface ScheduleViewProps {
  groupId: string;
  semesterId: string;
}

const ScheduleView: React.FC<ScheduleViewProps> = ({ groupId, semesterId }) => {
  // TODO: Uncomment when implementing schedule display
  // const [lessons, setLessons] = useState<Lesson[]>([]);
  // const [subjects, setSubjects] = useState<Subject[]>([]);
  // const [teachers, setTeachers] = useState<TeacherUser[]>([]);
  const [isLessonFormOpen, setIsLessonFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        await Promise.all([
          getGroupSchedule({ groupId, semesterId }),
          getAllSubjects(),
          getUsers({ role: 'teacher' })
        ]);
        // TODO: Set the loaded data to state when schedule display is implemented
        toast.success("Данные загружены");
      } catch (error) {
        console.error('Error loading schedule data:', error);
        toast.error("Не удалось загрузить данные расписания");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [groupId, semesterId]);

  const handleLessonSaved = async () => {
    setIsLessonFormOpen(false);
    
    try {
      await getGroupSchedule({ groupId, semesterId });
      // TODO: Update schedule display when implemented
      toast.success("Занятие сохранено");
    } catch (error) {
      console.error('Error reloading lessons:', error);
      toast.error("Не удалось обновить расписание");
    }
  };

  if (loading) {
    return <div>Загрузка...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Расписание занятий</CardTitle>
          <Button onClick={() => setIsLessonFormOpen(true)}>
            Добавить занятие
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* TODO: Добавить отображение расписания */}
      </CardContent>

      <LessonFormDialog
        open={isLessonFormOpen}
        onOpenChange={setIsLessonFormOpen}
        groupId={groupId}
        semesterId={semesterId}
        onSuccess={handleLessonSaved}
      />
    </Card>
  );
};

export default ScheduleView;
