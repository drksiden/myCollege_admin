import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getAllSubjects, deleteSubject } from '@/lib/firebaseService/subjectService';
import type { Subject } from '@/types';
import SubjectFormDialog from './SubjectFormDialog';
import { SubjectsList } from './SubjectsList';

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
      const data = await getAllSubjects();
      setSubjects(data);
    } catch (error) {
      console.error('Error loading subjects:', error);
      toast.error('Не удалось загрузить предметы');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setIsDialogOpen(true);
  };

  const handleDelete = async (subjectId: string) => {
    try {
      await deleteSubject(subjectId);
      toast.success('Предмет успешно удален');
      loadSubjects();
    } catch (error) {
      console.error('Error deleting subject:', error);
      toast.error('Не удалось удалить предмет');
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
        <h1 className="text-2xl font-bold">Предметы</h1>
        <Button onClick={() => setIsDialogOpen(true)}>Добавить предмет</Button>
      </div>

      <SubjectFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        mode={editingSubject ? 'edit' : 'create'}
        subjectId={editingSubject?.id}
        onSuccess={() => {
          loadSubjects();
          setEditingSubject(null);
        }}
      />

      <SubjectsList
        subjects={subjects}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={loading}
      />
    </div>
  );
} 