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
import { Skeleton } from '@/components/ui/skeleton';
import { doc, onSnapshot } from 'firebase/firestore';
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
    if (!groupId) {
      navigate('/admin/groups'); // Or some other appropriate handling
      return;
    }

    setLoading(true);
    const groupDocRef = doc(db, 'groups', groupId);

    const unsubscribe = onSnapshot(
      groupDocRef,
      async (docSnap) => {
        if (docSnap.exists()) {
          const groupData = { id: docSnap.id, ...docSnap.data() } as Group;

          // Compare student arrays to see if an update to student details is needed
          const currentStudentIds = group?.students.map(s => s.id).sort().join(',') || '';
          const newStudentIds = groupData.students.map(s => s.id).sort().join(',') || '';

          if (currentStudentIds !== newStudentIds || !group) {
            const studentsData = await getStudentsInGroupDetails(db, groupData.students);
            setStudents(studentsData);
          }
          
          setGroup(groupData);
        } else {
          toast.error('Group not found');
          navigate('/admin/groups');
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching group details:', error);
        toast.error('Failed to fetch group details.');
        setLoading(false);
        navigate('/admin/groups');
      }
    );

    // Load teachers separately (can remain as is or be refactored if needed)
    const loadTeachers = async () => {
      try {
        const teachersData = await getUsersByRole(db, 'teacher');
        setTeachers(teachersData);
      } catch (error) {
        console.error('Error loading teachers:', error);
        toast.error('Failed to load teachers');
      }
    };

    loadTeachers();

    return () => {
      unsubscribe();
    };
  }, [groupId, navigate, group]); // Added group to dependency array

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        {/* Header Skeletons */}
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-48 mb-2" /> {/* Group Name */}
            <Skeleton className="h-4 w-64" /> {/* Specialization & Year */}
          </div>
          <div className="flex space-x-2">
            <Skeleton className="h-10 w-32" /> {/* Manage Teachers Button */}
            <Skeleton className="h-10 w-32" /> {/* Back to Groups Button */}
          </div>
        </div>

        {/* Tabs Skeletons */}
        <div className="space-y-4">
          <Skeleton className="h-10 w-1/3" /> {/* TabsList */}
          
          {/* Assuming "Students" tab is default, show table skeletons */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-1/4 mb-1" /> {/* CardTitle Students */}
              <Skeleton className="h-4 w-1/2" /> {/* CardDescription */}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><Skeleton className="h-5 w-1/3" /></TableHead>
                    <TableHead><Skeleton className="h-5 w-1/3" /></TableHead>
                    <TableHead><Skeleton className="h-5 w-1/4" /></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    );
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