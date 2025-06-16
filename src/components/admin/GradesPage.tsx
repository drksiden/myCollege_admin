import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Group, StudentUser } from '@/types';
import { getAllGroups } from '@/lib/firebaseService/groupService';
import { getUsers } from '@/lib/firebaseService/userService';
import { toast } from 'sonner';

export function GradesPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<StudentUser[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [{ users }, groupsList] = await Promise.all([
          getUsers(),
          getAllGroups(),
        ]);
        const studentUsers = users.filter(user => user.role === 'student') as StudentUser[];

        setStudents(studentUsers);
        setGroups(groupsList);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Ошибка при загрузке данных');
      }
    };

    fetchData();
  }, []);

  const filteredStudents = selectedGroup
    ? students.filter(student => student.groupId === selectedGroup)
    : students;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Оценки</h1>
        <div className="flex gap-2">
          <Select value={selectedGroup} onValueChange={setSelectedGroup}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Выберите группу" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Все группы</SelectItem>
              {groups.map(group => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredStudents.map(student => (
          <div key={student.uid} className="p-4 border rounded">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold">{student.firstName} {student.lastName}</h2>
                <p className="text-gray-500">Номер студенческого: {student.studentIdNumber}</p>
                <p className="text-gray-500">Группа: {groups.find(g => g.id === student.groupId)?.name || 'Не назначена'}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 