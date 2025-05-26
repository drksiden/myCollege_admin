import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { getAllGroups } from '@/lib/firebaseService/groupService';
import { getAllLessons } from '@/lib/firebaseService/lessonService';
import { getAllSubjects } from '@/lib/firebaseService/subjectService';
import { getAllTeachers } from '@/lib/firebaseService/teacherService';
import type { Group, Lesson, Subject, Teacher } from '@/types';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const timeSlots = [
  { start: '08:00', end: '09:30' },
  { start: '09:45', end: '11:15' },
  { start: '11:30', end: '13:00' },
  { start: '13:30', end: '15:00' },
  { start: '15:15', end: '16:45' },
  { start: '17:00', end: '18:30' },
  { start: '18:45', end: '20:15' },
];

const typeLabels: Record<Lesson['type'], string> = {
  lecture: 'Lecture',
  practice: 'Practice',
  laboratory: 'Laboratory'
};

const typeColors: Record<Lesson['type'], string> = {
  lecture: 'bg-blue-100 text-blue-800',
  practice: 'bg-green-100 text-green-800',
  laboratory: 'bg-purple-100 text-purple-800'
};

// Define the type for autoTable options
interface AutoTableOptions {
  head: string[][];
  body: (string | string[])[][];
  startY: number;
  theme: string;
  styles: {
    cellWidth: string;
    fontSize: number;
  };
  headStyles: {
    fillColor: number[];
  };
}

const SchedulePage: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const groupsData = await getAllGroups();
        setGroups(groupsData);
      } catch (error) {
        console.error('Error loading schedule:', error);
        toast.error('Failed to load schedule');
      }
    };
    fetchGroups();
  }, []);

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [subjectsData, teachersData] = await Promise.all([
          getAllSubjects(),
          getAllTeachers(),
        ]);
        setSubjects(subjectsData);
        setTeachers(teachersData);
      } catch (err) {
        console.error('Error fetching meta:', err);
        toast.error('Не удалось загрузить справочники');
      }
    };
    fetchMeta();
  }, []);

  useEffect(() => {
    const fetchLessons = async () => {
      if (!selectedGroup) return;
      try {
        const lessonsData = await getAllLessons(selectedGroup);
        setLessons(lessonsData);
      } catch (error) {
        console.error('Error loading schedule:', error);
        toast.error('Failed to load schedule');
      }
    };
    fetchLessons();
  }, [selectedGroup]);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i));

  const buildGridData = () => {
    return timeSlots.map((timeSlot) =>
      weekDays.map((day) =>
        lessons.filter((lesson: Lesson) => {
          const lessonDay = new Date(lesson.dayOfWeek * 24 * 60 * 60 * 1000);
          return (
            isSameDay(lessonDay, day) &&
            lesson.startTime === timeSlot.start &&
            lesson.endTime === timeSlot.end
          );
        })
      )
    );
  };

  const exportToExcel = () => {
    if (!selectedGroup) return;
    const group = groups.find((g: Group) => g.id === selectedGroup);
    if (!group) return;
    const grid = buildGridData();
    const header = ['Пара/День', ...weekDays.map(day => format(day, 'EEEE', { locale: ru }))];
    const data = grid.map((row, i) => {
      const pairTime = `${timeSlots[i].start} - ${timeSlots[i].end}`;
      return [
        pairTime,
        ...row.map(cellLessons =>
          cellLessons.map(lesson =>
            `${getSubjectName(lesson.subjectId)}\n${getTeacherName(lesson.teacherId)}\n${lesson.room}\n${typeLabels[lesson.type]}`
          ).join('\n---\n')
        )
      ];
    });
    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Расписание');
    XLSX.writeFile(wb, `Расписание_${group.name}.xlsx`);
  };

  const exportToPDF = () => {
    if (!selectedGroup) return;
    const group = groups.find((g: Group) => g.id === selectedGroup);
    if (!group) return;
    const grid = buildGridData();
    const header = ['Пара/День', ...weekDays.map(day => format(day, 'EEEE', { locale: ru }))];
    const data = grid.map((row, i) => {
      const pairTime = `${timeSlots[i].start} - ${timeSlots[i].end}`;
      return [
        pairTime,
        ...row.map(cellLessons =>
          cellLessons.map(lesson =>
            `${getSubjectName(lesson.subjectId)}\n${getTeacherName(lesson.teacherId)}\n${lesson.room}\n${typeLabels[lesson.type]}`
          ).join('\n---\n')
        )
      ];
    });
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text(`Расписание группы ${group.name}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Неделя с ${format(weekStart, 'dd.MM.yyyy', { locale: ru })}`, 14, 22);
    (doc as unknown as { autoTable: (options: AutoTableOptions) => void }).autoTable({
      head: [header],
      body: data,
      startY: 30,
      theme: 'grid',
      styles: { cellWidth: 'wrap', fontSize: 9 },
      headStyles: { fillColor: [41, 128, 185] },
    });
    doc.save(`Расписание_${group.name}.pdf`);
  };

  const getSubjectName = (subjectId: string) => {
    return subjects.find((s: Subject) => s.id === subjectId)?.name || '—';
  };

  const getTeacherName = (teacherId: string) => {
    const t = teachers.find((t: Teacher) => t.id === teacherId);
    return t ? `${t.firstName} ${t.lastName}` : '—';
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Расписание занятий</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToExcel}>
            <Download className="w-4 h-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" onClick={exportToPDF}>
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <Select value={selectedGroup} onValueChange={setSelectedGroup}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Выберите группу" />
          </SelectTrigger>
          <SelectContent>
            {groups.map((group: Group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Calendar
          mode="single"
          selected={currentWeek}
          onSelect={(date) => date && setCurrentWeek(date)}
          className="rounded-md border"
        />
      </div>

      {selectedGroup && (
        <Card>
          <CardHeader>
            <CardTitle>
              Расписание группы {groups.find((g: Group) => g.id === selectedGroup)?.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-center">
                <thead>
                  <tr>
                    <th className="border p-2">Время</th>
                    {weekDays.map(day => (
                      <th key={day.toISOString()} className="border p-2">
                        {format(day, 'EEEE', { locale: ru })}<br />{format(day, 'dd.MM.yyyy')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((timeSlot, i) => (
                    <tr key={i}>
                      <td className="border p-2 font-semibold">
                        {timeSlot.start}<br />{timeSlot.end}
                      </td>
                      {weekDays.map((day, j) => {
                        const cellLessons = lessons.filter((lesson: Lesson) => {
                          const lessonDay = new Date(lesson.dayOfWeek * 24 * 60 * 60 * 1000);
                          return (
                            isSameDay(lessonDay, day) &&
                            lesson.startTime === timeSlot.start &&
                            lesson.endTime === timeSlot.end
                          );
                        });
                        return (
                          <td key={j} className="border p-2 min-w-[120px] align-top">
                            {cellLessons.length === 0 ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              cellLessons.map(lesson => (
                                <div key={lesson.id} className="mb-2 last:mb-0 p-2 rounded bg-card border">
                                  <div className="font-medium">{getSubjectName(lesson.subjectId)}</div>
                                  <div className="text-sm text-muted-foreground">{getTeacherName(lesson.teacherId)}</div>
                                  <div className="text-xs text-muted-foreground">{lesson.room}</div>
                                  <Badge className={typeColors[lesson.type]}>{typeLabels[lesson.type]}</Badge>
                                </div>
                              ))
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SchedulePage; 