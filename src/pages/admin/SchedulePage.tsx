import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Group, Subject, Teacher, Schedule } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { getAllSchedules } from '@/services/firestore';

const timeSlots = [
  { start: '08:00', end: '09:30' },
  { start: '09:45', end: '11:15' },
  { start: '11:30', end: '13:00' },
  { start: '13:30', end: '15:00' },
  { start: '15:15', end: '16:45' },
  { start: '17:00', end: '18:30' },
  { start: '18:45', end: '20:15' },
];

const typeLabels = {
  lecture: 'Лекция',
  practice: 'Практика',
  laboratory: 'Лабораторная',
};

const typeColors = {
  lecture: 'bg-blue-100 text-blue-800',
  practice: 'bg-green-100 text-green-800',
  laboratory: 'bg-purple-100 text-purple-800',
};

const DAYS_OF_WEEK = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
];

const SchedulePage: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [groupsSnap, subjectsSnap, teachersSnap, schedulesData] = await Promise.all([
          getDocs(collection(db, 'groups')),
          getDocs(collection(db, 'subjects')),
          getDocs(collection(db, 'teachers')),
          getAllSchedules(),
        ]);
        
        setGroups(groupsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Group[]);
        setSubjects(subjectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Subject[]);
        setTeachers(teachersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Teacher[]);
        setSchedules(schedulesData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Получаем список курсов из групп (только если поле course есть и не undefined/null)
  const courses = Array.from(new Set(groups.map(g => g.course).filter((c): c is number => typeof c === 'number'))).sort((a, b) => a - b);
  const filteredGroups = selectedYear ? groups.filter(g => g.course === selectedYear) : groups;

  const getSubjectName = (subjectId: string) =>
    subjects.find((s) => s.id === subjectId)?.name || '—';
  const getTeacherName = (teacherId: string) => {
    const t = teachers.find((t) => t.id === teacherId);
    if (!t) return '—';
    const lastName = t.lastName || '';
    const firstName = t.firstName || '';
    const middleName = t.middleName || '';
    if (!lastName && !firstName && !middleName) return '—';
    return [lastName, firstName, middleName].filter(Boolean).join(' ');
  };

  // Формируем сетку: [день недели][пара][группа]
  const buildGridData = () => {
    return DAYS_OF_WEEK.map((_, dayIndex) =>
      timeSlots.map((timeSlot) =>
        filteredGroups.map((group) => {
          const schedule = schedules.find(s => s.groupId === group.id);
          if (!schedule) return [];
          
          const cellLessons = schedule.lessons.filter((lesson) =>
            lesson.dayOfWeek === dayIndex + 1 &&
            lesson.startTime === timeSlot.start &&
            lesson.endTime === timeSlot.end
          );
          return cellLessons;
        })
      )
    );
  };

  const exportToExcel = () => {
    const grid = buildGridData();
    const header = ['День', '№ пары', 'Время', ...filteredGroups.map(g => g.name)];
    const data: string[][] = [];
    DAYS_OF_WEEK.forEach((day, dayIdx) => {
      timeSlots.forEach((slot, slotIdx) => {
        const row: string[] = [
          slotIdx === 0 ? day : '', // Только в первой строке дня недели
          (slotIdx + 1).toString(),
          `${slot.start} - ${slot.end}`
        ];
        filteredGroups.forEach((_, groupIdx) => {
          const lessonsInCell = grid[dayIdx][slotIdx][groupIdx];
          row.push(
            lessonsInCell && lessonsInCell.length > 0
              ? lessonsInCell.map(lesson =>
                  [
                    getSubjectName(lesson.subjectId),
                    getTeacherName(lesson.teacherId),
                    lesson.room,
                    typeLabels[lesson.type]
                  ].filter(Boolean).join('\n')
                ).join('\n\n---\n\n')
              : '—'
          );
        });
        data.push(row);
      });
    });
    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    // Ширина столбцов
    const wscols = [
      { wch: 14 }, // День
      { wch: 10 },  // № пары
      { wch: 18 }, // Время
      ...filteredGroups.map(() => ({ wch: 36 })),
    ];
    ws['!cols'] = wscols;
    // Стилизация: заголовок, дни недели, зебра для строк
    const range = XLSX.utils.decode_range(ws['!ref']!);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell_address = { c: C, r: R };
        const cell_ref = XLSX.utils.encode_cell(cell_address);
        if (!ws[cell_ref]) continue;
        if (!ws[cell_ref].s) ws[cell_ref].s = {};
        // Заголовок
        if (R === 0) {
          ws[cell_ref].s = {
            font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 13 },
            fill: { fgColor: { rgb: '2980B9' } },
            border: {
              top: { style: 'thin', color: { rgb: '000000' } },
              bottom: { style: 'thin', color: { rgb: '000000' } },
              left: { style: 'thin', color: { rgb: '000000' } },
              right: { style: 'thin', color: { rgb: '000000' } },
            },
            alignment: { wrapText: true, vertical: 'center', horizontal: 'center' },
          };
        } else if (C === 0 && ws[cell_ref].v) { // День недели
          ws[cell_ref].s = {
            font: { bold: true, color: { rgb: '222222' }, sz: 12 },
            fill: { fgColor: { rgb: 'D6EAF8' } },
            border: {
              top: { style: 'thin', color: { rgb: 'AAAAAA' } },
              bottom: { style: 'thin', color: { rgb: 'AAAAAA' } },
              left: { style: 'thin', color: { rgb: 'AAAAAA' } },
              right: { style: 'thin', color: { rgb: 'AAAAAA' } },
            },
            alignment: { wrapText: true, vertical: 'center', horizontal: 'center' },
          };
        } else {
          // Зебра: разные цвета для чётных/нечётных строк (начиная с первой строки данных)
          const isEvenRow = (R % 2 === 0);
          ws[cell_ref].s = {
            font: { color: { rgb: '222222' }, sz: 12 },
            fill: { fgColor: { rgb: isEvenRow ? 'F4F6F7' : 'EBF5FB' } },
            border: {
              top: { style: 'thin', color: { rgb: 'AAAAAA' } },
              bottom: { style: 'thin', color: { rgb: 'AAAAAA' } },
              left: { style: 'thin', color: { rgb: 'AAAAAA' } },
              right: { style: 'thin', color: { rgb: 'AAAAAA' } },
            },
            alignment: { wrapText: true, vertical: 'center', horizontal: 'center' },
          };
        }
      }
    }
    // Высота строк (SheetJS не поддерживает напрямую, но можно подсказать Excel через ws['!rows'])
    ws['!rows'] = Array(data.length + 1).fill({ hpt: 32 }); // 32pt высота строки
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Расписание');
    XLSX.writeFile(wb, `Расписание.xlsx`);
    // Для расширенной стилизации (цвета, шрифты, заливки) используйте пакет xlsx-style или платные решения.
  };

  const exportToPDF = () => {
    const grid = buildGridData();
    const header = ['День', '№ пары', 'Время', ...filteredGroups.map(g => g.name)];
    const data: string[][] = [];
    DAYS_OF_WEEK.forEach((day, dayIdx) => {
      timeSlots.forEach((slot, slotIdx) => {
        const row: string[] = [day, (slotIdx + 1).toString(), `${slot.start} - ${slot.end}`];
        filteredGroups.forEach((_, groupIdx) => {
          const lessonsInCell = grid[dayIdx][slotIdx][groupIdx];
          row.push(
            lessonsInCell && lessonsInCell.length > 0
              ? lessonsInCell.map(lesson =>
                  `${getSubjectName(lesson.subjectId)}\n${getTeacherName(lesson.teacherId)}\n${lesson.room}\n${typeLabels[lesson.type]}`
                ).join('\n---\n')
              : ''
          );
        });
        data.push(row);
      });
    });
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text(`Расписание`, 14, 15);
    doc.setFontSize(10);
    // Для autoTable типизируем явно:
    type AutoTableType = (options: Record<string, unknown>) => void;
    (doc as unknown as { autoTable: AutoTableType }).autoTable({
      head: [header],
      body: data,
      startY: 30,
      theme: 'grid',
      styles: { cellWidth: 'wrap', fontSize: 9 },
      headStyles: { fillColor: [41, 128, 185] },
    });
    doc.save(`Расписание.pdf`);
  };

  if (loading) {
    return <div className="p-6">Загрузка...</div>;
  }

  const grid = buildGridData();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Общее расписание по группам</h1>
        <div className="flex gap-2 items-center">
          <span>Курс:</span>
          <select
            className="border rounded px-2 py-1"
            value={selectedYear ?? ''}
            onChange={e => setSelectedYear(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Все</option>
            {courses.map(course => (
              <option key={course} value={course}>{course}</option>
            ))}
          </select>
          <button className="btn btn-outline flex items-center gap-2" onClick={exportToExcel}>
            <Download className="w-4 h-4" /> Excel
          </button>
          <button className="btn btn-outline flex items-center gap-2" onClick={exportToPDF}>
            <Download className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Расписание занятий по группам</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto overflow-y-auto max-h-[80vh]">
            <table className="w-full border-collapse text-center">
              <thead>
                <tr>
                  <th className="border p-2 w-24">День</th>
                  <th className="border p-2 w-12">№ пары</th>
                  <th className="border p-2 w-28">Время</th>
                  {filteredGroups.map((group) => (
                    <th key={group.id} className="border p-2">{group.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS_OF_WEEK.map((day, dayIdx) => (
                  timeSlots.map((slot, slotIdx) => (
                    <tr key={day + slot.start}>
                      {slotIdx === 0 ? (
                        <td className="border p-2 font-semibold w-24" rowSpan={timeSlots.length} style={{ verticalAlign: 'middle' }}>
                          {day}
                        </td>
                      ) : null}
                      <td className="border p-2 font-semibold w-12">{slotIdx + 1}</td>
                      <td className="border p-2 font-semibold w-28">{slot.start}<br />{slot.end}</td>
                      {filteredGroups.map((group, groupIdx) => {
                        const lessonsInCell = grid[dayIdx][slotIdx][groupIdx];
                        return (
                          <td key={group.id} className="border p-2 min-w-[120px] align-top">
                            {lessonsInCell && lessonsInCell.length > 0 ? (
                              lessonsInCell.map(lesson => (
                                <div key={lesson.id} className="mb-2 last:mb-0 p-2 rounded bg-card border">
                                  <div className="font-medium">{getSubjectName(lesson.subjectId)}</div>
                                  <div className="text-sm text-muted-foreground">{getTeacherName(lesson.teacherId)}</div>
                                  <div className="text-xs text-muted-foreground">{lesson.room}</div>
                                  <Badge className={typeColors[lesson.type]}>{typeLabels[lesson.type]}</Badge>
                                </div>
                              ))
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SchedulePage;
