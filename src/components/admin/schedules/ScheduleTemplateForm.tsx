import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { Lesson } from '@/types';
import type { ScheduleTemplate } from '@/lib/firebaseService/scheduleTemplateService';

interface ScheduleTemplateFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveTemplate: (template: { name: string; description: string; lessons: Lesson[] }) => void;
  lessons: Lesson[];
  template: ScheduleTemplate | null;
}

const ScheduleTemplateForm: React.FC<ScheduleTemplateFormProps> = ({
  open,
  onOpenChange,
  onSaveTemplate,
  lessons,
  template,
}) => {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');

  React.useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description);
    } else {
      resetForm();
    }
  }, [template]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Пожалуйста, введите название шаблона');
      return;
    }

    onSaveTemplate({
      name: name.trim(),
      description: description.trim(),
      lessons,
    });

    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setDescription('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{template ? 'Редактировать шаблон' : 'Сохранить как шаблон'}</DialogTitle>
          <DialogDescription>
            {template
              ? 'Измените детали шаблона.'
              : 'Сохраните это расписание как шаблон для будущего использования.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Название шаблона</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Введите название шаблона"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Описание (необязательно)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Введите описание шаблона"
              rows={3}
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Отмена
              </Button>
            </DialogClose>
            <Button type="submit">{template ? 'Обновить шаблон' : 'Сохранить шаблон'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleTemplateForm; 