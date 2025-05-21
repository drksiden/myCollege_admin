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
import { MoreHorizontal, PlusCircle, Edit2, Trash2, BookOpen } from 'lucide-react';
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
  getAllSubjects,
  deleteSubject,
} from '@/lib/firebaseService/subjectService';
import SubjectForm from '@/components/admin/subjects/SubjectForm';
import type { Subject } from '@/types';
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
// import { format } from 'date-fns'; // Not strictly needed for this page's current display

const ManageSubjectsPage: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [showSubjectDialog, setShowSubjectDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedSubjects = await getAllSubjects(db);
      setSubjects(fetchedSubjects);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast.error('Failed to load subjects.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenCreateDialog = () => {
    setSelectedSubject(null);
    setFormMode('create');
    setShowSubjectDialog(true);
  };

  const handleOpenEditDialog = (subject: Subject) => {
    setSelectedSubject(subject);
    setFormMode('edit');
    setShowSubjectDialog(true);
  };

  const handleFormSuccess = () => {
    setShowSubjectDialog(false);
    setSelectedSubject(null); // Clear selection
    fetchData(); // Refresh data
  };

  const handleDeleteInitiate = (subject: Subject) => {
    setSubjectToDelete(subject);
  };

  const confirmDeleteSubject = async () => {
    if (!subjectToDelete) return;
    try {
      await deleteSubject(db, subjectToDelete.id);
      toast.success(`Subject "${subjectToDelete.name}" deleted successfully.`);
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error deleting subject:', error);
      toast.error('Failed to delete subject.');
    } finally {
      setSubjectToDelete(null); // Close dialog
    }
  };
  
  const getSubjectTypeName = (type: Subject['type'] | undefined) => {
    if (!type) return 'N/A';
    switch(type) {
      case 'lecture': return 'Lecture';
      case 'practice': return 'Practice';
      case 'laboratory': return 'Laboratory';
      default: 
        const exhaustiveCheck: never = type; // Ensures all cases are handled
        return 'N/A';
    }
  };

  if (isLoading && subjects.length === 0) {
    return <p className="text-center p-10">Loading subjects...</p>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <Toaster richColors position="top-right" />
      <Dialog open={showSubjectDialog} onOpenChange={(open) => {
        if (!open) {
          setSelectedSubject(null); // Clear selection when dialog is closed by any means
        }
        setShowSubjectDialog(open);
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {formMode === 'create' ? 'Create New Subject' : 'Edit Subject'}
            </DialogTitle>
            <DialogDescription>
              {formMode === 'create'
                ? 'Fill in the details to add a new subject to the catalog.'
                : `Editing the subject: ${selectedSubject?.name || ''}`}
            </DialogDescription>
          </DialogHeader>
          {/* Render form only when dialog is open to ensure correct initial values */}
          {showSubjectDialog && (
            <SubjectForm
              mode={formMode}
              subjectId={selectedSubject?.id}
              onFormSubmitSuccess={handleFormSuccess}
              onCancel={() => setShowSubjectDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {subjectToDelete && (
        <AlertDialog open={!!subjectToDelete} onOpenChange={() => setSubjectToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will permanently delete the subject <span className="font-semibold">"{subjectToDelete.name}"</span>.
                This operation cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteSubject} className="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 dark:text-slate-50">Delete Subject</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Subject Management</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage academic subjects offered in the institution.
            </p>
          </div>
          <Button onClick={handleOpenCreateDialog}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Subject
          </Button>
        </div>
      </header>

      <section>
        <div className="bg-card shadow sm:rounded-lg">
          {subjects.length === 0 && !isLoading ? (
            <div className="p-10 text-center text-muted-foreground">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium">No subjects found</h3>
              <p className="mt-1 text-sm">Get started by adding a new subject to the catalog.</p>
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[25%]">Name</TableHead>
                <TableHead className="w-[15%]">Type</TableHead>
                <TableHead className="w-[15%] text-center">Hours/Semester</TableHead>
                <TableHead className="w-[35%]">Description</TableHead>
                <TableHead className="text-right w-[10%]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjects.map(subject => (
                <TableRow key={subject.id}>
                  <TableCell className="font-medium">{subject.name}</TableCell>
                  <TableCell>{getSubjectTypeName(subject.type)}</TableCell>
                  <TableCell className="text-center">{subject.hoursPerSemester}</TableCell>
                  <TableCell className="truncate max-w-sm" title={subject.description}>{subject.description}</TableCell>
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
                        <DropdownMenuItem onClick={() => handleOpenEditDialog(subject)}>
                          <Edit2 className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDeleteInitiate(subject)} 
                          className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-800"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
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

export default ManageSubjectsPage;
