import { useState, useEffect, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getAllJournals } from '@/lib/firebaseService/journalService';
import { getStudents } from '@/lib/firebaseService/studentService';
import { getSubjects } from '@/lib/firebaseService/subjectService';
import { getGroups } from '@/lib/firebaseService/groupService';
import { getUsersFromFirestore } from '@/lib/firebaseService/userService';
import type { Student, Subject, Group, User, Journal } from '@/types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Timestamp } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Helmet } from 'react-helmet';

type GradeEntry = {
  studentId: string;
  date: Timestamp;
  grade: number;
  groupId: string;
  subjectId: string;
  semester: number;
};

type JournalEntry = {
  date: Timestamp;
  topic: string;
  homework?: string;
  notes?: string;
  attendance?: Array<{
    studentId: string;
    status: 'present' | 'absent' | 'late' | 'excused';
  }>;
  studentId?: string;
  grade?: number;
};

export default function GradesPage() {
  const [gradeEntries, setGradeEntries] = useState<GradeEntry[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
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
      const [journals, studentsData, subjectsData, groupsData, usersData] = await Promise.all([
        getAllJournals(),
        getStudents(),
        getSubjects(),
        getGroups(),
        getUsersFromFirestore(),
      ]);
      setStudents(studentsData);
      setSubjects(subjectsData);
      setGroups(groupsData);
      setUsers(usersData);
      // Собрать все entries с grade из массива journal.entries (только новая структура)
      const allGrades: GradeEntry[] = journals.flatMap((j: Journal) =>
        (j.entries || [])
          .filter((e: JournalEntry) => 
            e.studentId && 
            e.date && 
            typeof e.grade === 'number'
          )
          .map((e: JournalEntry) => ({
            studentId: e.studentId!,
            grade: e.grade!,
            date: e.date,
            groupId: j.groupId,
            subjectId: j.subjectId,
            semester: j.semester,
          }))
      );
      setGradeEntries(allGrades);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      toast.error('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  // Получить студентов выбранной группы и отсортировать по фамилии
  const filteredStudents = useMemo(() => {
    if (!selectedGroup || selectedGroup === 'all') return [];
    const groupStudents = students.filter(s => s.groupId === selectedGroup);
    // Сопоставить user для сортировки
    return groupStudents.slice().sort((a, b) => {
      const userA = users.find(u => u.id === a.userId || u.uid === a.userId);
      const userB = users.find(u => u.id === b.userId || u.uid === b.userId);
      const lastA = userA?.lastName?.toLowerCase() || userA?.firstName?.toLowerCase() || '';
      const lastB = userB?.lastName?.toLowerCase() || userB?.firstName?.toLowerCase() || '';
      return lastA.localeCompare(lastB);
    });
  }, [students, selectedGroup, users]);

  // Получить все даты, где есть оценки по фильтрам
  const filteredDates = useMemo(() => {
    if ([selectedGroup, selectedSubject, selectedSemester].includes('all')) return [];
    const datesSet = new Set<string>();
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    gradeEntries.forEach(entry => {
      if (
        entry.groupId === selectedGroup &&
        entry.subjectId === selectedSubject &&
        String(entry.semester) === selectedSemester &&
        entry.date &&
        typeof entry.grade === 'number'
      ) {
        const d = format(entry.date.toDate(), 'yyyy-MM-dd');
        const dateObj = entry.date.toDate();
        if (dateObj >= start && dateObj <= end) {
          datesSet.add(d);
        }
      }
    });
    return Array.from(datesSet).sort();
  }, [gradeEntries, selectedGroup, selectedSubject, selectedSemester, dateRange]);

  // Получить оценки для таблицы: { [studentId]: { [date]: grade } }
  const gradesByStudent: Record<string, Record<string, number | undefined>> = useMemo(() => {
    const map: Record<string, Record<string, number | undefined>> = {};
    filteredStudents.forEach(s => {
      map[s.id] = {};
    });
    gradeEntries.forEach(entry => {
      if (
        entry.groupId === selectedGroup &&
        entry.subjectId === selectedSubject &&
        String(entry.semester) === selectedSemester &&
        entry.date &&
        typeof entry.grade === 'number'
      ) {
        const d = format(entry.date.toDate(), 'yyyy-MM-dd');
        if (map[entry.studentId]) map[entry.studentId][d] = entry.grade;
      }
    });
    return map;
  }, [gradeEntries, filteredStudents, selectedGroup, selectedSubject, selectedSemester]);

  const getStudentName = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return studentId;
    const user = users.find(u => u.id === student.userId || u.uid === student.userId);
    if (!user) return studentId;
    return `${user.lastName || ''} ${user.firstName || ''}`.trim();
  };

  const handleExportExcel = () => {
    const header = ['Студент', ...filteredDates];
    const data = filteredStudents.map(student => {
      const row = [getStudentName(student.id)];
      filteredDates.forEach(date => {
        row.push(String(gradesByStudent[student.id]?.[date] ?? ''));
      });
      return row;
    });
    const worksheet = XLSX.utils.aoa_to_sheet([header, ...data]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Оценки');
    XLSX.writeFile(workbook, 'grades.xlsx');
  };

  if (loading) {
    return <div>Загрузка...</div>;
  }

  return (
    <>
      <Helmet>
        <title>MyCollegeAdmin</title>
      </Helmet>
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
                          {gradesByStudent[student.id]?.[date] ?? ''}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          <div className="text-muted-foreground text-center py-8">Выберите группу, предмет и семестр для просмотра журнала</div>
        )}
      </div>
    </>
  );
} 