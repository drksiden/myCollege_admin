import React, { useEffect, useState } from 'react';
import { getGroupSchedule } from '@/lib/firebaseService/scheduleService';
import { getGroups } from '@/lib/firebaseService/groupService';
import { getSubjects } from '@/lib/firebaseService/subjectService';
import { useAuth } from '@/lib/auth';
import type { Lesson, Group, Subject } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const TeacherJournalPage: React.FC = () => {
  const { user } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) return;

      try {
        const [subjectsData, groupsData] = await Promise.all([
          getSubjects(),
          getGroups(),
        ]);

        setSubjects(subjectsData);
        setGroups(groupsData);

        // Если есть выбранная группа, загружаем ее расписание
        if (selectedGroupId) {
          const groupLessons = await getGroupSchedule('current', selectedGroupId);
          setLessons(groupLessons.filter(lesson => lesson.teacherId === user.uid));
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.uid, selectedGroupId]);

  const handleGroupChange = (groupId: string) => {
    setSelectedGroupId(groupId);
    setSelectedSubjectId('');
  };

  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
  };

  const filteredLessons = lessons.filter(lesson => 
    (!selectedSubjectId || lesson.subjectId === selectedSubjectId)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-2xl font-bold">Журнал преподавателя</h1>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Группа</label>
          <Select value={selectedGroupId} onValueChange={handleGroupChange}>
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

        <div>
          <label className="block text-sm font-medium mb-2">Предмет</label>
          <Select value={selectedSubjectId} onValueChange={handleSubjectChange}>
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
      </div>

      {selectedGroupId && (
        <Card>
          <CardHeader>
            <CardTitle>Расписание занятий</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>День недели</TableHead>
                  <TableHead>Время</TableHead>
                  <TableHead>Предмет</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Аудитория</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLessons.map((lesson) => {
                  const subject = subjects.find(s => s.id === lesson.subjectId);
                  const dayNames = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
                  const typeNames = {
                    lecture: 'Лекция',
                    seminar: 'Семинар',
                    lab: 'Лабораторная',
                    exam: 'Экзамен',
                  };

                  return (
                    <TableRow key={lesson.id}>
                      <TableCell>{dayNames[lesson.dayOfWeek - 1]}</TableCell>
                      <TableCell>{`${lesson.startTime} - ${lesson.endTime}`}</TableCell>
                      <TableCell>{subject?.name || '—'}</TableCell>
                      <TableCell>{typeNames[lesson.type]}</TableCell>
                      <TableCell>{lesson.room}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          Открыть журнал
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TeacherJournalPage; 