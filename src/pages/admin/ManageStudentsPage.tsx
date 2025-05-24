import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Trash2, PlusCircle, MoreHorizontal, Edit2, Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { getAllStudents } from '@/lib/firebaseService/studentService';
import { getAllGroups } from '@/lib/firebaseService/groupService';
import type { Student, Group } from '@/types';
import { writeBatch, doc } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import StudentProfileForm from '@/components/admin/students/StudentProfileForm';

const ManageStudentsPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [studentToDelete, setStudentToDelete] = useState<Student | undefined>(undefined);
  const [selectedStudent, setSelectedStudent] = useState<Student | undefined>(undefined);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [profiles, fetchedGroups] = await Promise.all([
        getAllStudents(db),
        getAllGroups(db)
      ]);
      setStudents(profiles);
      setGroups(fetchedGroups);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenCreateProfileDialog = () => {
    setSelectedStudent(undefined);
    setFormMode('create');
    setShowProfileDialog(true);
  };

  const handleOpenEditProfileDialog = (student: Student) => {
    setSelectedStudent(student);
    setFormMode('edit');
    setShowProfileDialog(true);
  };

  const handleDeleteStudentInitiate = (student: Student) => {
    setStudentToDelete(student);
  };

  const confirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'students', studentToDelete.id));
      const groupToUpdate = groups.find(g => g.students?.includes(studentToDelete.id));
      if (groupToUpdate) {
        batch.update(doc(db, 'groups', groupToUpdate.id), {
          students: groupToUpdate.students?.filter((id: string) => id !== studentToDelete.id)
        });
      }
      await batch.commit();
      toast.success(`Student profile deleted successfully.`);
      fetchData();
    } catch (err) {
      console.error('Failed to delete student:', err);
      toast.error('Failed to delete student.');
    } finally {
      setStudentToDelete(undefined);
      setIsSubmitting(false);
    }
  };

  if (isLoading && students.length === 0) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /> <span className="ml-2">Loading students...</span></div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Student Management</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Create, view, and manage student profiles.
            </p>
          </div>
          <Button onClick={handleOpenCreateProfileDialog} disabled={isLoading}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create Profile
          </Button>
        </div>
      </header>

      <section>
        <div className="bg-card shadow sm:rounded-lg">
          {students.length === 0 && !isLoading ? (
            <div className="p-10 text-center text-muted-foreground">
              <PlusCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium">No student profiles found</h3>
              <p className="mt-1 text-sm">Get started by creating a new student profile.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Card ID</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map(student => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">
                      {student.studentCardId}
                    </TableCell>
                    <TableCell>
                      {groups.find(g => g.students?.includes(student.id))?.name || 'No Group'}
                    </TableCell>
                    <TableCell>
                      {student.status}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleOpenEditProfileDialog(student)}>
                              <Edit2 className="mr-2 h-4 w-4" /> Edit Profile
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteStudentInitiate(student)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Profile
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </section>

      <Dialog open={showProfileDialog} onOpenChange={(open) => { if (!open) setSelectedStudent(undefined); setShowProfileDialog(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{formMode === 'create' ? 'Create Student Profile' : 'Edit Student Profile'}</DialogTitle>
            <DialogDescription>
              {formMode === 'create' ? 'Create a new student profile.' : 'Edit existing student profile details.'}
            </DialogDescription>
          </DialogHeader>
          {showProfileDialog && (
            <StudentProfileForm
              mode={formMode}
              studentProfileId={selectedStudent?.id}
              userId={selectedStudent?.userId}
              onFormSubmitSuccess={() => {
                setShowProfileDialog(false);
                fetchData();
              }}
              onCancel={() => setShowProfileDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {studentToDelete && (
        <AlertDialog open={!!studentToDelete} onOpenChange={() => setStudentToDelete(undefined)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will delete the student profile. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDeleteStudent} 
                className="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 dark:text-slate-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Deleting..." : "Delete Profile"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default ManageStudentsPage;
