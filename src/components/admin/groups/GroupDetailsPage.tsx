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
import { db } from '@/lib/firebase';
import { getGroup, getStudentsInGroupDetails } from '@/lib/firebaseService/groupService';
import { getUsersByRole } from '@/lib/firebaseService/userService';
import { ScheduleTab } from './ScheduleTab';
import { ManageTeachersDialog } from './ManageTeachersDialog';
import type { Group, Student, User } from '@/types';
import { toast } from 'sonner';

export function GroupDetailsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isManageTeachersOpen, setIsManageTeachersOpen] = useState(false);

  useEffect(() => {
    const loadGroupData = async () => {
      if (!groupId) return;

      try {
        setLoading(true);
        // Load group details
        const groupData = await getGroup(db, groupId);
        if (!groupData) {
          toast.error('Group not found');
          navigate('/admin/groups');
          return;
        }
        setGroup(groupData);

        // Load students
        const studentsData = await getStudentsInGroupDetails(db, groupData.students);
        setStudents(studentsData);

        // Load teachers
        const teachersData = await getUsersByRole(db, 'teacher');
        setTeachers(teachersData);
      } catch (error) {
        console.error('Error loading group data:', error);
        toast.error('Failed to load group data');
      } finally {
        setLoading(false);
      }
    };

    loadGroupData();
  }, [groupId, navigate]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!group) {
    return null;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{group.name}</h1>
          <p className="text-muted-foreground">
            {group.specialization} • Year {group.year}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setIsManageTeachersOpen(true)}>
            Manage Teachers
          </Button>
          <Button variant="outline" onClick={() => navigate('/admin/groups')}>
            Back to Groups
          </Button>
        </div>
      </div>

      <Tabs defaultValue="students" className="space-y-4">
        <TabsList>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="teachers">Teachers</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle>Students</CardTitle>
              <CardDescription>
                List of students in {group.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>{student.firstName} {student.lastName}</TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/admin/students/${student.id}`)}
                        >
                          View Profile
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teachers">
          <Card>
            <CardHeader>
              <CardTitle>Teachers</CardTitle>
              <CardDescription>
                Teachers assigned to {group.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teachers.map((teacher) => (
                    <TableRow key={teacher.uid}>
                      <TableCell>{teacher.firstName} {teacher.lastName}</TableCell>
                      <TableCell>{teacher.email}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/admin/teachers/${teacher.uid}`)}
                        >
                          View Profile
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>Schedule</CardTitle>
              <CardDescription>
                Class schedule for {group.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScheduleTab group={group} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ManageTeachersDialog
        open={isManageTeachersOpen}
        onOpenChange={setIsManageTeachersOpen}
        group={group}
        onSuccess={() => {
          // Reload teachers data
          getUsersByRole(db, 'teacher').then(setTeachers);
        }}
      />
    </div>
  );
} 