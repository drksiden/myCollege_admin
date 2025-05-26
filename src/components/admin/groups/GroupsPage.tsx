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
import { getAllGroups, deleteGroupInService } from '@/lib/firebaseService/groupService';
import { getStudentsByGroup } from '@/lib/firebaseService/studentService';
import type { Group, Student } from '@/types';
import { GroupFormDialog } from './GroupFormDialog';
import { ManageStudentsDialog } from './ManageStudentsDialog';
import { ManageTeachersDialog } from './ManageTeachersDialog';

const GroupsPage: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Record<string, Student[]>>({});
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

      // Fetch students for each group
      const studentsData: Record<string, Student[]> = {};
      for (const group of fetchedGroups) {
        if (group.students && group.students.length > 0) {
          const groupStudents = await getStudentsByGroup(group.id);
          studentsData[group.id] = groupStudents;
        }
      }
      setStudents(studentsData);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Failed to load groups');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteGroup = async (group: Group) => {
    if (!confirm('Are you sure you want to delete this group?')) return;
    try {
      await deleteGroupInService(group.id);
      toast.success('Group deleted successfully');
      fetchGroups();
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Failed to delete group');
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
        <span className="ml-2">Loading groups...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Groups</h1>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Group
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Specialization</TableHead>
              <TableHead>Students</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((group) => (
              <TableRow key={group.id}>
                <TableCell>{group.name}</TableCell>
                <TableCell>{group.year}</TableCell>
                <TableCell>{group.specialization}</TableCell>
                <TableCell>{students[group.id]?.length || 0} students</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingGroup(group)}
                    >
                      Edit
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
                      Students
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
                      Teachers
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
        onClose={() => setIsCreateDialogOpen(false)}
        onSubmit={handleCreateSuccess}
      />

      {editingGroup && (
        <GroupFormDialog
          open={true}
          onClose={() => setEditingGroup(undefined)}
          group={editingGroup}
          onSubmit={handleEditSuccess}
        />
      )}

      {selectedGroup && (
        <>
          <ManageStudentsDialog
            open={showStudentsDialog}
            onClose={() => setShowStudentsDialog(false)}
            group={selectedGroup}
            onSuccess={fetchGroups}
          />

          <ManageTeachersDialog
            open={showTeachersDialog}
            onClose={() => setShowTeachersDialog(false)}
            group={selectedGroup}
            onSuccess={fetchGroups}
          />
        </>
      )}
    </div>
  );
};

export default GroupsPage; 