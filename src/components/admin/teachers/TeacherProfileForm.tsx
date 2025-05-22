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
import { Textarea } from '@/components/ui/textarea';
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
import { getAllSubjects } from '@/lib/firebaseService/subjectService';
import type { Teacher, Subject } from '@/types';

// Обновленная Zod-схема для TeacherProfileForm
const teacherProfileSchema = z.object({
  specialization: z.string().min(1, 'Specialization is required').max(100, 'Specialization too long'),
  experience: z.coerce.number().min(0, 'Experience cannot be negative').max(60, 'Experience seems too high'),
  education: z.string().min(1, 'Education details are required').max(500, 'Education details too long'),
  subjects: z.array(z.string()).min(1, 'At least one subject is required'),
  groups: z.array(z.string()).min(1, 'At least one group is required'),
});

export type TeacherProfileFormValues = z.infer<typeof teacherProfileSchema>;

interface TeacherProfileFormProps {
  mode: 'create' | 'edit';
  userId?: string; // Required for 'create' mode to link to a User
  teacherProfileId?: string; // Required for 'edit' mode
  userName?: string; // For display purposes
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
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  const form = useForm<TeacherProfileFormValues>({
    resolver: zodResolver(teacherProfileSchema),
    defaultValues: {
      specialization: '',
      experience: 0,
      education: '',
      subjects: [],
      groups: [],
    },
  });

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const subjectsList = await getAllSubjects(db);
        setSubjects(subjectsList);
      } catch (error) {
        console.error('Error fetching subjects:', error);
        toast.error('Failed to load subjects');
      }
    };

    fetchSubjects();
  }, []);

  useEffect(() => {
    if (mode === 'edit' && teacherProfileId) {
      const fetchProfile = async () => {
        setInitialDataLoading(true);
        try {
          const profile = await getTeacherProfile(db, teacherProfileId);
          if (profile) {
            setSelectedSubjects(profile.subjects);
            form.reset({
              specialization: profile.specialization,
              experience: profile.experience,
              education: profile.education,
              subjects: profile.subjects,
              groups: profile.groups,
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
    } else {
      // Reset form for 'create' mode or if IDs are missing
      form.reset({
        specialization: '',
        experience: 0,
        education: '',
        subjects: [],
        groups: [],
      });
    }
  }, [mode, teacherProfileId, form, onCancel]);

  const onSubmit = async (values: TeacherProfileFormValues) => {
    setIsLoading(true);
    try {
      const profileDataForService: Pick<Teacher, 'userId' | 'subjects' | 'groups' | 'specialization' | 'experience' | 'education'> = {
        specialization: values.specialization,
        experience: values.experience,
        education: values.education,
        subjects: values.subjects,
        groups: values.groups,
        userId: userId!,
      };

      if (mode === 'create') {
        if (!userId) {
          toast.error('User ID is missing. Cannot create teacher profile.');
          setIsLoading(false);
          return;
        }
        await createTeacherProfile(db, profileDataForService);
        await updateUserInFirestore(db, userId, {});
        toast.success(`Teacher profile created for ${userName || 'user'} and linked.`);
      } else if (mode === 'edit' && teacherProfileId) {
        await updateTeacherProfile(db, teacherProfileId, profileDataForService);
        toast.success(`Teacher profile for ${userName || 'user'} updated.`);
      }
      onFormSubmitSuccess();
      form.reset();
    } catch (error: unknown) {
      console.error('Error submitting teacher profile:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save teacher profile.');
    } finally {
      setIsLoading(false);
    }
  };
  
  if (initialDataLoading && mode === 'edit') {
    return <p className="text-center p-4">Loading profile data...</p>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6 p-1">
        <FormField
          control={form.control}
          name="specialization"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Specialization</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Computer Science, Mathematics" {...field} disabled={isLoading} />
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
              <FormLabel>Experience (Years)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 5" {...field} disabled={isLoading} />
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
              <FormLabel>Education</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g., PhD in Physics from XYZ University" {...field} rows={3} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="subjects"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subjects Taught</FormLabel>
              <Select
                onValueChange={(value) => {
                  const newSubjects = [...selectedSubjects, value];
                  setSelectedSubjects(newSubjects);
                  field.onChange(newSubjects);
                }}
                disabled={isLoading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subjects" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {subjects
                    .filter((subject) => !selectedSubjects.includes(subject.id))
                    .map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <div className="mt-2 space-y-2">
                {selectedSubjects.map((subjectId) => {
                  const subject = subjects.find((s) => s.id === subjectId);
                  return (
                    <div
                      key={subjectId}
                      className="flex items-center justify-between p-2 bg-secondary rounded-md"
                    >
                      <span>{subject?.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newSubjects = selectedSubjects.filter((id) => id !== subjectId);
                          setSelectedSubjects(newSubjects);
                          field.onChange(newSubjects);
                        }}
                        disabled={isLoading}
                      >
                        Remove
                      </Button>
                    </div>
                  );
                })}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="groups"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Groups Managed</FormLabel>
              <FormControl>
                <Input placeholder="Group A, Group B (comma-separated)" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-3 pt-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isLoading || (initialDataLoading && mode === 'edit')}>
            {isLoading ? 'Saving...' : (mode === 'create' ? 'Create Profile' : 'Save Changes')}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default TeacherProfileForm;
