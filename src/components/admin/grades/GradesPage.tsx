import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getGroups, getGroupSubjects } from '@/lib/firebaseService/groupService';
import { getSubjectsByIds } from '@/lib/firebaseService/subjectService';
import { getSemesters } from '@/lib/firebaseService/semesterService';
import type { Group, Subject, Semester } from '@/types';
import { toast } from 'sonner';
import { GradeBook } from './GradeBook';
import GradeStatistics from './GradeStatistics';
import { useAuth } from '@/contexts/AuthContext';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

export function GradesPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [groupsData, semestersData] = await Promise.all([
        getGroups(),
        getSemesters(),
      ]);
      setGroups(groupsData);
      setSemesters(semestersData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  // Загружаем предметы только для выбранной группы
  useEffect(() => {
    const loadGroupSubjects = async () => {
      if (selectedGroup) {
        try {
          const subjectIds = await getGroupSubjects(selectedGroup);
          if (subjectIds.length > 0) {
            const subjectsData = await getSubjectsByIds(subjectIds);
            setSubjects(subjectsData);
          } else {
            setSubjects([]);
          }
        } catch (error) {
          setSubjects([]);
        }
      } else {
        setSubjects([]);
      }
    };
    loadGroupSubjects();
  }, [selectedGroup]);

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

  if (loading || !user) {
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
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Оценки</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Учет успеваемости студентов
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
          <CardDescription>
            Выберите курс, группу, предмет и семестр для просмотра оценок
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="year">Курс</Label>
              <Select
                value={selectedYear?.toString()}
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
                disabled={!selectedGroup}
              >
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="semester">Семестр</Label>
              <Select
                value={selectedSemesterId}
                onValueChange={handleSemesterChange}
                disabled={!selectedGroup || !selectedSubject}
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
        <>
          <div className="mt-6">
            <GradeBook
              selectedGroup={selectedGroup}
              selectedSubject={selectedSubject}
              selectedSemesterId={selectedSemesterId}
            />
          </div>

          <div className="mt-6">
            <GradeStatistics
              subjects={subjects}
              groups={groups}
              selectedGroup={selectedGroup}
              selectedSubject={selectedSubject}
              selectedSemesterId={selectedSemesterId}
            />
          </div>
        </>
      )}
    </div>
  );
} 