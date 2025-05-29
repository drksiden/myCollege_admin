import { useState, useEffect, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getGroups } from '@/lib/firebaseService/groupService';
import { getSubjects } from '@/lib/firebaseService/subjectService';
import { getAllJournals } from '@/lib/firebaseService/journalService';
import { getStudents } from '@/lib/firebaseService/studentService';
import { getUsersFromFirestore } from '@/lib/firebaseService/userService';
import type { Group, Subject, Student, User, Journal } from '@/types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Timestamp } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';

type AttendanceEntry = {
  studentId: string;
  date: Timestamp;
  attendance: string;
  groupId: string;
  subjectId: string;
  semester: number;
};

export default function AttendancePage() {
  const [attendanceEntries, setAttendanceEntries] = useState<AttendanceEntry[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Фильтры
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [groupsData, subjectsData, journalsData, studentsData, usersData] = await Promise.all([
        getGroups(),
        getSubjects(),
        getAllJournals(),
        getStudents(),
        getUsersFromFirestore(),
      ]);

      setGroups(groupsData);
      setSubjects(subjectsData);
      setStudents(studentsData);
      setUsers(usersData);

      // Обрабатываем данные из журналов для получения посещаемости
      const entries: AttendanceEntry[] = [];
      journalsData.forEach(journal => {
        if (journal.entries && Array.isArray(journal.entries)) {
          journal.entries.forEach(entry => {
            if (entry.attendance && Array.isArray(entry.attendance)) {
              entry.attendance.forEach(attendance => {
                entries.push({
                  studentId: attendance.studentId,
                  date: entry.date,
                  attendance: attendance.status,
                  groupId: journal.groupId,
                  subjectId: journal.subjectId,
                  semester: journal.semester,
                });
              });
            }
          });
        }
      });

      setAttendanceEntries(entries);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Получить студентов выбранной группы и отсортировать по фамилии
  const filteredStudents = useMemo(() => {
    if (!selectedGroup || selectedGroup === 'all') return [];
    const groupStudents = students.filter(s => s.groupId === selectedGroup);
    return groupStudents.slice().sort((a, b) => {
      const userA = users.find(u => u.id === a.userId || u.uid === a.userId);
      const userB = users.find(u => u.id === b.userId || u.uid === b.userId);
      const lastA = userA?.lastName?.toLowerCase() || userA?.firstName?.toLowerCase() || '';
      const lastB = userB?.lastName?.toLowerCase() || userB?.firstName?.toLowerCase() || '';
      return lastA.localeCompare(lastB);
    });
  }, [students, selectedGroup, users]);

  // Получить все даты, где есть посещаемость по фильтрам
  const filteredDates = useMemo(() => {
    if ([selectedGroup, selectedSubject, selectedSemester].includes('all')) return [];
    const datesSet = new Set<string>();
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    attendanceEntries.forEach(entry => {
      if (
        entry.groupId === selectedGroup &&
        entry.subjectId === selectedSubject &&
        String(entry.semester) === selectedSemester &&
        entry.date &&
        typeof entry.attendance === 'string'
      ) {
        const d = format(entry.date.toDate(), 'yyyy-MM-dd');
        const dateObj = entry.date.toDate();
        if (dateObj >= start && dateObj <= end) {
          datesSet.add(d);
        }
      }
    });
    return Array.from(datesSet).sort();
  }, [attendanceEntries, selectedGroup, selectedSubject, selectedSemester, dateRange]);

  // Получить посещаемость для таблицы: { [studentId]: { [date]: attendance } }
  const attendanceByStudent: Record<string, Record<string, string | undefined>> = useMemo(() => {
    const map: Record<string, Record<string, string | undefined>> = {};
    filteredStudents.forEach(s => {
      map[s.id] = {};
    });
    attendanceEntries.forEach(entry => {
      if (
        entry.groupId === selectedGroup &&
        entry.subjectId === selectedSubject &&
        String(entry.semester) === selectedSemester &&
        entry.date &&
        typeof entry.attendance === 'string'
      ) {
        const d = format(entry.date.toDate(), 'yyyy-MM-dd');
        if (map[entry.studentId]) map[entry.studentId][d] = entry.attendance;
      }
    });
    return map;
  }, [attendanceEntries, filteredStudents, selectedGroup, selectedSubject, selectedSemester]);

  const getStudentName = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return studentId;
    const user = users.find(u => u.id === student.userId || u.uid === student.userId);
    if (!user) return studentId;
    return `${user.lastName || ''} ${user.firstName || ''}`.trim();
  };

  // Функция для отображения статуса посещаемости (можно заменить на иконки/цвета)
  const renderAttendance = (status: string | undefined) => {
    if (!status) return '';
    if (status === 'present') return 'П';
    if (status === 'absent') return 'Н';
    if (status === 'late') return 'О';
    if (status === 'excused') return 'У';
    return status;
  };

  const handleExportExcel = () => {
    const header = ['Студент', ...filteredDates];
    const data = filteredStudents.map(student => {
      const row = [getStudentName(student.id)];
      filteredDates.forEach(date => {
        row.push(attendanceByStudent[student.id]?.[date] ?? '');
      });
      return row;
    });
    const worksheet = XLSX.utils.aoa_to_sheet([header, ...data]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Посещаемость');
    XLSX.writeFile(workbook, 'attendance.xlsx');
  };

  if (loading) {
    return <div>Загрузка...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select
              value={selectedGroup}
              onValueChange={setSelectedGroup}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите группу" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все группы</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedSubject}
              onValueChange={setSelectedSubject}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите предмет" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все предметы</SelectItem>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedSemester}
              onValueChange={setSelectedSemester}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите семестр" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все семестры</SelectItem>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                  <SelectItem key={sem} value={sem.toString()}>
                    {sem} семестр
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <input
                type="date"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              />
              <input
                type="date"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
          </div>
          <Button onClick={handleExportExcel} className="mt-4">Экспорт в Excel</Button>
        </CardContent>
      </Card>

      {(selectedGroup !== 'all' && selectedSubject !== 'all' && selectedSemester !== 'all') ? (
        <>
          <div className="mb-4">
            <span className="font-semibold">Группа:</span> {groups.find(g => g.id === selectedGroup)?.name || '-'} &nbsp;
            <span className="font-semibold">Предмет:</span> {subjects.find(s => s.id === selectedSubject)?.name || '-'} &nbsp;
            <span className="font-semibold">Семестр:</span> {selectedSemester}
          </div>
          <div className="overflow-x-auto">
            <Table className="min-w-fit border border-border ml-2">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center border border-border w-10">№</TableHead>
                  <TableHead className="text-center border border-border w-40">Студент</TableHead>
                  {filteredDates.map(date => (
                    <TableHead key={date} className="text-center border border-border min-w-[90px]">{format(new Date(date), 'dd.MM.yyyy')}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student, idx) => (
                  <TableRow key={student.id}>
                    <TableCell className="text-center border border-border w-10">{idx + 1}</TableCell>
                    <TableCell className="text-center border border-border w-40">{getStudentName(student.id)}</TableCell>
                    {filteredDates.map(date => (
                      <TableCell key={date} className="text-center border border-border min-w-[90px]">
                        {renderAttendance(attendanceByStudent[student.id]?.[date])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      ) : (
        <div className="text-muted-foreground text-center py-8">Выберите группу, предмет и семестр для просмотра посещаемости</div>
      )}
    </div>
  );
} 