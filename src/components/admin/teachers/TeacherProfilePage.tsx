import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { getTeacherProfile } from '@/lib/firebaseService/teacherService';
import { getAllGroups } from '@/lib/firebaseService/groupService';
import { getAllSubjects } from '@/lib/firebaseService/subjectService';
import { getUserById } from '@/lib/firebaseService/userService';
import type { Teacher, Group, Subject, User } from '@/types';
import { db } from '@/lib/firebase';

const TeacherProfilePage: React.FC = () => {
  const { teacherId } = useParams<{ teacherId: string }>();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!teacherId) return;
      try {
        const [teacherData, groupsData, subjectsData] = await Promise.all([
          getTeacherProfile(db, teacherId),
          getAllGroups(),
          getAllSubjects(),
        ]);

        if (teacherData) {
          setTeacher(teacherData);
          const userData = await getUserById(db, teacherData.userId);
          setUser(userData);
        }
        setGroups(groupsData);
        setSubjects(subjectsData);
      } catch (error) {
        console.error('Error loading teacher profile:', error);
        toast.error('Failed to load teacher profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [teacherId]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!teacher || !user) {
    return <div>Teacher not found</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Teacher Profile</CardTitle>
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
              <Label>Specialization</Label>
              <p>{teacher.specialization}</p>
            </div>
            <div>
              <Label>Experience</Label>
              <p>{teacher.experience} years</p>
            </div>
            <div>
              <Label>Education</Label>
              <p>{teacher.education}</p>
            </div>
            <div>
              <Label>Subjects</Label>
              <div className="flex flex-wrap gap-2">
                {teacher.subjects.map((subjectId) => {
                  const subject = subjects.find((s) => s.id === subjectId);
                  return (
                    <span key={subjectId} className="bg-primary/10 text-primary px-2 py-1 rounded">
                      {subject?.name || 'Unknown Subject'}
                    </span>
                  );
                })}
              </div>
            </div>
            <div>
              <Label>Groups</Label>
              <div className="flex flex-wrap gap-2">
                {teacher.groups.map((groupId) => {
                  const group = groups.find((g) => g.id === groupId);
                  return (
                    <span key={groupId} className="bg-primary/10 text-primary px-2 py-1 rounded">
                      {group?.name || 'Unknown Group'}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherProfilePage; 