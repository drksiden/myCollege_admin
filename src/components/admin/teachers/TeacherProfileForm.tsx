import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import {
  createTeacherProfile,
  updateTeacherProfile,
  getTeacherProfile,
} from '@/lib/firebaseService/teacherService';
import { updateUserInFirestore } from '@/lib/firebaseService/userService';
import type { Teacher } from '@/types';

const teacherProfileSchema = z.object({
  specialization: z.string().min(1, 'Специализация обязательна'),
  experience: z.number().min(0, 'Опыт должен быть положительным числом'),
  education: z.string().min(1, 'Образование обязательно'),
});

export type TeacherProfileFormValues = z.infer<typeof teacherProfileSchema>;

interface TeacherProfileFormProps {
  mode: 'create' | 'edit';
  userId?: string; // Required for 'create' mode
  teacherProfileId?: string; // Required for 'edit' mode
  userName?: string; // For display
  onFormSubmitSuccess: () => void;
  onCancel?: () => void;
}

const TeacherProfileForm: React.FC<TeacherProfileFormProps> = ({
  mode,
  userId,
  teacherProfileId,
  userName,
  onFormSubmitSuccess,
  onCancel,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [initialDataLoading, setInitialDataLoading] = useState(false);

  const form = useForm<TeacherProfileFormValues>({
    resolver: zodResolver(teacherProfileSchema),
    defaultValues: {
      specialization: '',
      experience: 0,
      education: '',
    },
  });

  useEffect(() => {
    if (mode === 'edit' && teacherProfileId) {
      const fetchProfile = async () => {
        setInitialDataLoading(true);
        try {
          const profile = await getTeacherProfile(db, teacherProfileId);
          if (profile) {
            form.reset({
              specialization: profile.specialization,
              experience: profile.experience,
              education: profile.education,
            });
          } else {
            toast.error('Teacher profile not found.');
            if (onCancel) onCancel();
          }
        } catch (error) {
          console.error('Error fetching teacher profile:', error);
          toast.error('Failed to load teacher profile.');
          if (onCancel) onCancel();
        } finally {
          setInitialDataLoading(false);
        }
      };
      fetchProfile();
    }
  }, [mode, teacherProfileId, form, onCancel]);

  const onSubmit = async (values: TeacherProfileFormValues) => {
    setIsLoading(true);
    try {
      if (mode === 'create') {
        if (!userId) {
          toast.error('User ID is missing. Cannot create teacher profile.');
          setIsLoading(false);
          return;
        }
        // Create teacher profile
        const profileDataForService = {
          userId: userId,
          specialization: values.specialization,
          experience: values.experience,
          education: values.education,
          subjects: [],
          groups: [],
        };
        await createTeacherProfile(db, profileDataForService);
        // Link this teacher profile ID to the user document
        await updateUserInFirestore(db, userId, { role: 'teacher' });
        toast.success(`Teacher profile created for ${userName || 'user'} and linked.`);
      } else if (mode === 'edit' && teacherProfileId) {
        // Update existing teacher profile
        const profileDataForService = {
          specialization: values.specialization,
          experience: values.experience,
          education: values.education,
        };
        await updateTeacherProfile(db, teacherProfileId, profileDataForService);
        toast.success(`Teacher profile for ${userName || 'user'} updated.`);
      }
      onFormSubmitSuccess();
      if (mode === 'create') form.reset();
    } catch (error: unknown) {
      console.error('Error submitting teacher profile:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save teacher profile.');
    } finally {
      setIsLoading(false);
    }
  };

  if (initialDataLoading && mode === 'edit') {
    return <p className="text-center p-4">Загрузка данных профиля...</p>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6 p-1">
        <FormField
          control={form.control}
          name="specialization"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Специализация</FormLabel>
              <FormControl>
                <Input placeholder="Введите специализацию" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="experience"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Опыт работы (лет)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  min="0"
                  placeholder="Введите опыт работы" 
                  {...field} 
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  disabled={isLoading} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="education"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Образование</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите уровень образования" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="bachelor">Бакалавр</SelectItem>
                  <SelectItem value="master">Магистр</SelectItem>
                  <SelectItem value="phd">Кандидат наук</SelectItem>
                  <SelectItem value="professor">Профессор</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Отмена
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default TeacherProfileForm;
