import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Group, TeacherUser } from '@/types';
import { createGroup, updateGroup, deleteGroup, getAllGroups } from '@/lib/firebaseService/groupService';
import { getUsers } from '@/lib/firebaseService/userService';
import { toast } from 'sonner';

interface GroupFormValues {
  name: string;
  year: number;
  specialization: string;
  curatorId: string;
}

export function GroupsPage() {
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [teachers, setTeachers] = useState<TeacherUser[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchGroups = async () => {
    try {
      const groupsList = await getAllGroups();
      setGroups(groupsList);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Ошибка при загрузке групп');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [{ users }, groupsList] = await Promise.all([
          getUsers(),
          getAllGroups(),
        ]);
        const teacherUsers = users.filter(user => user.role === 'teacher') as TeacherUser[];
        setTeachers(teacherUsers);
        setGroups(groupsList);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Ошибка при загрузке данных');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleCreateGroup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const values: GroupFormValues = {
      name: formData.get('name') as string,
      year: Number(formData.get('year')),
      specialization: formData.get('specialization') as string,
      curatorId: formData.get('curatorId') as string,
    };

    try {
      setLoading(true);
      await createGroup({
        name: values.name,
        year: values.year,
        specialization: values.specialization,
        curatorId: values.curatorId,
        subjectIds: [],
      });
      toast.success('Группа создана');
      setShowForm(false);
      await fetchGroups();
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Ошибка при создании группы');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGroup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedGroup) return;

    const formData = new FormData(event.currentTarget);
    const values: GroupFormValues = {
      name: formData.get('name') as string,
      year: Number(formData.get('year')),
      specialization: formData.get('specialization') as string,
      curatorId: formData.get('curatorId') as string,
    };

    try {
      setLoading(true);
      await updateGroup(selectedGroup.id, values);
      toast.success('Группа обновлена');
      setSelectedGroup(null);
      await fetchGroups();
    } catch (error) {
      console.error('Error updating group:', error);
      toast.error('Ошибка при обновлении группы');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      setLoading(true);
      await deleteGroup(groupId);
      toast.success('Группа удалена');
      await fetchGroups();
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Ошибка при удалении группы');
    } finally {
      setLoading(false);
    }
  };

  const getTeacherName = (teacherId: string) => {
    const teacher = teachers.find(t => t.uid === teacherId);
    return teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Неизвестный преподаватель';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Группы</h1>
        <Button onClick={() => setShowForm(true)}>Создать группу</Button>
      </div>

      <div className="grid gap-4">
        {groups.map(group => (
          <div key={group.id} className="p-4 border rounded">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold">{group.name}</h2>
                <p className="text-gray-500">Год: {group.year}</p>
                <p className="text-gray-500">Специализация: {group.specialization}</p>
                <p className="text-gray-500">Куратор: {getTeacherName(group.curatorId || '')}</p>
              </div>
              <div className="space-x-2">
                <Button variant="outline" onClick={() => setSelectedGroup(group)}>
                  Редактировать
                </Button>
                <Button variant="destructive" onClick={() => handleDeleteGroup(group.id)}>
                  Удалить
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Создать группу</h2>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <Label htmlFor="name">Название</Label>
                <Input id="name" name="name" required />
              </div>
              <div>
                <Label htmlFor="year">Год</Label>
                <Input id="year" name="year" type="number" required />
              </div>
              <div>
                <Label htmlFor="specialization">Специализация</Label>
                <Input id="specialization" name="specialization" required />
              </div>
              <div>
                <Label htmlFor="curatorId">Куратор</Label>
                <Select name="curatorId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите куратора" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map(teacher => (
                      <SelectItem key={teacher.uid} value={teacher.uid}>
                        {teacher.firstName} {teacher.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Отмена
                </Button>
                <Button type="submit" disabled={loading}>
                  Создать
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Редактировать группу</h2>
            <form onSubmit={handleUpdateGroup} className="space-y-4">
              <div>
                <Label htmlFor="name">Название</Label>
                <Input id="name" name="name" defaultValue={selectedGroup.name} required />
              </div>
              <div>
                <Label htmlFor="year">Год</Label>
                <Input id="year" name="year" type="number" defaultValue={selectedGroup.year} required />
              </div>
              <div>
                <Label htmlFor="specialization">Специализация</Label>
                <Input id="specialization" name="specialization" defaultValue={selectedGroup.specialization} required />
              </div>
              <div>
                <Label htmlFor="curatorId">Куратор</Label>
                <Select name="curatorId" defaultValue={selectedGroup.curatorId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите куратора" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map(teacher => (
                      <SelectItem key={teacher.uid} value={teacher.uid}>
                        {teacher.firstName} {teacher.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setSelectedGroup(null)}>
                  Отмена
                </Button>
                <Button type="submit" disabled={loading}>
                  Сохранить
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 