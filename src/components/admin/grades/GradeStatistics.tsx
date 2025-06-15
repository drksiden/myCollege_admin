import { useState, useEffect, useMemo } from 'react';
import { getUsers } from '@/lib/firebaseService/userService';
import { getGrades } from '@/lib/firebaseService/gradeService';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import type { Grade } from '@/types';
import type { AppUser } from '@/types';
import type { Subject } from '@/types';
import type { Group } from '@/types';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

interface GradeStatisticsProps {
  subjects: Subject[];
  groups: Group[];
  selectedGroup: string;
  selectedSubject: string;
  selectedSemesterId: string;
}

export default function GradeStatistics({
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

        console.log('Selected group students:', groupStudents);

        // Находим journalId по subjectId, groupId и semesterId
        const journalsRef = collection(db, 'journals');
        const journalQuery = query(
          journalsRef,
          where('subjectId', '==', selectedSubject),
          where('groupId', '==', selectedGroup),
          where('semesterId', '==', selectedSemesterId)
        );
        const journalSnapshot = await getDocs(journalQuery);
        
        if (journalSnapshot.empty) {
          console.log('No journal found for:', { 
            subjectId: selectedSubject, 
            groupId: selectedGroup, 
            semesterId: selectedSemesterId 
          });
          setGrades([]);
          return;
        }

        const journalId = journalSnapshot.docs[0].id;
        console.log('Found journal:', journalId);

        // Загружаем оценки для этих студентов
        const studentIds = groupStudents.map(student => student.uid);
        console.log('Loading grades for students:', studentIds);
        console.log('With journalId:', journalId);
        console.log('And semesterId:', selectedSemesterId);

        const gradesData = await getGrades({
          studentIds,
          journalId,
          semesterId: selectedSemesterId
        });

        console.log('Loaded grades:', gradesData);
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

  // Calculate grade distribution
  const gradeDistribution = useMemo(() => {
    const distribution = [
      { range: 'Отлично (90-100)', count: 0 },
      { range: 'Хорошо (80-89)', count: 0 },
      { range: 'Удовлетворительно (70-79)', count: 0 },
      { range: 'Неудовлетворительно (0-69)', count: 0 },
      { range: 'Не аттестован', count: 0 },
    ];

    grades.forEach(grade => {
      // Проверяем, что grade.grade существует и не является null
      if (grade.grade && grade.grade !== 'н/а') {
        const value = parseInt(grade.grade.toString(), 10);
        if (!isNaN(value)) {
          if (value >= 90) {
            distribution[0].count++;
          } else if (value >= 80) {
            distribution[1].count++;
          } else if (value >= 70) {
            distribution[2].count++;
          } else if (value >= 0) {
            distribution[3].count++;
          }
        }
      } else if (grade.grade === 'н/а') {
        distribution[4].count++;
      }
    });

    console.log('Grade distribution:', distribution);
    return distribution;
  }, [grades]);

  if (loading) {
    return <div>Загрузка статистики...</div>;
  }

  // Calculate total grades and percentages
  const totalGrades = gradeDistribution.reduce((sum, item) => sum + item.count, 0);
  const gradeDistributionWithPercentages = gradeDistribution.map(item => ({
    ...item,
    percentage: totalGrades > 0 ? ((item.count / totalGrades) * 100).toFixed(1) : '0',
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Распределение оценок</CardTitle>
          <CardDescription>
            Показывает распределение оценок по 100-балльной системе
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={gradeDistributionWithPercentages}
                  dataKey="count"
                  nameKey="range"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                >
                  {gradeDistributionWithPercentages.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    `${value} студентов (${gradeDistributionWithPercentages.find(item => item.range === name)?.percentage}%)`,
                    name
                  ]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            {gradeDistributionWithPercentages.map((item, index) => (
              <div key={item.range} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <div>
                  <div className="font-medium">{item.range}</div>
                  <div className="text-muted-foreground">
                    {item.count} студентов ({item.percentage}%)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 