import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PlusCircle, Users, BookOpen, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getAllGroups, deleteGroup } from '@/lib/firebaseService/groupService';
import { getUsers } from '@/lib/firebaseService/userService';
import type { Group, StudentUser } from '@/types';
import { GroupFormDialog } from './GroupFormDialog';
import { GroupStudentsDialog } from './GroupStudentsDialog';
import { ManageTeachersDialog } from './ManageTeachersDialog';

const GroupsPage: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Record<string, StudentUser[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | undefined>();
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showStudentsDialog, setShowStudentsDialog] = useState(false);
  const [showTeachersDialog, setShowTeachersDialog] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const fetchedGroups = await getAllGroups();
      setGroups(fetchedGroups);

      // Загружаем студентов для каждой группы
      const studentsData: Record<string, StudentUser[]> = {};
      for (const group of fetchedGroups) {
        const { users } = await getUsers({ 
          role: 'student',
          groupId: group.id 
        });
        studentsData[group.id] = users as StudentUser[];
      }
      setStudents(studentsData);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Не удалось загрузить группы');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteGroup = async (group: Group) => {
    if (!confirm('Вы уверены, что хотите удалить эту группу?')) return;
    try {
      await deleteGroup(group.id);
      toast.success('Группа успешно удалена');
      fetchGroups();
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Не удалось удалить группу');
    }
  };

  const handleCreateSuccess = async () => {
    setIsCreateDialogOpen(false);
    await fetchGroups();
  };

  const handleEditSuccess = async () => {
    setEditingGroup(undefined);
    await fetchGroups();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Загрузка групп...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Группы</h1>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Создать группу
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Название</TableHead>
              <TableHead>Год</TableHead>
              <TableHead>Специализация</TableHead>
              <TableHead>Студенты</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((group) => (
              <TableRow key={group.id}>
                <TableCell>{group.name}</TableCell>
                <TableCell>{group.year}</TableCell>
                <TableCell>{group.specialization}</TableCell>
                <TableCell>{students[group.id]?.length || 0} студентов</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingGroup(group)}
                    >
                      Редактировать
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedGroup(group);
                        setShowStudentsDialog(true);
                      }}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Студенты
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedGroup(group);
                        setShowTeachersDialog(true);
                      }}
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      Преподаватели
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteGroup(group)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <GroupFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleCreateSuccess}
      />

      {editingGroup && (
        <GroupFormDialog
          open={true}
          onOpenChange={() => setEditingGroup(undefined)}
          group={editingGroup}
          onSuccess={handleEditSuccess}
        />
      )}

      {selectedGroup && (
        <>
          <GroupStudentsDialog
            open={showStudentsDialog}
            onOpenChange={setShowStudentsDialog}
            group={selectedGroup}
            onSuccess={fetchGroups}
          />

          <ManageTeachersDialog
            open={showTeachersDialog}
            onOpenChange={setShowTeachersDialog}
            group={selectedGroup}
            onSuccess={fetchGroups}
          />
        </>
      )}
    </div>
  );
};

export default GroupsPage; 