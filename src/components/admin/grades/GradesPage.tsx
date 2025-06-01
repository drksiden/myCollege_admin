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
import { getGroups } from '@/lib/firebaseService/groupService';
import { getSubjects } from '@/lib/firebaseService/subjectService';
import type { Group, Subject } from '@/types';
import { toast } from 'sonner';
import { GradeBook } from './GradeBook';
import GradeStatistics from './GradeStatistics';
import GradeImport from './GradeImport';
import { useAuth } from '@/lib/auth';
import { Label } from '@/components/ui/label';

export function GradesPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
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
      const [groupsData, subjectsData] = await Promise.all([
        getGroups(),
        getSubjects(),
      ]);

      setGroups(groupsData);
      setSubjects(subjectsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  const handleGroupChange = (groupId: string) => {
    setSelectedGroup(groupId);
    setSelectedSubject('');
  };

  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubject(subjectId);
  };

  const handleSemesterChange = (semesterId: string) => {
    setSelectedSemesterId(semesterId);
  };

  if (loading || !user) {
    return <div>Загрузка...</div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Оценки</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Учет успеваемости студентов
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
          <CardDescription>
            Выберите группу, предмет и семестр для просмотра оценок
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="group">Группа</Label>
              <Select
                value={selectedGroup}
                onValueChange={handleGroupChange}
              >
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
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((semester) => (
                    <SelectItem key={semester} value={semester.toString()}>
                      Семестр {semester}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedGroup && selectedSubject && selectedSemesterId && (
        <>
          <div className="mt-6">
            <GradeBook teacherId={user.uid} />
          </div>

          <div className="mt-6">
            <GradeStatistics
              grades={[]} // TODO: Получать оценки через gradeService
              subjects={subjects}
              groups={groups}
              selectedGroup={selectedGroup}
              selectedSubject={selectedSubject}
              selectedSemesterId={selectedSemesterId}
            />
          </div>

          <div className="mt-6">
            <GradeImport
              teacherId={user.uid}
              onSuccess={() => {
                // TODO: Обновить список оценок
              }}
            />
          </div>
        </>
      )}
    </div>
  );
} 