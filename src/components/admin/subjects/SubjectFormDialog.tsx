// src/components/admin/subjects/SubjectFormDialog.tsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, BookOpen, Clock, FileText } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { createSubject, updateSubject, getSubject } from '@/lib/firebaseService/subjectService';
import { motion } from 'framer-motion';

const subjectFormSchema = z.object({
  name: z.string().min(2, 'Название должно содержать минимум 2 символа').max(100, 'Название слишком длинное'),
  description: z.string().optional(),
  hoursPerWeek: z.number().min(1, 'Минимум 1 час в неделю').max(40, 'Максимум 40 часов в неделю').optional(),
});

type SubjectFormValues = z.infer<typeof subjectFormSchema>;

interface SubjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  subjectId?: string;
  onSuccess: () => void;
}

const SubjectFormDialog: React.FC<SubjectFormDialogProps> = ({
  open,
  onOpenChange,
  mode,
  subjectId,
  onSuccess,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectFormSchema),
    defaultValues: {
      name: '',
      description: '',
      hoursPerWeek: undefined,
    },
  });

  // Загружаем данные предмета для редактирования
  useEffect(() => {
    if (mode === 'edit' && subjectId && open) {
      setIsLoadingData(true);
      getSubject(subjectId)
        .then((subject) => {
          if (subject) {
            reset({
              name: subject.name,
              description: subject.description || '',
              hoursPerWeek: subject.hoursPerWeek,
            });
          }
        })
        .catch(() => {
          toast.error('Не удалось загрузить данные предмета');
        })
        .finally(() => {
          setIsLoadingData(false);
        });
    } else if (mode === 'create' && open) {
      reset({
        name: '',
        description: '',
        hoursPerWeek: undefined,
      });
    }
  }, [mode, subjectId, open, reset]);

  const onSubmit = async (data: SubjectFormValues) => {
    setIsLoading(true);
    try {
      const subjectData = {
        name: data.name,
        description: data.description || '',
        hoursPerWeek: data.hoursPerWeek,
      };

      if (mode === 'create') {
        await createSubject(subjectData);
        toast.success('Предмет успешно создан');
      } else if (mode === 'edit' && subjectId) {
        await updateSubject(subjectId, subjectData);
        toast.success('Предмет успешно обновлен');
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving subject:', error);
      toast.error(`Не удалось ${mode === 'create' ? 'создать' : 'обновить'} предмет`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    reset();
  };

  const formVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            {mode === 'create' ? 'Создать новый предмет' : 'Редактировать предмет'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Добавьте новый предмет в учебную программу' 
              : 'Измените информацию о предмете'
            }
          </DialogDescription>
        </DialogHeader>

        {isLoadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <motion.div
            variants={formVariants}
            initial="hidden"
            animate="visible"
          >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Название предмета */}
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Название предмета *
                </Label>
                <Input
                  id="name"
                  placeholder="Введите название предмета"
                  {...register('name')}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              {/* Часов в неделю */}
              <div className="space-y-2">
                <Label htmlFor="hoursPerWeek" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Часов в неделю
                </Label>
                <Input
                  id="hoursPerWeek"
                  type="number"
                  placeholder="4"
                  {...register('hoursPerWeek', { valueAsNumber: true })}
                  className={errors.hoursPerWeek ? 'border-red-500' : ''}
                />
                {errors.hoursPerWeek && (
                  <p className="text-sm text-red-500">{errors.hoursPerWeek.message}</p>
                )}
              </div>

              {/* Описание */}
              <div className="space-y-2">
                <Label htmlFor="description" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Описание
                </Label>
                <Textarea
                  id="description"
                  placeholder="Краткое описание предмета..."
                  rows={4}
                  {...register('description')}
                  className={errors.description ? 'border-red-500' : ''}
                />
                {errors.description && (
                  <p className="text-sm text-red-500">{errors.description.message}</p>
                )}
              </div>

              <DialogFooter className="flex gap-2 pt-4 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleClose}
                  disabled={isLoading}
                >
                  Отмена
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {mode === 'create' ? 'Создание...' : 'Сохранение...'}
                    </>
                  ) : (
                    <>
                      <BookOpen className="h-4 w-4" />
                      {mode === 'create' ? 'Создать предмет' : 'Сохранить изменения'}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SubjectFormDialog;