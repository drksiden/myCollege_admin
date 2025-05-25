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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db } from '@/lib/firebase';
import { getTeacherProfile, updateTeacherProfile } from '@/lib/firebaseService/teacherService';
import { getGroup } from '@/lib/firebaseService/groupService';
import type { Teacher, Group, Subject } from '@/types';
import { toast } from 'sonner';
import { getAllSubjects } from '@/lib/firebaseService/subjectService';

const formSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  specialization: z.string().min(2, 'Specialization must be at least 2 characters'),
  experience: z.string().transform((val) => parseInt(val, 10)),
  education: z.string().min(2, 'Education must be at least 2 characters'),
});

type TeacherFormValues = z.infer<typeof formSchema>;

export function TeacherProfilePage() {
  const { teacherId } = useParams<{ teacherId: string }>();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<TeacherFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      specialization: '',
      experience: '0',
      education: '',
    },
  });

  useEffect(() => {
    const loadTeacherData = async () => {
      if (!teacherId) return;

      try {
        setLoading(true);
        const teacherData = await getTeacherProfile(db, teacherId);
        if (!teacherData) {
          toast.error('Преподаватель не найден');
          navigate('/admin/teachers');
          return;
        }
        setTeacher(teacherData);

        // Load groups
        const groupPromises = (teacherData.groups || []).map(groupId =>
          getGroup(db, groupId)
        );
        const groupsData = await Promise.all(groupPromises);
        setGroups(groupsData.filter((group): group is Group => group !== null));

        // Load subjects for this teacher
        const allSubjects = await getAllSubjects(db);
        const teacherSubjects = allSubjects.filter(s => s.teacherId === teacherData.id);
        setSubjects(teacherSubjects);

        // Set form values
        form.reset({
          firstName: teacherData.firstName,
          lastName: teacherData.lastName,
          email: teacherData.email,
          specialization: teacherData.specialization || '',
          experience: teacherData.experience?.toString() || '0',
          education: teacherData.education || '',
        });
      } catch (error) {
        console.error('Ошибка при загрузке данных преподавателя:', error);
        toast.error('Не удалось загрузить данные преподавателя');
      } finally {
        setLoading(false);
      }
    };

    loadTeacherData();
  }, [teacherId, navigate, form]);

  const onSubmit = async (values: TeacherFormValues) => {
    if (!teacher) return;

    try {
      await updateTeacherProfile(db, teacher.uid, {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        specialization: values.specialization,
        experience: values.experience,
        education: values.education,
      });

      setTeacher({
        ...teacher,
        ...values,
      });

      setIsEditing(false);
      toast.success('Teacher profile updated successfully');
    } catch (error) {
      console.error('Error updating teacher profile:', error);
      toast.error('Failed to update teacher profile');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!teacher) {
    return null;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">
            {teacher.firstName} {teacher.lastName}
          </h1>
          <p className="text-muted-foreground">{teacher.email}</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? 'Cancel' : 'Edit Profile'}
          </Button>
          <Button variant="outline" onClick={() => navigate('/admin/teachers')}>
            Back to Teachers
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Информация о преподавателе</CardTitle>
            <CardDescription>
              Основная информация о преподавателе
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!isEditing} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={!isEditing} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!isEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="specialization"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specialization</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!isEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="experience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Years of Experience</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          disabled={!isEditing}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="education"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Education</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!isEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {isEditing && (
                  <Button type="submit">Save Changes</Button>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Назначенные группы</CardTitle>
            <CardDescription>
              Группы, к которым прикреплён преподаватель
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Specialization</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell>{group.name}</TableCell>
                    <TableCell>{group.year}</TableCell>
                    <TableCell>{group.specialization}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/admin/groups/${group.id}`)}
                      >
                        View Group
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Преподаваемые предметы</CardTitle>
          <CardDescription>
            Все предметы, которые ведёт этот преподаватель
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subjects.length === 0 ? (
            <div className="text-muted-foreground py-4">Нет назначенных предметов</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Описание</TableHead>
                  <TableHead>Часы в неделю</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.map(subject => (
                  <TableRow key={subject.id}>
                    <TableCell>{subject.name}</TableCell>
                    <TableCell>{subject.description}</TableCell>
                    <TableCell>{subject.hoursPerWeek || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 