import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MoreHorizontal, PlusCircle, Edit2, Trash2, Users, ListChecks } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import {
  getAllGroups,
  deleteGroupInService, // Renamed service function
} from '@/lib/firebaseService/groupService';
import { updateStudentProfile } from '@/lib/firebaseService/studentService'; // To update student's groupId
import GroupForm from '@/components/admin/groups/GroupForm';
import ManageGroupStudentsDialog from '@/components/admin/groups/ManageGroupStudentsDialog';
import type { Group } from '@/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Toaster } from '@/components/ui/sonner';
import { writeBatch, doc } from 'firebase/firestore';

const ManageGroupsPage: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupForEdit, setSelectedGroupForEdit] = useState<Group | null>(null);
  const [selectedGroupForStudents, setSelectedGroupForStudents] = useState<Group | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [showGroupFormDialog, setShowGroupFormDialog] = useState(false);
  const [showManageStudentsDialog, setShowManageStudentsDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedGroups = await getAllGroups(db);
      setGroups(fetchedGroups);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Failed to load groups.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenCreateGroupDialog = () => {
    setSelectedGroupForEdit(null);
    setFormMode('create');
    setShowGroupFormDialog(true);
  };

  const handleOpenEditGroupDialog = (group: Group) => {
    setSelectedGroupForEdit(group);
    setFormMode('edit');
    setShowGroupFormDialog(true);
  };

  const handleOpenManageStudentsDialog = (group: Group) => {
    setSelectedGroupForStudents(group);
    setShowManageStudentsDialog(true);
  };

  const handleGroupFormSuccess = () => {
    setShowGroupFormDialog(false);
    setSelectedGroupForEdit(null);
    fetchData(); 
  };

  const handleManageStudentsSuccess = () => {
    // ManageGroupStudentsDialog handles its own open state.
    // We just need to refresh the group list to show updated student counts.
    fetchData();
  };

  const handleDeleteInitiate = (group: Group) => {
    setGroupToDelete(group);
  };

  const confirmDeleteGroup = async () => {
    if (!groupToDelete) return;
    setIsLoading(true); // Indicate processing
    try {
      const batch = writeBatch(db);

      // 1. Unlink students from this group
      if (groupToDelete.students && groupToDelete.students.length > 0) {
        groupToDelete.students.forEach(studentProfileId => {
          const studentProfileRef = doc(db, 'students', studentProfileId);
          // Assuming student profile might not exist or already unlinked, but attempt update.
          batch.update(studentProfileRef, { groupId: "" }); // Set to empty string or null
        });
      }

      // 2. Delete the group document itself
      const groupRef = doc(db, 'groups', groupToDelete.id);
      batch.delete(groupRef);

      await batch.commit();
      toast.success(`Group "${groupToDelete.name}" and student links removed successfully.`);
      fetchData(); 
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Failed to delete group. Students might still be linked.');
    } finally {
      setGroupToDelete(null);
      setIsLoading(false);
    }
  };

  if (isLoading && groups.length === 0) {
    return <p className="text-center p-10">Loading groups...</p>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <Toaster richColors position="top-right" />

      {/* Dialog for Create/Edit Group */}
      <Dialog open={showGroupFormDialog} onOpenChange={(open) => {
        if (!open) setSelectedGroupForEdit(null); // Clear selection on close
        setShowGroupFormDialog(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {formMode === 'create' ? 'Create New Group' : 'Edit Group'}
            </DialogTitle>
            <DialogDescription>
              {formMode === 'create'
                ? 'Fill in the details to add a new group.'
                : `Editing group: ${selectedGroupForEdit?.name || ''}`}
            </DialogDescription>
          </DialogHeader>
          {showGroupFormDialog && ( 
            <GroupForm
              mode={formMode}
              groupId={selectedGroupForEdit?.id}
              onFormSubmitSuccess={handleGroupFormSuccess}
              onCancel={() => setShowGroupFormDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog for Managing Students in a Group */}
      {selectedGroupForStudents && (
          <ManageGroupStudentsDialog
            group={selectedGroupForStudents}
            open={showManageStudentsDialog}
            onOpenChange={(open) => {
                 if(!open) setSelectedGroupForStudents(null);
                 setShowManageStudentsDialog(open);
            }}
            onStudentsManaged={handleManageStudentsSuccess}
          />
      )}


      {/* Alert Dialog for Delete Confirmation */}
      {groupToDelete && (
        <AlertDialog open={!!groupToDelete} onOpenChange={() => setGroupToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will permanently delete the group <span className="font-semibold">"{groupToDelete.name}"</span>.
                Students in this group will be unassigned. This operation cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteGroup} className="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 dark:text-slate-50" disabled={isLoading}>
                {isLoading ? "Deleting..." : "Delete Group"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Group Management</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Organize students into groups, manage specializations, and enrollment years.
            </p>
          </div>
          <Button onClick={handleOpenCreateGroupDialog}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Group
          </Button>
        </div>
      </header>

      <section>
        <div className="bg-card shadow sm:rounded-lg">
          {groups.length === 0 && !isLoading ? (
            <div className="p-10 text-center text-muted-foreground">
              <ListChecks className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium">No groups found</h3>
              <p className="mt-1 text-sm">Get started by adding a new group.</p>
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30%]">Name</TableHead>
                <TableHead className="w-[25%]">Specialization</TableHead>
                <TableHead className="w-[10%] text-center">Year</TableHead>
                <TableHead className="w-[15%] text-center">Student Count</TableHead>
                <TableHead className="text-right w-[20%]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map(group => (
                <TableRow key={group.id}>
                  <TableCell className="font-medium">{group.name}</TableCell>
                  <TableCell>{group.specialization}</TableCell>
                  <TableCell className="text-center">{group.year}</TableCell>
                  <TableCell className="text-center">{group.students?.length || 0}</TableCell>
                  <TableCell className="text-right">
                     <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleOpenEditGroupDialog(group)}>
                          <Edit2 className="mr-2 h-4 w-4" /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenManageStudentsDialog(group)}>
                          <Users className="mr-2 h-4 w-4" /> Manage Students
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDeleteInitiate(group)} 
                          className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-800"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete Group
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </div>
      </section>
    </div>
  );
};

export default ManageGroupsPage;
