import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import SubjectForm from './SubjectForm';
import type { Subject } from '@/types';

interface SubjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubjectSubmitSuccess: (data: Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>) => void;
  initialData?: Subject;
  teachers: Array<{ id: string; firstName: string; lastName: string; patronymic?: string }>;
}

export function SubjectFormDialog({
  open,
  onOpenChange,
  onSubjectSubmitSuccess,
  initialData,
  teachers,
}: SubjectFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Subject' : 'Create Subject'}</DialogTitle>
        </DialogHeader>
        <SubjectForm
          mode={initialData ? 'edit' : 'create'}
          subjectId={initialData?.id}
          onFormSubmitSuccess={onSubjectSubmitSuccess}
          onCancel={() => onOpenChange(false)}
          teachers={teachers}
        />
      </DialogContent>
    </Dialog>
  );
} 