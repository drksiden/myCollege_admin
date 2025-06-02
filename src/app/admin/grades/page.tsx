import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { getGroupsByTeacher } from '@/lib/firebaseService/groupService';
import { getGroupSubjects } from '@/lib/firebaseService/groupService';
import { getUsers } from '@/lib/firebaseService/userService';
import { getSemesters } from '@/lib/firebaseService/semesterService';
import { getGrades } from '@/lib/firebaseService/gradeService';
import type { Group } from '@/types';
import type { AppUser } from '@/types';
import type { Subject } from '@/types';
import type { Semester } from '@/types';
import type { Grade } from '@/types';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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

export default function GradesPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [students, setStudents] = useState<AppUser[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');
  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<AppUser | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);

  // Загрузка групп при монтировании компонента
  useEffect(() => {
    const loadGroups = async () => {
      if (user) {
        const teacherGroups = await getGroupsByTeacher(user.uid);
        setGroups(teacherGroups);
      }
    };
    loadGroups();
  }, [user]);

  // Загрузка предметов при выборе группы
  useEffect(() => {
    const loadSubjects = async () => {
      if (selectedGroupId) {
        try {
          const subjectIds = await getGroupSubjects(selectedGroupId);
          if (subjectIds && subjectIds.length > 0) {
            const subjectsData = await Promise.all(
              subjectIds.map(async (id) => {
                const subjectDoc = await getDoc(doc(db, 'subjects', id));
                if (subjectDoc.exists()) {
                  return { id: subjectDoc.id, ...subjectDoc.data() } as Subject;
                }
                return null;
              })
            );
            setSubjects(subjectsData.filter((subject): subject is Subject => subject !== null));
          } else {
            setSubjects([]);
          }
        } catch (error) {
          console.error('Error loading subjects:', error);
          setSubjects([]);
        }
      } else {
        setSubjects([]);
      }
    };
    loadSubjects();
  }, [selectedGroupId]);

  // Загрузка студентов при выборе группы
  useEffect(() => {
    const loadStudents = async () => {
      if (selectedGroupId) {
        try {
          const { users } = await getUsers({ groupId: selectedGroupId, role: 'student' });
          setStudents(users);
        } catch (error) {
          console.error('Error loading students:', error);
          setStudents([]);
        }
      } else {
        setStudents([]);
      }
    };
    loadStudents();
  }, [selectedGroupId]);

  // Загрузка семестров
  useEffect(() => {
    const loadSemesters = async () => {
      try {
        const semestersList = await getSemesters();
        setSemesters(semestersList);
      } catch (error) {
        console.error('Error loading semesters:', error);
        setSemesters([]);
      }
    };
    loadSemesters();
  }, []);

  // Загрузка оценок при выборе группы, предмета и семестра
  useEffect(() => {
    const loadGrades = async () => {
      if (selectedGroupId && selectedSubjectId && selectedSemesterId) {
        try {
          const studentIds = students.map(student => student.uid);
          const groupGrades = await getGrades({
            studentIds,
            subjectId: selectedSubjectId,
            semesterId: selectedSemesterId
          });
          setGrades(groupGrades);
        } catch (error) {
          console.error('Error loading grades:', error);
          setGrades([]);
        }
      } else {
        setGrades([]);
      }
    };
    loadGrades();
  }, [selectedGroupId, selectedSubjectId, selectedSemesterId, students]);

  // Сброс выбранного предмета при изменении группы
  useEffect(() => {
    setSelectedSubjectId('');
  }, [selectedGroupId]);

  // Сброс выбранного семестра при изменении группы или предмета
  useEffect(() => {
    setSelectedSemesterId('');
  }, [selectedGroupId, selectedSubjectId]);

  const handleStudentClick = (student: AppUser) => {
    setSelectedStudent(student);
    setIsDetailsOpen(true);
  };

  const getStudentGrades = (studentId: string) => {
    return grades.filter(g => g.studentId === studentId);
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

  const getGroupStats = () => {
    const stats = {
      totalStudents: students.length,
      totalGrades: grades.length,
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
    if (!selectedGroupId || !selectedSubjectId || !selectedSemesterId) return;

    const selectedGroup = groups.find(g => g.id === selectedGroupId);
    const selectedSubject = subjects.find(s => s.id === selectedSubjectId);
    const selectedSemester = semesters.find(s => s.id === selectedSemesterId);

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
        'Даты': studentGrades.map(g => format(g.date.toDate(), 'dd.MM.yyyy')).join(', '),
        'Комментарии': studentGrades.map(g => g.comment).join('; ')
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Оценки');

    const fileName = `Оценки_${selectedGroup?.name}_${selectedSubject?.name}_${selectedSemester?.name}.xlsx`;
    XLSX.writeFile(wb, fileName);
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

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Журнал оценок</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsStatsOpen(true)}
            disabled={!selectedGroupId || !selectedSubjectId || !selectedSemesterId}
          >
            <BarChart2 className="w-4 h-4 mr-2" />
            Статистика
          </Button>
          <Button
            variant="outline"
            onClick={exportToExcel}
            disabled={!selectedGroupId || !selectedSubjectId || !selectedSemesterId}
          >
            <Download className="w-4 h-4 mr-2" />
            Экспорт в Excel
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Select value={selectedGroupId || undefined} onValueChange={setSelectedGroupId}>
          <SelectTrigger>
            <SelectValue placeholder="Выберите группу" />
          </SelectTrigger>
          <SelectContent>
            {groups.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedSubjectId || undefined} onValueChange={setSelectedSubjectId}>
          <SelectTrigger>
            <SelectValue placeholder="Выберите предмет" />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((subject) => (
              <SelectItem key={subject.id} value={subject.id}>
                {subject.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedSemesterId || undefined} onValueChange={setSelectedSemesterId}>
          <SelectTrigger>
            <SelectValue placeholder="Выберите семестр" />
          </SelectTrigger>
          <SelectContent>
            {semesters.map((semester) => (
              <SelectItem key={semester.id} value={semester.id}>
                {semester.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedGroupId && selectedSubjectId && selectedSemesterId && students.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Студент
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Средний балл
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Оценки
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student) => {
                  const stats = getGradeStats(student.uid);
                  return (
                    <tr key={student.uid} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {student.lastName} {student.firstName} {student.middleName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={parseFloat(stats.average) >= 4 ? "default" : "destructive"}>
                          {stats.average}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {stats.excellent} отлично, {stats.good} хорошо, {stats.satisfactory} удовлетворительно, {stats.unsatisfactory} неудовлетворительно
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStudentClick(student)}
                        >
                          Детали
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {selectedStudent && `${selectedStudent.lastName} ${selectedStudent.firstName} ${selectedStudent.middleName}`}
            </DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {getStudentGrades(selectedStudent.uid).map((grade) => (
                  <div key={grade.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">
                        {format(grade.date.toDate(), 'd MMMM yyyy', { locale: ru })}
                      </div>
                      <div className="text-sm text-gray-500">
                        {grade.comment}
                      </div>
                    </div>
                    <Badge
                      variant={
                        Number(grade.value) >= 5 ? "default" :
                        Number(grade.value) === 4 ? "default" :
                        Number(grade.value) === 3 ? "default" :
                        "destructive"
                      }
                    >
                      {grade.value}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isStatsOpen} onOpenChange={setIsStatsOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Статистика оценок</DialogTitle>
          </DialogHeader>
          {selectedGroupId && selectedSubjectId && selectedSemesterId && (
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-6">
                {(() => {
                  const stats = getGroupStats();
                  const gradeDistributionData = getGradeDistributionData(stats.gradeDistribution);
                  const subjectStatsData = getSubjectStatsData(stats);

                  return (
                    <>
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
                                  {gradeDistributionData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-medium mb-4">Средние баллы по предметам</h3>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={subjectStatsData}
                              margin={{
                                top: 20,
                                right: 30,
                                left: 20,
                                bottom: 5,
                              }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey="average" name="Средний балл" fill="#8884d8" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-medium mb-4">Статистика по предметам</h3>
                        <div className="space-y-4">
                          {Array.from(stats.subjectStats.entries()).map(([subjectId, subjectStat]) => {
                            const subject = subjects.find(s => s.id === subjectId);
                            return (
                              <div key={subjectId} className="border-t pt-4">
                                <h4 className="font-medium mb-2">{subject?.name}</h4>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <div>Средний балл: {subjectStat.average}</div>
                                    <div>Всего оценок: {subjectStat.total}</div>
                                  </div>
                                  <div>
                                    <div>Отлично: {subjectStat.distribution.excellent}</div>
                                    <div>Хорошо: {subjectStat.distribution.good}</div>
                                    <div>Удовлетворительно: {subjectStat.distribution.satisfactory}</div>
                                    <div>Неудовлетворительно: {subjectStat.distribution.unsatisfactory}</div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 