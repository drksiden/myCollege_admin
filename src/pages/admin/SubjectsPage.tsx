import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { SubjectsList } from '@/components/admin/subjects/SubjectsList';
import { SubjectFormDialog } from '@/components/admin/subjects/SubjectFormDialog';
import { toast } from 'sonner';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { Subject } from '@/types';

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  patronymic?: string;
}

const SubjectsPage: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | undefined>();
  const [loading, setLoading] = useState(true);

  const functions = getFunctions();

  // Загрузка предметов
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const getSubjectsFn = httpsCallable(functions, 'getSubjects');
        const result = await getSubjectsFn();
        const { subjects } = result.data as { subjects: Subject[] };
        setSubjects(subjects);
      } catch (error) {
        console.error('Error fetching subjects:', error);
        toast.error('Ошибка при загрузке предметов');
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
  }, []);

  // Загрузка преподавателей
  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const getTeachersFn = httpsCallable(functions, 'getTeachers');
        const result = await getTeachersFn();
        const { teachers } = result.data as { teachers: Teacher[] };
        setTeachers(teachers);
      } catch (error) {
        console.error('Error fetching teachers:', error);
        toast.error('Ошибка при загрузке преподавателей');
      }
    };

    fetchTeachers();
  }, []);

  const handleEdit = (subject: Subject) => {
    setSelectedSubject(subject);
    setIsFormOpen(true);
  };

  const handleDelete = async (subjectId: string) => {
    try {
      const deleteSubjectFn = httpsCallable(functions, 'deleteSubject');
      await deleteSubjectFn({ id: subjectId });
      setSubjects(prev => prev.filter(subject => subject.id !== subjectId));
      toast.success('Предмет удален');
    } catch (error) {
      console.error('Error deleting subject:', error);
      toast.error('Ошибка при удалении предмета');
    }
  };

  const handleSubjectSubmit = async (data: Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (selectedSubject) {
        // Обновление существующего предмета
        const updateSubjectFn = httpsCallable(functions, 'updateSubject');
        const result = await updateSubjectFn({
          id: selectedSubject.id,
          ...data
        });
        const { subject } = result.data as { subject: Subject };
        setSubjects(prev => prev.map(s => s.id === subject.id ? subject : s));
        toast.success('Предмет обновлен');
      } else {
        // Добавление нового предмета
        const createSubjectFn = httpsCallable(functions, 'createSubject');
        const result = await createSubjectFn(data);
        const { subject } = result.data as { subject: Subject };
        setSubjects(prev => [...prev, subject]);
        toast.success('Предмет добавлен');
      }
      setIsFormOpen(false);
      setSelectedSubject(undefined);
    } catch (error) {
      console.error('Error saving subject:', error);
      toast.error('Ошибка при сохранении предмета');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col gap-4"
    >
      <div className="flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Предметы
        </h1>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Добавить предмет
        </Button>
      </div>

      <SubjectsList
        subjects={subjects}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={loading}
      />

      <SubjectFormDialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) {
            setSelectedSubject(undefined);
          }
        }}
        onSubjectSubmitSuccess={handleSubjectSubmit}
        initialData={selectedSubject}
        teachers={teachers}
      />
    </motion.div>
  );
};

export default SubjectsPage; 