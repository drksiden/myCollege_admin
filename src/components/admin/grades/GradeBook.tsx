import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getGrades } from '@/lib/firebaseService/gradeService';
import { getUsers } from '@/lib/firebaseService/userService';
import { getAllSubjects } from '@/lib/firebaseService/subjectService';
import type { Grade, AppUser, Subject } from '@/types';
import { Download, BarChart2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

interface GradeBookProps {
  selectedGroup: string;
  selectedSubject: string;
  selectedSemesterId: string;
}

export function GradeBook({ selectedGroup, selectedSubject, selectedSemesterId }: GradeBookProps) {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [students, setStudents] = useState<AppUser[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line
  }, [selectedGroup, selectedSubject, selectedSemesterId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, subjectsData] = await Promise.all([
        getUsers({ groupId: selectedGroup, role: 'student' }),
        getAllSubjects(),
      ]);
      setStudents(usersData.users);
      setSubjects(subjectsData);
      // Получаем оценки только для студентов этой группы
      const studentIds = usersData.users.map((u) => u.uid);
      const gradesData = await getGrades({
        studentIds,
        subjectId: selectedSubject,
        semesterId: selectedSemesterId,
      });
      setGrades(gradesData);
    } catch {
      setGrades([]);
      setStudents([]);
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  // Фильтруем оценки по выбранному предмету и семестру (на всякий случай)
  const filteredGrades = grades.filter(g =>
    (!selectedSubject || g.subjectId === selectedSubject) &&
    (!selectedSemesterId || g.semesterId === selectedSemesterId)
  );

  const getStudentGrades = (studentId: string) => {
    return filteredGrades.filter(g => g.studentId === studentId);
  };

  const getGradeStats = (studentId: string) => {
    const studentGrades = getStudentGrades(studentId);
    const total = studentGrades.length;
    const excellent = studentGrades.filter(g => Number(g.value) >= 5).length;
    const good = studentGrades.filter(g => Number(g.value) === 4).length;
    const satisfactory = studentGrades.filter(g => Number(g.value) === 3).length;
    const unsatisfactory = studentGrades.filter(g => Number(g.value) < 3).length;
    return {
      total,
      excellent,
      good,
      satisfactory,
      unsatisfactory,
      average: total ? (studentGrades.reduce((sum, g) => sum + Number(g.value), 0) / total).toFixed(2) : '0'
    };
  };

  // Групповая статистика только по выбранному предмету и семестру
  const getGroupStats = () => {
    const stats = {
      totalStudents: students.length,
      totalGrades: filteredGrades.length,
      averageGrade: 0,
      gradeDistribution: {
        excellent: 0,
        good: 0,
        satisfactory: 0,
        unsatisfactory: 0
      },
      subjectStats: new Map<string, {
        average: number,
        total: number,
        distribution: { [key: string]: number }
      }>()
    };
    students.forEach(student => {
      const studentGrades = getStudentGrades(student.uid);
      studentGrades.forEach(grade => {
        const value = Number(grade.value);
        stats.averageGrade += value;
        if (value >= 5) stats.gradeDistribution.excellent++;
        else if (value === 4) stats.gradeDistribution.good++;
        else if (value === 3) stats.gradeDistribution.satisfactory++;
        else stats.gradeDistribution.unsatisfactory++;
        if (!stats.subjectStats.has(grade.subjectId)) {
          stats.subjectStats.set(grade.subjectId, {
            average: 0,
            total: 0,
            distribution: { excellent: 0, good: 0, satisfactory: 0, unsatisfactory: 0 }
          });
        }
        const subjectStat = stats.subjectStats.get(grade.subjectId)!;
        subjectStat.average += value;
        subjectStat.total++;
        if (value >= 5) subjectStat.distribution.excellent++;
        else if (value === 4) subjectStat.distribution.good++;
        else if (value === 3) subjectStat.distribution.satisfactory++;
        else subjectStat.distribution.unsatisfactory++;
      });
    });
    if (stats.totalGrades > 0) {
      stats.averageGrade = Number((stats.averageGrade / stats.totalGrades).toFixed(2));
      stats.subjectStats.forEach(stat => {
        stat.average = Number((stat.average / stat.total).toFixed(2));
      });
    }
    return stats;
  };

  const exportToExcel = () => {
    const data = students.map(student => {
      const studentGrades = getStudentGrades(student.uid);
      const stats = getGradeStats(student.uid);
      return {
        'ФИО': `${student.lastName} ${student.firstName} ${student.middleName}`,
        'Средний балл': stats.average,
        'Всего оценок': stats.total,
        'Отлично': stats.excellent,
        'Хорошо': stats.good,
        'Удовлетворительно': stats.satisfactory,
        'Неудовлетворительно': stats.unsatisfactory,
        'Оценки': studentGrades.map(g => g.value).join(', '),
        'Даты': studentGrades.map(g => {
          if (g.date && typeof g.date.toDate === 'function') return g.date.toDate().toLocaleDateString();
          if (g.date instanceof Date) return g.date.toLocaleDateString();
          return '';
        }).join(', '),
        'Комментарии': studentGrades.map(g => g.comment).join('; ')
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Оценки');
    XLSX.writeFile(wb, 'Оценки.xlsx');
  };

  const getGradeDistributionData = (distribution: { [key: string]: number }) => {
    return [
      { name: 'Отлично', value: distribution.excellent },
      { name: 'Хорошо', value: distribution.good },
      { name: 'Удовлетворительно', value: distribution.satisfactory },
      { name: 'Неудовлетворительно', value: distribution.unsatisfactory }
    ];
  };

  const getSubjectStatsData = (stats: ReturnType<typeof getGroupStats>) => {
    return Array.from(stats.subjectStats.entries()).map(([subjectId, stat]) => {
      const subject = subjects.find(s => s.id === subjectId);
      return {
        name: subject?.name || 'Неизвестный предмет',
        average: stat.average,
        total: stat.total
      };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Журнал оценок</h2>
        <div className="flex space-x-4">
          <Button onClick={exportToExcel}>
            <Download className="w-4 h-4 mr-2" />
            Экспорт в Excel
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Студент</TableHead>
              <TableHead>Средний балл</TableHead>
              <TableHead>Оценки</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => {
              const stats = getGradeStats(student.uid);
              return (
                <TableRow key={student.uid}>
                  <TableCell>
                    {student.lastName} {student.firstName} {student.middleName}
                  </TableCell>
                  <TableCell>{stats.average}</TableCell>
                  <TableCell>
                    {getStudentGrades(student.uid).map(g => g.value).join(', ')}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 