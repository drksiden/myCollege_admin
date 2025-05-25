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
import { getStudentsByGroup } from '@/lib/firebaseService/studentService';
import { getUsersByRole, getUserById } from '@/lib/firebaseService/userService';
import { ScheduleTab } from './ScheduleTab';
import { ManageTeachersDialog } from './ManageTeachersDialog';
import type { Group, Student, User } from '@/types';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';

interface StudentWithUserData extends Student {
  userData?: User;
  phone?: string;
  address?: string;
}

export function GroupDetailsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group | null>(null);
  const [students, setStudents] = useState<StudentWithUserData[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isManageTeachersOpen, setIsManageTeachersOpen] = useState(false);

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
      console.log('Loaded group data:', groupData);
      setGroup(groupData);

      // Load students
      console.log('Loading students for group:', groupId);
      const studentsData = await getStudentsByGroup(groupId);
      console.log('Loaded students data:', studentsData);
      
      // Load user data for each student
      const studentsWithUserData = await Promise.all(
        studentsData.map(async (student) => {
          console.log('Loading user data for student:', student);
          const userData = await getUserById(db, student.userId);
          console.log('Loaded user data:', userData);
          return { 
            ...student, 
            userData: userData || undefined 
          } as StudentWithUserData;
        })
      );
      
      console.log('Final students with user data:', studentsWithUserData);
      setStudents(studentsWithUserData);

      // Load teachers
      const teachersData = await getUsersByRole(db, 'teacher');
      setTeachers(teachersData);
    } catch (error) {
      console.error('Error loading group data:', error);
      toast.error('Не удалось загрузить данные группы');
    } finally {
      setLoading(false);
    }
  };

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
                        <TableHead>Номер студента</TableHead>
                        <TableHead>Дата зачисления</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Контакты</TableHead>
                        <TableHead className="text-right">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">
                            {student.userData ? 
                              `${student.userData.lastName} ${student.userData.firstName} ${student.userData.middleName || ''}` :
                              'Загрузка...'
                            }
                          </TableCell>
                          <TableCell>{student.studentCardId}</TableCell>
                          <TableCell>
                            {student.enrollmentDate ? 
                              new Date(student.enrollmentDate.seconds * 1000).toLocaleDateString('ru-RU') :
                              '-'
                            }
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                              ${student.status === 'active' ? 'bg-green-100 text-green-800' :
                                student.status === 'inactive' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'}`}>
                              {student.status === 'active' ? 'Активен' :
                               student.status === 'inactive' ? 'Неактивен' :
                               'Выпускник'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {student.phone && (
                                <div className="text-sm">
                                  <span className="text-muted-foreground">Тел.:</span> {student.phone}
                                </div>
                              )}
                              {student.address && (
                                <div className="text-sm">
                                  <span className="text-muted-foreground">Адрес:</span> {student.address}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/admin/students/${student.id}`)}
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
          <ScheduleTab group={group} />
        </TabsContent>

        <TabsContent value="teachers">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Преподаватели</CardTitle>
                  <CardDescription>
                    Преподаватели, работающие с группой {group.name}
                  </CardDescription>
                </div>
                <Button onClick={() => setIsManageTeachersOpen(true)}>
                  Управление преподавателями
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {teachers.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  Нет назначенных преподавателей
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ФИО</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teachers.map((teacher) => (
                      <TableRow key={teacher.uid}>
                        <TableCell>{teacher.lastName} {teacher.firstName} {teacher.middleName || ''}</TableCell>
                        <TableCell>{teacher.email}</TableCell>
                        <TableCell>
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
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ManageTeachersDialog
        open={isManageTeachersOpen}
        onOpenChange={setIsManageTeachersOpen}
        group={group}
        onSuccess={() => {
          setIsManageTeachersOpen(false);
          loadGroupData();
        }}
      />
    </div>
  );
} 