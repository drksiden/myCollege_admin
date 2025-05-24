import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { Schedule, Lesson } from '@/types';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface ScheduleExportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: Schedule;
  subjects: { id: string; name: string }[];
  teachers: { id: string; firstName: string; lastName: string }[];
}

interface TableData {
  day: string;
  time: string;
  subject: string;
  teacher: string;
  room: string;
  type: string;
}

const ScheduleExport: React.FC<ScheduleExportProps> = ({
  open,
  onOpenChange,
  schedule,
  subjects,
  teachers,
}) => {
  const [fileName, setFileName] = React.useState('');

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      const subjectMap = new Map(subjects.map(s => [s.id, s.name]));
      const teacherMap = new Map(teachers.map(t => [t.id, `${t.firstName} ${t.lastName}`.trim()]));

      // Подготовка данных для таблицы
      const tableData: TableData[] = schedule.lessons.map(lesson => ({
        day: getDayName(lesson.dayOfWeek),
        time: `${lesson.startTime} - ${lesson.endTime}`,
        subject: subjectMap.get(lesson.subjectId) || 'Неизвестный предмет',
        teacher: teacherMap.get(lesson.teacherId) || 'Неизвестный преподаватель',
        room: lesson.room,
        type: getLessonType(lesson.type),
      }));

      // Сортировка по дню недели и времени
      tableData.sort((a, b) => {
        const dayOrder = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
        const dayComparison = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
        if (dayComparison !== 0) return dayComparison;
        return a.time.localeCompare(b.time);
      });

      // Добавление заголовка
      doc.setFontSize(16);
      doc.text('Расписание', 14, 15);
      doc.setFontSize(12);
      doc.text(`Группа: ${schedule.groupId}`, 14, 25);
      doc.text(`Семестр: ${schedule.semester}`, 14, 35);
      doc.text(`Год: ${schedule.year}`, 14, 45);

      // Добавление таблицы
      (doc as jsPDF & { autoTable: (options: unknown) => void }).autoTable({
        startY: 55,
        head: [['День', 'Время', 'Предмет', 'Преподаватель', 'Аудитория', 'Тип']],
        body: tableData.map(row => [
          row.day,
          row.time,
          row.subject,
          row.teacher,
          row.room,
          row.type,
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] },
      });

      // Сохранение файла
      const finalFileName = fileName.trim() || `schedule_${schedule.groupId}_${schedule.semester}_${schedule.year}`;
      doc.save(`${finalFileName}.pdf`);
      toast.success('Расписание успешно экспортировано');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to export schedule:', error);
      toast.error('Не удалось экспортировать расписание');
    }
  };

  const getDayName = (dayNumber: number): string => {
    const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
    return days[dayNumber - 1] || 'Неизвестный день';
  };

  const getLessonType = (type: Lesson['type']): string => {
    switch (type) {
      case 'lecture':
        return 'Лекция';
      case 'practice':
        return 'Практика';
      case 'laboratory':
        return 'Лабораторная';
      default:
        return 'Неизвестный тип';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Экспорт расписания</DialogTitle>
          <DialogDescription>
            Экспортируйте расписание в PDF формат
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fileName">Название файла (необязательно)</Label>
            <Input
              id="fileName"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="Введите название файла"
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Отмена
            </Button>
          </DialogClose>
          <Button onClick={exportToPDF}>Экспортировать</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleExport; 