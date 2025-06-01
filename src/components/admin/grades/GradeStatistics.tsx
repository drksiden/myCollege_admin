import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Grade, Subject, Group, GradeValue, AppUser } from '@/types';
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
  Cell,
} from 'recharts';
import { useMemo, useEffect, useState } from 'react';
import { getUsers } from '@/lib/firebaseService/userService';
import { getGrades } from '@/lib/firebaseService/gradeService';
import { toast } from 'sonner';

interface GradeStatisticsProps {
  subjects: Subject[];
  groups: Group[];
  selectedGroup: string;
  selectedSubject: string;
  selectedSemesterId: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

// Функция для преобразования GradeValue в числовое значение
const gradeValueToNumber = (value: GradeValue): number => {
  switch (value) {
    case '5': return 5;
    case '4': return 4;
    case '3': return 3;
    case '2': return 2;
    case 'зачет': return 4; // Приравниваем зачет к 4
    case 'незачет': return 2; // Приравниваем незачет к 2
    case 'н/а': return 0;
    default: return 0;
  }
};

// Функция для проверки, является ли оценка числовой
const isNumericGrade = (value: GradeValue): boolean => {
  return ['5', '4', '3', '2'].includes(value);
};

export default function GradeStatistics({
  subjects,
  groups,
  selectedGroup,
  selectedSubject,
  selectedSemesterId,
}: GradeStatisticsProps) {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);

  // Загрузка студентов группы и их оценок
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Загружаем студентов выбранной группы
        const studentsData = await getUsers({ 
          role: 'student'
        });
        
        // Фильтруем студентов по группе
        const groupStudents = studentsData.users.filter(
          student => (student as AppUser & { groupId: string }).groupId === selectedGroup
        );

        // Загружаем оценки для этих студентов
        const studentIds = groupStudents.map(student => student.uid);
        const gradesData = await getGrades({
          studentIds,
          subjectId: selectedSubject,
          semesterId: selectedSemesterId
        });
        setGrades(gradesData);
      } catch (error) {
        console.error('Error loading statistics data:', error);
        toast.error('Не удалось загрузить данные для статистики');
      } finally {
        setLoading(false);
      }
    };

    if (selectedGroup && selectedSubject && selectedSemesterId) {
      loadData();
    }
  }, [selectedGroup, selectedSubject, selectedSemesterId]);

  // Calculate average grades by type
  const averageByType = useMemo(() => 
    ['current', 'midterm', 'exam', 'final'].map(type => {
      const typeGrades = grades.filter(g => 
        g.type === type && 
        isNumericGrade(g.value)
      );
      const average = typeGrades.length > 0
        ? typeGrades.reduce((acc, g) => acc + gradeValueToNumber(g.value), 0) / typeGrades.length
        : 0;
      return {
        type: type === 'current' ? 'Текущие' :
              type === 'midterm' ? 'Рубежные' :
              type === 'exam' ? 'Экзамены' : 'Итоговые',
        average: Number(average.toFixed(2)),
      };
    }),
    [grades]
  );

  // Calculate grade distribution
  const gradeDistribution = useMemo(() => {
    const distribution = [
      { range: '5', count: 0 },
      { range: '4', count: 0 },
      { range: '3', count: 0 },
      { range: '2', count: 0 },
      { range: 'н/а', count: 0 },
    ];

    grades.forEach(grade => {
      if (isNumericGrade(grade.value)) {
        const index = ['5', '4', '3', '2'].indexOf(grade.value);
        if (index !== -1) {
          distribution[index].count++;
        }
      } else if (grade.value === 'н/а') {
        distribution[4].count++;
      }
    });

    return distribution;
  }, [grades]);

  // Calculate average grades by subject
  const averageBySubject = useMemo(() => 
    subjects.map(subject => {
      const subjectGrades = grades.filter(g => 
        g.subjectId === subject.id && 
        isNumericGrade(g.value)
      );
      const average = subjectGrades.length > 0
        ? subjectGrades.reduce((acc, g) => acc + gradeValueToNumber(g.value), 0) / subjectGrades.length
        : 0;
      return {
        subject: subject.name,
        average: Number(average.toFixed(2)),
      };
    }),
    [subjects, grades]
  );

  // Calculate average grades by group
  const averageByGroup = useMemo(() => 
    groups.map(group => {
      const groupGrades = grades.filter(g => 
        group.subjectIds.includes(g.subjectId) && 
        isNumericGrade(g.value)
      );
      const average = groupGrades.length > 0
        ? groupGrades.reduce((acc, g) => acc + gradeValueToNumber(g.value), 0) / groupGrades.length
        : 0;
      return {
        group: group.name,
        average: Number(average.toFixed(2)),
      };
    }),
    [groups, grades]
  );

  if (loading) {
    return <div>Загрузка статистики...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="distribution">Распределение</TabsTrigger>
          <TabsTrigger value="subjects">По предметам</TabsTrigger>
          <TabsTrigger value="groups">По группам</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Средние оценки по типам</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={averageByType}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis domain={[0, 5]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="average" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution">
          <Card>
            <CardHeader>
              <CardTitle>Распределение оценок</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={gradeDistribution}
                      dataKey="count"
                      nameKey="range"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {gradeDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subjects">
          <Card>
            <CardHeader>
              <CardTitle>Средние оценки по предметам</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={averageBySubject}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="subject" />
                    <YAxis domain={[0, 5]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="average" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="groups">
          <Card>
            <CardHeader>
              <CardTitle>Средние оценки по группам</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={averageByGroup}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="group" />
                    <YAxis domain={[0, 5]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="average" fill="#ffc658" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 