import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { Schedule } from '@/types';
import { toast } from 'sonner';
import { Trash2, Plus } from 'lucide-react';

const DAYS_OF_WEEK = [
  { value: 1, label: 'Понедельник' },
  { value: 2, label: 'Вторник' },
  { value: 3, label: 'Среда' },
  { value: 4, label: 'Четверг' },
  { value: 5, label: 'Пятница' },
  { value: 6, label: 'Суббота' },
];

const entrySchema = z.object({
  dayOfWeek: z.coerce.number().min(1, 'День недели обязателен (1-7)').max(7, 'День недели должен быть от 1 до 7'),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Неверный формат времени (ЧЧ:ММ)'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Неверный формат времени (ЧЧ:ММ)'),
  subjectId: z.string().min(1, 'Предмет обязателен'),
  teacherId: z.string().min(1, 'Преподаватель обязателен'),
  room: z.string().min(1, 'Аудитория обязательна'),
  type: z.enum(['lecture', 'practice', 'laboratory'], {
    required_error: 'Тип занятия обязателен',
  }),
  weekType: z.enum(['odd', 'even', 'all']).optional(),
}).refine(data => data.startTime < data.endTime, {
  message: 'Время окончания должно быть позже времени начала',
  path: ['endTime'],
});

const formSchema = z.object({
  groupId: z.string().min(1, 'Группа обязательна'),
  semester: z.coerce.number().min(1, 'Семестр от 1 до 8').max(8, 'Семестр от 1 до 8'),
  year: z.coerce.number().min(2000, 'Год от 2000 до 2100').max(2100, 'Год от 2000 до 2100'),
  lessons: z.array(entrySchema),
});

type ScheduleFormValues = z.infer<typeof formSchema>;

interface ScheduleFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schedule?: Schedule;
}

interface CloudFunctionResponse<T> {
  data: {
    success: boolean;
    message?: string;
  } & T;
}

interface GroupsResponse {
  groups: Array<{ id: string; name: string }>;
}

interface SubjectsResponse {
  subjects: Array<{ id: string; name: string }>;
}

interface TeachersResponse {
  teachers: Array<{ id: string; firstName: string; lastName: string; middleName?: string }>;
}

export default function ScheduleFormDialog({
  open,
  onClose,
  onSuccess,
  schedule,
}: ScheduleFormDialogProps) {
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([]);
  const [teachers, setTeachers] = useState<Array<{ id: string; firstName: string; lastName: string; middleName?: string }>>([]);
  const [loading, setLoading] = useState(false);

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      groupId: schedule?.groupId || '',
      semester: schedule?.semester || 1,
      year: schedule?.year || new Date().getFullYear(),
      lessons: schedule?.lessons || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lessons',
  });

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    try {
      const functions = getFunctions();
      const [groupsResult, subjectsResult, teachersResult] = await Promise.all([
        httpsCallable<{ data: Record<string, never> }, CloudFunctionResponse<GroupsResponse>>(functions, 'getGroups')({ data: {} }),
        httpsCallable<{ data: Record<string, never> }, CloudFunctionResponse<SubjectsResponse>>(functions, 'getSubjects')({ data: {} }),
        httpsCallable<{ data: Record<string, never> }, CloudFunctionResponse<TeachersResponse>>(functions, 'getTeachers')({ data: {} }),
      ]);

      setGroups(groupsResult.data.data.groups);
      setSubjects(subjectsResult.data.data.subjects);
      setTeachers(teachersResult.data.data.teachers);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    }
  };

  const onSubmit = async (values: ScheduleFormValues) => {
    try {
      setLoading(true);
      const functions = getFunctions();
      const createScheduleFn = httpsCallable(functions, 'createSchedule');
      const updateScheduleFn = httpsCallable(functions, 'updateSchedule');

      if (schedule) {
        await updateScheduleFn({
          scheduleId: schedule.id,
          data: values,
        });
        toast.success('Schedule updated successfully');
      } else {
        await createScheduleFn({ data: values });
        toast.success('Schedule created successfully');
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error('Failed to save schedule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {schedule ? 'Редактировать расписание' : 'Создать расписание'}
          </DialogTitle>
          <DialogDescription>
            Заполните информацию о расписании ниже.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="groupId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Группа</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите группу" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="semester"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Семестр</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={8} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Год</FormLabel>
                    <FormControl>
                      <Input type="number" min={2000} max={2100} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Занятия</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({
                    dayOfWeek: 1,
                    startTime: '09:00',
                    endTime: '10:30',
                    subjectId: '',
                    teacherId: '',
                    room: '',
                    type: 'lecture',
                  })}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Добавить занятие
                </Button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-lg space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Занятие {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <FormField
                    control={form.control}
                    name={`lessons.${index}.dayOfWeek`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>День недели</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(Number(value))}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите день недели" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {DAYS_OF_WEEK.map((day) => (
                              <SelectItem key={day.value} value={day.value.toString()}>
                                {day.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`lessons.${index}.startTime`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Время начала</FormLabel>
                          <FormControl>
                            <Input type="time" lang="ru" step="300" placeholder="08:30" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`lessons.${index}.endTime`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Время окончания</FormLabel>
                          <FormControl>
                            <Input type="time" lang="ru" step="300" placeholder="10:00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`lessons.${index}.subjectId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Предмет</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите предмет" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {subjects.map((subject) => (
                                <SelectItem key={subject.id} value={subject.id}>
                                  {subject.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`lessons.${index}.teacherId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Преподаватель</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите преподавателя" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {teachers.map((teacher) => (
                                <SelectItem key={teacher.id} value={teacher.id}>
                                  {`${teacher.firstName} ${teacher.lastName}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name={`lessons.${index}.room`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Аудитория</FormLabel>
                        <FormControl>
                          <Input type="text" placeholder="Например: 101, Онлайн" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Сохранение...' : schedule ? 'Сохранить изменения' : 'Создать расписание'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 