import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getGroups, getGroupSubjects } from '@/lib/firebaseService/groupService';
import { getAllSubjects } from '@/lib/firebaseService/subjectService';
import { getUsers } from '@/lib/firebaseService/userService';
import { getJournalEntries } from '@/lib/firebaseService/journalService';
import { getSemesters } from '@/lib/firebaseService/semesterService';
import type { Group, Subject, StudentUser, JournalEntry, Semester } from '@/types';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { collection, query, where, getDocs, and } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function AttendancePage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<StudentUser[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [groupSubjects, setGroupSubjects] = useState<string[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      loadGroupSubjects();
    } else {
      setGroupSubjects([]);
      setSelectedSubject('');
    }
  }, [selectedGroup]);

  useEffect(() => {
    if (selectedSubject && selectedGroup && selectedSemesterId) {
      loadJournal();
    } else {
      setEntries([]);
    }
  }, [selectedSubject, selectedGroup, selectedSemesterId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [groupsData, subjectsData, studentsData, semestersData] = await Promise.all([
        getGroups(),
        getAllSubjects(),
        getUsers({ role: 'student' }),
        getSemesters(),
      ]);

      setGroups(groupsData);
      setSubjects(subjectsData);
      setStudents(studentsData.users as StudentUser[]);
      setSemesters(semestersData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  const loadGroupSubjects = async () => {
    try {
      setLoadingSubjects(true);
      const subjects = await getGroupSubjects(selectedGroup);
      setGroupSubjects(subjects);
    } catch (error) {
      console.error('Error loading group subjects:', error);
      toast.error('Не удалось загрузить предметы группы');
    } finally {
      setLoadingSubjects(false);
    }
  };

  const loadJournal = async () => {
    try {
      // Ищем журнал для выбранной группы, предмета и семестра
      const journalsRef = collection(db, 'journals');
      const q = query(
        journalsRef,
        and(
          where('groupId', '==', selectedGroup),
          where('subjectId', '==', selectedSubject),
          where('semesterId', '==', selectedSemesterId)
        )
      );
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setEntries([]);
        return;
      }

      const journalDoc = querySnapshot.docs[0];
      const entriesData = await getJournalEntries(journalDoc.id);
      setEntries(entriesData);
    } catch (error) {
      console.error('Error loading journal:', error);
      toast.error('Не удалось загрузить данные журнала');
    }
  };

  const handleYearChange = (year: string) => {
    setSelectedYear(parseInt(year));
    setSelectedGroup('');
    setSelectedSubject('');
    setSelectedSemesterId('');
  };

  const handleGroupChange = (groupId: string) => {
    setSelectedGroup(groupId);
    setSelectedSubject('');
    setSelectedSemesterId('');
  };

  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubject(subjectId);
    setSelectedSemesterId('');
  };

  const handleSemesterChange = (semesterId: string) => {
    setSelectedSemesterId(semesterId);
  };

  const getFilteredGroups = () => {
    if (!selectedYear) return groups;
    return groups.filter(group => group.year === selectedYear);
  };

  const getAvailableYears = () => {
    const years = new Set(groups.map(group => group.year).filter((year): year is number => year !== undefined));
    return Array.from(years).sort();
  };

  const getGroupStudents = () => {
    if (!selectedGroup) return [];
    return students.filter(student => student.groupId === selectedGroup);
  };

  const getStudentEntries = (studentId: string) => {
    return entries.filter(entry => entry.studentId === studentId);
  };

  const getFilteredSubjects = () => {
    if (!selectedGroup || groupSubjects.length === 0) return [];
    return subjects.filter(subject => groupSubjects.includes(subject.id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Посещаемость</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Учет посещаемости студентов
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
          <CardDescription>
            Выберите курс, группу, предмет и семестр для просмотра посещаемости
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="year">Курс</Label>
              <Select
                value={selectedYear?.toString() || ''}
                onValueChange={handleYearChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите курс" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableYears().map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year} курс
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="group">Группа</Label>
              <Select
                value={selectedGroup}
                onValueChange={handleGroupChange}
                disabled={!selectedYear}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите группу" />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-[200px]">
                    {getFilteredGroups().map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Предмет</Label>
              <Select
                value={selectedSubject}
                onValueChange={handleSubjectChange}
                disabled={!selectedGroup || loadingSubjects}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите предмет" />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-[200px]">
                    {loadingSubjects ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : getFilteredSubjects().length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground text-center">
                        Нет доступных предметов
                      </div>
                    ) : (
                      getFilteredSubjects().map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))
                    )}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="semester">Семестр</Label>
              <Select
                value={selectedSemesterId}
                onValueChange={handleSemesterChange}
                disabled={!selectedSubject}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите семестр" />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-[200px]">
                    {semesters.map((semester) => (
                      <SelectItem key={semester.id} value={semester.id}>
                        {semester.name}
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedGroup && selectedSubject && selectedSemesterId && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Список студентов</CardTitle>
            <CardDescription>
              Посещаемость студентов группы {groups.find(g => g.id === selectedGroup)?.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ФИО</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Посещаемость</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getGroupStudents().map((student) => {
                    const studentEntries = getStudentEntries(student.uid);
                    const presentCount = studentEntries.filter(e => e.present).length;
                    const totalCount = studentEntries.length;
                    const attendanceRate = totalCount > 0 ? (presentCount / totalCount) * 100 : 0;

                    return (
                      <TableRow key={student.uid}>
                        <TableCell className="font-medium">
                          {`${student.lastName} ${student.firstName} ${student.middleName || ''}`}
                        </TableCell>
                        <TableCell>{student.email}</TableCell>
                        <TableCell>
                          {totalCount > 0 ? (
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-primary h-2 rounded-full"
                                  style={{ width: `${attendanceRate}%` }}
                                />
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {attendanceRate.toFixed(1)}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Нет данных</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${student.status === 'active' ? 'bg-green-100 text-green-800' :
                              student.status === 'suspended' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'}`}>
                            {student.status === 'active' ? 'Активен' :
                             student.status === 'suspended' ? 'Неактивен' :
                             'Ожидает подтверждения'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {}}
                          >
                            Просмотр деталей
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 