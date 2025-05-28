import React, { useEffect, useState } from 'react';
import type { Group, Subject, Teacher, Schedule } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { getAllSchedules } from '@/services/firestore';
import { getAllGroups } from '@/lib/firebaseService/groupService';
import { getAllSubjects } from '@/lib/firebaseService/subjectService';
import { getAllTeachers } from '@/lib/firebaseService/teacherService';

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
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [groupsData, subjectsData, teachersData, schedulesData] = await Promise.all([
          getAllGroups(),
          getAllSubjects(),
          getAllTeachers(),
          getAllSchedules(),
        ]);
        
        setGroups(groupsData);
        setSubjects(subjectsData);
        setTeachers(teachersData);
        setSchedules(schedulesData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Получаем список курсов из групп
  const courses = Array.from(new Set(groups.map(g => g.course).filter((c): c is number => typeof c === 'number'))).sort((a, b) => a - b);
  
  // Фильтруем группы по выбранному курсу
  const filteredGroups = selectedYear ? groups.filter(g => g.course === selectedYear) : groups;

  // Фильтруем расписания по выбранному семестру
  const filteredSchedules = selectedSemester 
    ? schedules.filter(s => s.semester === selectedSemester)
    : schedules;

  const getSubjectName = (subjectId: string) =>
    subjects.find((s) => s.id === subjectId)?.name || '—';

  const getTeacherName = (teacherId: string) => {
    const teacher = teachers.find((t) => t.id === teacherId);
    return teacher ? `${teacher.firstName} ${teacher.lastName}` : '—';
  };

  const getGroupSchedule = (groupId: string) => {
    return filteredSchedules.find(s => s.groupId === groupId);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /> <span className="ml-2">Loading schedules...</span></div>;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Расписание занятий по группам</CardTitle>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Курс:</span>
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
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Семестр:</span>
                <select
                  className="border rounded px-2 py-1"
                  value={selectedSemester ?? ''}
                  onChange={e => setSelectedSemester(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">Все</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                </select>
              </div>
            </div>
          </div>
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
                {DAYS_OF_WEEK.map((day, dayIndex) => (
                  timeSlots.map((timeSlot, timeIndex) => (
                    <tr key={`${day}-${timeIndex}`}>
                      {timeIndex === 0 && (
                        <td rowSpan={timeSlots.length} className="border p-2 align-middle">
                          {day}
                        </td>
                      )}
                      <td className="border p-2">{timeIndex + 1}</td>
                      <td className="border p-2">
                        {timeSlot.start}<br />{timeSlot.end}
                      </td>
                      {filteredGroups.map((group) => {
                        const schedule = getGroupSchedule(group.id);
                        const lesson = schedule?.lessons.find(l => 
                          l.dayOfWeek === dayIndex + 1 && 
                          l.startTime === timeSlot.start && 
                          l.endTime === timeSlot.end
                        );

                        return (
                          <td key={group.id} className="border p-2">
                            {lesson ? (
                              <div className="p-2 rounded">
                                <div className="font-medium">{getSubjectName(lesson.subjectId)}</div>
                                <div className="text-sm text-muted-foreground">{getTeacherName(lesson.teacherId)}</div>
                                <div className="text-xs text-muted-foreground">{lesson.room}</div>
                                <Badge className={typeColors[lesson.type]}>{typeLabels[lesson.type]}</Badge>
                              </div>
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
