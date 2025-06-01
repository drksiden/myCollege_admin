import { useState, useEffect } from 'react';
import type { Group, StudentUser } from '@/types';
import { getAllGroups } from '@/lib/firebaseService/groupService';
import { getUsers } from '@/lib/firebaseService/userService';
import { toast } from 'sonner';

interface GradeBookProps {
  groupId: string;
}

export function GradeBook({ groupId }: GradeBookProps) {
  const [group, setGroup] = useState<Group | null>(null);
  const [students, setStudents] = useState<StudentUser[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [{ users }, groupsList] = await Promise.all([
          getUsers(),
          getAllGroups(),
        ]);
        const studentUsers = users.filter(user => user.role === 'student') as StudentUser[];
        const currentGroup = groupsList.find(g => g.id === groupId);

        setStudents(studentUsers.filter(student => student.groupId === groupId));
        setGroup(currentGroup || null);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Ошибка при загрузке данных');
      }
    };

    fetchData();
  }, [groupId]);

  if (!group) {
    return <div>Группа не найдена</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Журнал группы {group.name}</h1>
      </div>

      <div className="grid gap-4">
        {students.map(student => (
          <div key={student.uid} className="p-4 border rounded">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold">{student.firstName} {student.lastName}</h2>
                <p className="text-gray-500">Номер студенческого: {student.studentIdNumber}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 