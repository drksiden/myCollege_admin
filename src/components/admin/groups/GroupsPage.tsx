import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { GroupFormDialog } from './GroupFormDialog';
import { ManageStudentsDialog } from './ManageStudentsDialog';
import { db } from '@/lib/firebase';
import { getAllGroups, deleteGroupInService, getStudentsInGroupDetails } from '@/lib/firebaseService/groupService';
import type { Group, Student } from '@/types';
import { toast } from 'sonner';

export function GroupsPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | undefined>();
  const [managingStudentsGroup, setManagingStudentsGroup] = useState<Group | undefined>();
  const [studentsMap, setStudentsMap] = useState<Record<string, Student[]>>({});

  const loadGroups = async () => {
    try {
      const fetchedGroups = await getAllGroups(db);
      setGroups(fetchedGroups);

      // Load students for each group
      const studentsPromises = fetchedGroups.map(async (group) => {
        const students = await getStudentsInGroupDetails(db, group.students);
        return [group.id, students] as [string, Student[]];
      });

      const studentsResults = await Promise.all(studentsPromises);
      const newStudentsMap = Object.fromEntries(studentsResults);
      setStudentsMap(newStudentsMap);
    } catch (error) {
      console.error('Error loading groups:', error);
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const handleDelete = async (group: Group) => {
    if (!confirm(`Are you sure you want to delete group ${group.name}?`)) {
      return;
    }

    try {
      await deleteGroupInService(db, group.id);
      await loadGroups();
      toast.success('Group deleted successfully');
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Failed to delete group');
    }
  };

  const filteredGroups = groups.filter(group => 
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.specialization.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto py-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Groups</h1>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          Create Group
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <Input
          placeholder="Search groups..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Specialization</TableHead>
              <TableHead>Students</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGroups.map((group) => (
              <TableRow key={group.id}>
                <TableCell>
                  <Button
                    variant="link"
                    onClick={() => navigate(`/admin/groups/${group.id}`)}
                  >
                    {group.name}
                  </Button>
                </TableCell>
                <TableCell>{group.year}</TableCell>
                <TableCell>{group.specialization}</TableCell>
                <TableCell>
                  {studentsMap[group.id]?.length || 0} students
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
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
                      onClick={() => setManagingStudentsGroup(group)}
                    >
                      Manage Students
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(group)}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <GroupFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={loadGroups}
      />

      {editingGroup && (
        <GroupFormDialog
          open={!!editingGroup}
          onOpenChange={(open) => !open && setEditingGroup(undefined)}
          group={editingGroup}
          onSuccess={loadGroups}
        />
      )}

      {managingStudentsGroup && (
        <ManageStudentsDialog
          open={!!managingStudentsGroup}
          onOpenChange={(open) => !open && setManagingStudentsGroup(undefined)}
          group={managingStudentsGroup}
          onSuccess={loadGroups}
        />
      )}
    </div>
  );
} 