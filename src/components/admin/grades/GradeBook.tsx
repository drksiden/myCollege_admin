import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
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
import { getGrades, createGrade, updateGrade } from '@/lib/firebaseService/gradeService';
import { getUsers } from '@/lib/firebaseService/userService';
import { getAllSubjects } from '@/lib/firebaseService/subjectService';
import { getGroups } from '@/lib/firebaseService/groupService';
import type { Grade, AppUser, Subject, Group, GradeValue, GradeType, JournalEntry } from '@/types';
import { toast } from 'sonner';
import { Timestamp } from 'firebase/firestore';
import { BulkGradeInput } from './BulkGradeInput';
import { exportGradesToExcel } from '@/lib/exportService';
import { exportGradesToPDF } from '@/lib/pdfService';
import GradeImport from './GradeImport';
import { getAllJournals, getJournalEntries } from '@/lib/firebaseService/journalService';

interface GradeBookProps {
  teacherId: string;
}

interface ExportData {
  grades: Grade[];
  students: AppUser[];
  subjects: Subject[];
  groups: Group[];
  selectedGroup: string;
  selectedSubject: string;
  selectedSemesterId: string;
}

export function GradeBook({ teacherId }: GradeBookProps) {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [students, setStudents] = useState<AppUser[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [editingGrade, setEditingGrade] = useState<{ studentId: string; type: GradeType } | null>(null);
  const [gradeValue, setGradeValue] = useState<GradeValue>('5');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [gradesData, studentsData, subjectsData, groupsData, journalsData] = await Promise.all([
        getGrades(),
        getUsers({ role: 'student' }),
        getAllSubjects(),
        getGroups(),
        getAllJournals(),
      ]);

      setGrades(gradesData);
      setStudents(studentsData.users);
      setSubjects(subjectsData);
      setGroups(groupsData);

      // Загружаем записи журналов для каждого журнала
      const journalGrades: Grade[] = [];
      for (const journal of journalsData) {
        const entries = await getJournalEntries(journal.id);
        entries.forEach((entry: JournalEntry) => {
          if (entry.grade) {
            journalGrades.push({
              id: `${journal.id}-${entry.date.toMillis()}-${entry.studentId}`,
              studentId: entry.studentId,
              subjectId: journal.subjectId,
              lessonId: entry.lessonId,
              value: entry.grade,
              type: entry.gradeType || 'current',
              semesterId: journal.semesterId,
              date: entry.date,
              teacherId: journal.teacherId,
              isPublished: true,
              createdAt: entry.createdAt,
              updatedAt: entry.updatedAt,
            });
          }
        });
      }

      // Объединяем оценки из журналов с существующими оценками
      setGrades([...gradesData, ...journalGrades]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  const handleGradeChange = async (studentId: string, type: GradeType, value: GradeValue) => {
    if (!selectedGroup || !selectedSubject || !selectedSemesterId) return;

    try {
      const gradeData = {
        studentId,
        subjectId: selectedSubject,
        lessonId: undefined,
        value,
        type,
        semesterId: selectedSemesterId,
        date: Timestamp.now(),
        teacherId,
        isPublished: true,
      };

      const existingGrade = grades.find(
        g => g.studentId === studentId && 
        g.subjectId === selectedSubject && 
        g.type === type && 
        g.semesterId === selectedSemesterId
      );

      if (existingGrade) {
        await updateGrade(existingGrade.id, gradeData);
      } else {
        await createGrade(gradeData);
      }

      toast.success('Оценка успешно сохранена');
      loadData();
    } catch (error) {
      console.error('Error saving grade:', error);
      toast.error('Ошибка при сохранении оценки');
    }
  };

  const getStudentGrade = (studentId: string, type: GradeType): GradeValue | undefined => {
    return grades.find(
      g => g.studentId === studentId && 
      g.subjectId === selectedSubject && 
      g.type === type && 
      g.semesterId === selectedSemesterId
    )?.value;
  };

  const calculateAverage = (studentId: string): number => {
    const studentGrades = grades.filter(
      g => g.studentId === studentId && 
      g.subjectId === selectedSubject && 
      g.semesterId === selectedSemesterId &&
      // Фильтруем только числовые оценки
      ['5', '4', '3', '2'].includes(g.value)
    );
    
    if (studentGrades.length === 0) return 0;
    
    const sum = studentGrades.reduce((acc, g) => acc + Number(g.value), 0);
    return Number((sum / studentGrades.length).toFixed(2));
  };

  if (loading) {
    return <div>Загрузка...</div>;
  }

  const filteredStudents = students.filter(student => 
    student.role === 'student' && 
    (student as AppUser & { groupId: string }).groupId === selectedGroup
  );

  const exportData: ExportData = {
    grades,
    students,
    subjects,
    groups,
    selectedGroup,
    selectedSubject,
    selectedSemesterId,
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Журнал оценок</h1>
        <div className="flex space-x-4">
          <BulkGradeInput
            students={filteredStudents}
            subjects={subjects}
            groups={groups}
            onSuccess={loadData}
          />
          <Button onClick={() => exportGradesToExcel(exportData)}>
            Экспорт в Excel
          </Button>
          <Button onClick={() => exportGradesToPDF(exportData)}>
            Экспорт в PDF
          </Button>
          <GradeImport
            teacherId={teacherId}
            onSuccess={loadData}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Select value={selectedGroup} onValueChange={setSelectedGroup}>
          <SelectTrigger>
            <SelectValue placeholder="Выберите группу" />
          </SelectTrigger>
          <SelectContent>
            {groups.map(group => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
          <SelectTrigger>
            <SelectValue placeholder="Выберите предмет" />
          </SelectTrigger>
          <SelectContent>
            {subjects.map(subject => (
              <SelectItem key={subject.id} value={subject.id}>
                {subject.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedSemesterId} onValueChange={setSelectedSemesterId}>
          <SelectTrigger>
            <SelectValue placeholder="Выберите семестр" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 семестр</SelectItem>
            <SelectItem value="2">2 семестр</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Студент</TableHead>
            <TableHead>Текущие</TableHead>
            <TableHead>Рубежные</TableHead>
            <TableHead>Экзамены</TableHead>
            <TableHead>Итоговые</TableHead>
            <TableHead>Средний балл</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredStudents.map(student => (
            <TableRow key={student.uid}>
              <TableCell>
                {student.firstName} {student.lastName}
              </TableCell>
              <TableCell>
                {editingGrade?.studentId === student.uid && editingGrade?.type === 'current' ? (
                  <Select
                    value={gradeValue}
                    onValueChange={(value: GradeValue) => {
                      handleGradeChange(student.uid, 'current', value);
                      setEditingGrade(null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="н/а">н/а</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div
                    className="cursor-pointer"
                    onClick={() => {
                      setEditingGrade({ studentId: student.uid, type: 'current' });
                      setGradeValue(getStudentGrade(student.uid, 'current') || '5');
                    }}
                  >
                    {getStudentGrade(student.uid, 'current') || '-'}
                  </div>
                )}
              </TableCell>
              <TableCell>
                {editingGrade?.studentId === student.uid && editingGrade?.type === 'midterm' ? (
                  <Select
                    value={gradeValue}
                    onValueChange={(value: GradeValue) => {
                      handleGradeChange(student.uid, 'midterm', value);
                      setEditingGrade(null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="н/а">н/а</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div
                    className="cursor-pointer"
                    onClick={() => {
                      setEditingGrade({ studentId: student.uid, type: 'midterm' });
                      setGradeValue(getStudentGrade(student.uid, 'midterm') || '5');
                    }}
                  >
                    {getStudentGrade(student.uid, 'midterm') || '-'}
                  </div>
                )}
              </TableCell>
              <TableCell>
                {editingGrade?.studentId === student.uid && editingGrade?.type === 'exam' ? (
                  <Select
                    value={gradeValue}
                    onValueChange={(value: GradeValue) => {
                      handleGradeChange(student.uid, 'exam', value);
                      setEditingGrade(null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="н/а">н/а</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div
                    className="cursor-pointer"
                    onClick={() => {
                      setEditingGrade({ studentId: student.uid, type: 'exam' });
                      setGradeValue(getStudentGrade(student.uid, 'exam') || '5');
                    }}
                  >
                    {getStudentGrade(student.uid, 'exam') || '-'}
                  </div>
                )}
              </TableCell>
              <TableCell>
                {editingGrade?.studentId === student.uid && editingGrade?.type === 'final' ? (
                  <Select
                    value={gradeValue}
                    onValueChange={(value: GradeValue) => {
                      handleGradeChange(student.uid, 'final', value);
                      setEditingGrade(null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="н/а">н/а</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div
                    className="cursor-pointer"
                    onClick={() => {
                      setEditingGrade({ studentId: student.uid, type: 'final' });
                      setGradeValue(getStudentGrade(student.uid, 'final') || '5');
                    }}
                  >
                    {getStudentGrade(student.uid, 'final') || '-'}
                  </div>
                )}
              </TableCell>
              <TableCell>{calculateAverage(student.uid)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 