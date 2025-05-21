import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { SubjectsList } from '@/components/admin/subjects/SubjectsList';
import { SubjectFormDialog } from '@/components/admin/subjects/SubjectForm';
import { toast } from 'sonner';

interface Subject {
  id: string;
  name: string;
  description: string;
  teacherId: string;
  teacherName: string;
}

// Временные данные для демонстрации
const mockSubjects: Subject[] = [
  {
    id: '1',
    name: 'Математический анализ',
    description: 'Курс математического анализа для первого курса',
    teacherId: 'teacher1',
    teacherName: 'Иванов И.И.',
  },
  {
    id: '2',
    name: 'Программирование',
    description: 'Основы программирования на Python',
    teacherId: 'teacher2',
    teacherName: 'Петров П.П.',
  },
];

const mockTeachers = [
  { id: 'teacher1', name: 'Иванов И.И.' },
  { id: 'teacher2', name: 'Петров П.П.' },
  { id: 'teacher3', name: 'Сидоров С.С.' },
];

const SubjectsPage: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>(mockSubjects);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | undefined>();

  const handleEdit = (subject: Subject) => {
    setSelectedSubject(subject);
    setIsFormOpen(true);
  };

  const handleDelete = (subjectId: string) => {
    setSubjects((prev) => prev.filter((subject) => subject.id !== subjectId));
    toast.success('Предмет удален');
  };

  const handleSubjectSubmit = (data: Omit<Subject, 'id' | 'teacherName'>) => {
    if (selectedSubject) {
      // Обновление существующего предмета
      const teacher = mockTeachers.find((t) => t.id === data.teacherId);
      setSubjects((prev) =>
        prev.map((subject) =>
          subject.id === selectedSubject.id
            ? { ...subject, ...data, teacherName: teacher?.name || '' }
            : subject
        )
      );
      toast.success('Предмет обновлен');
    } else {
      // Добавление нового предмета
      const teacher = mockTeachers.find((t) => t.id === data.teacherId);
      const newSubject: Subject = {
        id: Date.now().toString(),
        ...data,
        teacherName: teacher?.name || '',
      };
      setSubjects((prev) => [...prev, newSubject]);
      toast.success('Предмет добавлен');
    }
    setIsFormOpen(false);
    setSelectedSubject(undefined);
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
        teachers={mockTeachers}
      />
    </motion.div>
  );
};

export default SubjectsPage; 