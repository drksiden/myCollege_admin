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
import { getSubjects, createSubject, updateSubject, deleteSubject } from '@/lib/firebaseService/subjectService';
import type { Subject } from '@/types';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { SubjectFormDialog } from './SubjectFormDialog';

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      setLoading(true);
      const data = await getSubjects();
      setSubjects(data);
    } catch (error) {
      console.error('Error loading subjects:', error);
      toast.error('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectSubmit = async (data: Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editingSubject) {
        await updateSubject(db, editingSubject.id, data);
        toast.success('Subject updated successfully');
      } else {
        await createSubject(db, data);
        toast.success('Subject created successfully');
      }
      setIsDialogOpen(false);
      setEditingSubject(null);
      loadSubjects();
    } catch (error) {
      console.error('Error saving subject:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save subject');
    }
  };

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setIsDialogOpen(true);
  };

  const handleDelete = async (subject: Subject) => {
    if (window.confirm(`Are you sure you want to delete ${subject.name}?`)) {
      try {
        await deleteSubject(db, subject.id);
        toast.success('Subject deleted successfully');
        loadSubjects();
      } catch (error) {
        console.error('Error deleting subject:', error);
        toast.error('Failed to delete subject');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Subjects</h1>
        <Button onClick={() => setIsDialogOpen(true)}>Add Subject</Button>
      </div>

      <SubjectFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubjectSubmitSuccess={handleSubjectSubmit}
        initialData={editingSubject || undefined}
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Hours</TableHead>
            <TableHead>Credits</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subjects.map((subject) => (
            <TableRow key={subject.id}>
              <TableCell>{subject.name}</TableCell>
              <TableCell>{subject.description}</TableCell>
              <TableCell>{subject.type}</TableCell>
              <TableCell>{subject.hours}</TableCell>
              <TableCell>{subject.credits}</TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(subject)}>
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(subject)}>
                    Delete
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 