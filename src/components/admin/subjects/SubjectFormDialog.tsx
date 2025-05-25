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
}

export function SubjectFormDialog({
  open,
  onOpenChange,
  onSubjectSubmitSuccess,
  initialData,
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
        />
      </DialogContent>
    </Dialog>
  );
} 