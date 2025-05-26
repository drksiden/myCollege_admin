import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { getStudentProfile } from '@/lib/firebaseService/studentService';
import { getAllGroups } from '@/lib/firebaseService/groupService';
import { getAttendanceByStudent } from '@/lib/firebaseService/attendanceService';
import { getUserById } from '@/lib/firebaseService/userService';
import type { Student, Group, User, Attendance } from '@/types';
import { Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const StudentProfilePage: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!studentId) return;
      try {
        const [studentData, groupsData] = await Promise.all([
          getStudentProfile(studentId),
          getAllGroups(),
        ]);

        if (studentData) {
          setStudent(studentData);
          const userData = await getUserById(db, studentData.userId);
          setUser(userData);
          const attendanceData = await getAttendanceByStudent(studentData.userId);
          setAttendance(attendanceData);
        }
        setGroups(groupsData);
      } catch (error) {
        console.error('Error loading student profile:', error);
        toast.error('Failed to load student profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [studentId, toast]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!student || !user) {
    return <div>Student not found</div>;
  }

  const group = groups.find(g => g.id === student.groupId);

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Student Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <p className="text-lg font-medium">{`${user.firstName} ${user.lastName}`}</p>
            </div>
            <div>
              <Label>Email</Label>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
            <div>
              <Label>Student Card ID</Label>
              <p>{student.studentCardId}</p>
            </div>
            <div>
              <Label>Group</Label>
              <p>{group?.name || 'Not assigned'}</p>
            </div>
            <div>
              <Label>Status</Label>
              <p>{student.status}</p>
            </div>
            <div>
              <Label>Attendance</Label>
              <div className="mt-2">
                {attendance.length > 0 ? (
                  <div className="space-y-2">
                    {attendance.map((record) => (
                      <div key={record.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span>{record.date instanceof Timestamp ? record.date.toDate().toLocaleDateString() : new Date(record.date).toLocaleDateString()}</span>
                        <span className="capitalize">{record.status}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No attendance records found</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentProfilePage; 