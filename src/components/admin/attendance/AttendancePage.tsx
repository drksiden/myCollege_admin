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
import { getGroups } from '@/lib/firebaseService/groupService';
import { getAllSubjects } from '@/lib/firebaseService/subjectService';
import { getUsers } from '@/lib/firebaseService/userService';
import type { Group, Subject, StudentUser } from '@/types';
import { toast } from 'sonner';

export function AttendancePage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<StudentUser[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [groupsData, subjectsData, studentsData] = await Promise.all([
        getGroups(),
        getAllSubjects(),
        getUsers({ role: 'student' }),
      ]);

      setGroups(groupsData);
      setSubjects(subjectsData);
      setStudents(studentsData.users as StudentUser[]);
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

  const getGroupStudents = () => {
    if (!selectedGroup) return [];
    return students.filter(student => student.groupId === selectedGroup);
  };

  if (loading) {
    return <div>Загрузка...</div>;
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
            Выберите группу и предмет для просмотра посещаемости
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
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
          </div>
        </CardContent>
      </Card>

      {selectedGroup && selectedSubject && (
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
                    <TableHead>Статус</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getGroupStudents().map((student) => (
                    <TableRow key={student.uid}>
                      <TableCell className="font-medium">
                        {`${student.lastName} ${student.firstName} ${student.middleName || ''}`}
                      </TableCell>
                      <TableCell>{student.email}</TableCell>
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
                          Просмотр посещаемости
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 