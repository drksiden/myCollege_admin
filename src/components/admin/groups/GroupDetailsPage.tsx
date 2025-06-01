import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getGroup } from '@/lib/firebaseService/groupService';
import { getUsers, getUserById } from '@/lib/firebaseService/userService';
import { getGroupSchedule } from '@/lib/firebaseService/scheduleService';
import ScheduleTab from './ScheduleTab';
import { ManageTeachersDialog } from './ManageTeachersDialog';
import type { Group, StudentUser, TeacherUser } from '@/types';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function GroupDetailsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group | null>(null);
  const [students, setStudents] = useState<StudentUser[]>([]);
  const [teachers, setTeachers] = useState<TeacherUser[]>([]);
  const [curator, setCurator] = useState<TeacherUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isManageTeachersOpen, setIsManageTeachersOpen] = useState(false);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');

  const loadGroupData = async () => {
    if (!groupId) return;

    try {
      setLoading(true);
      // Load group details
      const groupData = await getGroup(groupId);
      if (!groupData) {
        toast.error('Группа не найдена');
        navigate('/admin/groups');
        return;
      }
      setGroup(groupData);

      // Load students with groupId filter
      const { users: studentsData } = await getUsers({ 
        role: 'student',
        groupId 
      });
      setStudents(studentsData as StudentUser[]);

      // Load teachers through schedule
      if (selectedSemesterId) {
        const schedule = await getGroupSchedule(selectedSemesterId, groupId);
        const uniqueTeacherIds = [...new Set(schedule.map(lesson => lesson.teacherId))];
        const teachersData = await Promise.all(
          uniqueTeacherIds.map(id => getUserById(id))
        );
        setTeachers(teachersData.filter(Boolean) as TeacherUser[]);
      }

      // Load curator if exists
      if (groupData.curatorId) {
        const curatorData = await getUserById(groupData.curatorId);
        if (curatorData) {
          setCurator(curatorData as TeacherUser);
        }
      }
    } catch (error) {
      console.error('Error loading group data:', error);
      toast.error('Не удалось загрузить данные группы');
    } finally {
      setLoading(false);
    }
  };

  // Reload teachers when semester changes
  useEffect(() => {
    if (groupId && selectedSemesterId) {
      loadGroupData();
    }
  }, [selectedSemesterId]);

  useEffect(() => {
    loadGroupData();
  }, [groupId, navigate]);

  if (loading) {
    return <div>Загрузка...</div>;
  }

  if (!group) {
    return null;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{group.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Год поступления: {group.year}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Специализация: {group.specialization}
        </p>
        {curator && (
          <p className="mt-1 text-sm text-muted-foreground">
            Куратор: {`${curator.lastName} ${curator.firstName} ${curator.middleName || ''}`}
          </p>
        )}
      </div>

      <Tabs defaultValue="students" className="space-y-4">
        <TabsList>
          <TabsTrigger value="students">Студенты</TabsTrigger>
          <TabsTrigger value="schedule">Расписание</TabsTrigger>
          <TabsTrigger value="teachers">Преподаватели</TabsTrigger>
        </TabsList>

        <TabsContent value="students">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Студенты</CardTitle>
                  <CardDescription>
                    Список студентов в группе {group.name}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => navigate('/admin/students/new')}
                  >
                    Добавить студента
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-lg font-medium">В группе пока нет студентов</p>
                  <p className="mt-2">Добавьте студентов через форму создания профиля студента</p>
                  <Button
                    variant="link"
                    className="mt-4"
                    onClick={() => navigate('/admin/students/new')}
                  >
                    Создать профиль студента
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ФИО</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Телефон</TableHead>
                        <TableHead>Номер студенческого</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead className="text-right">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student) => (
                        <TableRow key={student.uid}>
                          <TableCell className="font-medium">
                            {`${student.lastName} ${student.firstName} ${student.middleName || ''}`}
                          </TableCell>
                          <TableCell>{student.email}</TableCell>
                          <TableCell>{student.phone || '-'}</TableCell>
                          <TableCell>{student.studentIdNumber || '-'}</TableCell>
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
                              onClick={() => navigate(`/admin/students/${student.uid}`)}
                            >
                              Просмотр профиля
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Расписание</CardTitle>
                  <CardDescription>
                    Расписание занятий группы {group.name}
                  </CardDescription>
                </div>
                <Select
                  value={selectedSemesterId}
                  onValueChange={setSelectedSemesterId}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Выберите семестр" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 семестр</SelectItem>
                    <SelectItem value="2">2 семестр</SelectItem>
                    <SelectItem value="3">3 семестр</SelectItem>
                    <SelectItem value="4">4 семестр</SelectItem>
                    <SelectItem value="5">5 семестр</SelectItem>
                    <SelectItem value="6">6 семестр</SelectItem>
                    <SelectItem value="7">7 семестр</SelectItem>
                    <SelectItem value="8">8 семестр</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <ScheduleTab group={group} semesterId={selectedSemesterId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teachers">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Преподаватели</CardTitle>
                  <CardDescription>
                    Преподаватели, работающие с группой {group.name} в текущем семестре
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedSemesterId}
                    onValueChange={setSelectedSemesterId}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Выберите семестр" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 семестр</SelectItem>
                      <SelectItem value="2">2 семестр</SelectItem>
                      <SelectItem value="3">3 семестр</SelectItem>
                      <SelectItem value="4">4 семестр</SelectItem>
                      <SelectItem value="5">5 семестр</SelectItem>
                      <SelectItem value="6">6 семестр</SelectItem>
                      <SelectItem value="7">7 семестр</SelectItem>
                      <SelectItem value="8">8 семестр</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={() => setIsManageTeachersOpen(true)}>
                    Управление преподавателями
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!selectedSemesterId ? (
                <div className="text-center py-6 text-muted-foreground">
                  Выберите семестр для просмотра списка преподавателей
                </div>
              ) : teachers.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  Нет назначенных преподавателей на выбранный семестр
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ФИО</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Телефон</TableHead>
                        <TableHead>Специализация</TableHead>
                        <TableHead className="text-right">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teachers.map((teacher) => (
                        <TableRow key={teacher.uid}>
                          <TableCell className="font-medium">
                            {`${teacher.lastName} ${teacher.firstName} ${teacher.middleName || ''}`}
                          </TableCell>
                          <TableCell>{teacher.email}</TableCell>
                          <TableCell>{teacher.phone || '-'}</TableCell>
                          <TableCell>{teacher.specialization || '-'}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/admin/teachers/${teacher.uid}`)}
                            >
                              Просмотр профиля
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ManageTeachersDialog
        open={isManageTeachersOpen}
        onOpenChange={setIsManageTeachersOpen}
        group={group}
        onSuccess={loadGroupData}
      />
    </div>
  );
} 