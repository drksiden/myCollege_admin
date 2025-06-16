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
import type { Grade, AppUser } from '@/types';
import { Download, BarChart2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip
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
  const [loading, setLoading] = useState(true);
  const [isStatsOpen, setIsStatsOpen] = useState(false);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line
  }, [selectedGroup, selectedSubject, selectedSemesterId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData] = await Promise.all([
        getUsers({ groupId: selectedGroup, role: 'student' }),
        getAllSubjects(),
      ]);
      setStudents(usersData.users);
      // Получаем оценки только для студентов этой группы
      const studentIds = usersData.users.map((u) => u.uid);
      const gradesData = await getGrades({
        studentIds,
        journalId: selectedSubject,
        semesterId: selectedSemesterId,
      });
      setGrades(gradesData);
    } catch {
      setGrades([]);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const getStudentGrades = (studentId: string) => {
    return grades.filter(g => g.studentId === studentId);
  };

  const getGradeStats = (studentId: string) => {
    const studentGrades = getStudentGrades(studentId);
    const total = studentGrades.length;
    const excellent = studentGrades.filter(g => Number(g.grade) >= 5).length;
    const good = studentGrades.filter(g => Number(g.grade) === 4).length;
    const satisfactory = studentGrades.filter(g => Number(g.grade) === 3).length;
    const unsatisfactory = studentGrades.filter(g => Number(g.grade) < 3).length;

    return {
      total,
      excellent,
      good,
      satisfactory,
      unsatisfactory,
      average: total ? (studentGrades.reduce((sum, g) => sum + Number(g.grade), 0) / total).toFixed(2) : '0'
    };
  };

  const getGroupStats = () => {
    const stats = {
      totalStudents: students.length,
      totalGrades: grades.length,
      averageGrade: 0,
      gradeDistribution: {
        distribution: {
          excellent: 0,
          good: 0,
          satisfactory: 0,
          unsatisfactory: 0
        }
      },
      subjectStats: new Map<string, {
        average: number,
        total: number,
        distribution: {
          excellent: number,
          good: number,
          satisfactory: number,
          unsatisfactory: number
        }
      }>()
    };

    students.forEach(student => {
      const studentGrades = getStudentGrades(student.uid);
      studentGrades.forEach(grade => {
        const value = Number(grade.grade);
        stats.averageGrade += value;

        if (value >= 5) stats.gradeDistribution.distribution.excellent++;
        else if (value === 4) stats.gradeDistribution.distribution.good++;
        else if (value === 3) stats.gradeDistribution.distribution.satisfactory++;
        else stats.gradeDistribution.distribution.unsatisfactory++;

        if (!stats.subjectStats.has(grade.journalId)) {
          stats.subjectStats.set(grade.journalId, {
            total: 0,
            average: 0,
            distribution: {
              excellent: 0,
              good: 0,
              satisfactory: 0,
              unsatisfactory: 0
            }
          });
        }

        const subjectStat = stats.subjectStats.get(grade.journalId)!;
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

  const getGradeDistributionData = (distribution: { [key: string]: number }) => {
    return [
      { name: 'Отлично', value: distribution.excellent },
      { name: 'Хорошо', value: distribution.good },
      { name: 'Удовлетворительно', value: distribution.satisfactory },
      { name: 'Неудовлетворительно', value: distribution.unsatisfactory }
    ];
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
        'Оценки': studentGrades.map(g => g.grade).join(', '),
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

  const stats = getGroupStats();
  const gradeDistributionData = getGradeDistributionData(stats.gradeDistribution.distribution);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Журнал оценок</h2>
        <div className="flex space-x-4">
          <Button onClick={() => setIsStatsOpen(true)}>
            <BarChart2 className="w-4 h-4 mr-2" />
            Статистика
          </Button>
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
                    {getStudentGrades(student.uid).map(g => g.grade).join(', ')}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isStatsOpen} onOpenChange={setIsStatsOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Статистика оценок</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium mb-2">Общая статистика</h3>
                <div className="space-y-2">
                  <div>Всего студентов: {stats.totalStudents}</div>
                  <div>Всего оценок: {stats.totalGrades}</div>
                  <div>Средний балл по группе: {stats.averageGrade}</div>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium mb-2">Распределение оценок</h3>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={gradeDistributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {gradeDistributionData.map((_, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 