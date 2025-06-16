import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { createGrade } from '@/lib/firebaseService/gradeService';
import type { GradeValue, GradeType, Subject, Group } from '@/types';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/lib/auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface GradeImportProps {
  teacherId: string;
  onSuccess?: () => void;
}

interface ExcelRow {
  'Student ID': string;
  'Subject ID': string;
  'Grade': number | string;
  'Type': string;
  'Semester ID': string;
  'Comment'?: string;
}

// Функция для преобразования числовой оценки в GradeValue
const convertToGradeValue = (value: number | string): GradeValue => {
  if (typeof value === 'string') {
    if (['5', '4', '3', '2', 'н/а', 'зачет', 'незачет'].includes(value)) {
      return value as GradeValue;
    }
  }
  
  const numValue = Number(value);
  if (numValue >= 90) return '5';
  if (numValue >= 75) return '4';
  if (numValue >= 60) return '3';
  return '2';
};

// Функция для преобразования строкового типа в GradeType
const convertToGradeType = (type: string): GradeType => {
  const typeMap: Record<string, GradeType> = {
    'current': 'current',
    'midterm': 'midterm',
    'exam': 'exam',
    'final': 'final',
    'текущая': 'current',
    'рубежная': 'midterm',
    'экзамен': 'exam',
    'итоговая': 'final'
  };
  
  return typeMap[type.toLowerCase()] || 'current';
};

const formSchema = z.object({
  grade: z.number().min(2).max(5),
  date: z.string(),
  semesterId: z.string(),
  journalId: z.string(),
  groupId: z.string(),
});

type BulkGradeFormValues = z.infer<typeof formSchema>;

interface BulkGradeInputProps {
  subjects: Subject[];
  groups: Group[];
  onSuccess?: () => void;
}

export function BulkGradeInput({ subjects, groups, onSuccess }: BulkGradeInputProps) {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<BulkGradeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      grade: 5,
      date: new Date().toISOString().split('T')[0],
      semesterId: '',
      journalId: '',
      groupId: '',
    },
  });

  const handleSubmit = async (values: BulkGradeFormValues) => {
    if (!user) {
      toast.error('Пользователь не авторизован');
      return;
    }

    try {
      setLoading(true);
      const gradeData = {
        studentId: values.groupId, // Временно используем groupId как studentId
        journalId: values.journalId,
        semesterId: values.semesterId,
        teacherId: user.uid,
        grade: values.grade.toString() as GradeValue,
        gradeType: 'current' as GradeType,
        date: Timestamp.now(),
        attendanceStatus: 'present',
        present: true,
        topicCovered: 'completed'
      };
      await createGrade(gradeData);
      toast.success('Оценка успешно добавлена');
      onSuccess?.();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error adding grade:', error);
      toast.error('Ошибка при добавлении оценки');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button>Добавить оценку</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Добавить оценку</DialogTitle>
          <DialogDescription>
            Выберите группу и предмет для добавления оценки.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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

            <FormField
              control={form.control}
              name="journalId"
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
              name="grade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Оценка</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={2}
                      max={5}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Дата</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="semesterId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Семестр</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите семестр" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="current_semester">Текущий семестр</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={loading}>Сохранить</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function GradeImport({ teacherId, onSuccess }: GradeImportProps) {
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(worksheet);

          // Validate and process each row
          for (const row of jsonData) {
            const gradeData = {
              studentId: row['Student ID'],
              journalId: row['Subject ID'],
              teacherId,
              grade: convertToGradeValue(row['Grade']),
              gradeType: convertToGradeType(row['Type']),
              semesterId: row['Semester ID'],
              date: Timestamp.now(),
              comment: row['Comment'],
              attendanceStatus: 'present',
              present: true,
              topicCovered: 'completed'
            };

            // Validate required fields
            if (!gradeData.studentId || !gradeData.journalId || !gradeData.semesterId) {
              throw new Error(`Неверные данные в строке: ${JSON.stringify(row)}`);
            }

            await createGrade(gradeData);
          }

          toast.success('Оценки успешно импортированы');
          onSuccess?.();
        } catch (error) {
          console.error('Error processing file:', error);
          toast.error('Ошибка при обработке файла: ' + (error as Error).message);
        } finally {
          setLoading(false);
        }
      };

      reader.onerror = () => {
        toast.error('Ошибка при чтении файла');
        setLoading(false);
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Ошибка при загрузке файла');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="file">Импорт оценок из Excel</Label>
        <Input
          id="file"
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileUpload}
          disabled={loading}
        />
      </div>
      <div className="text-sm text-muted-foreground">
        <p>Excel файл должен содержать следующие столбцы:</p>
        <ul className="list-disc list-inside">
          <li>Student ID (ID студента)</li>
          <li>Subject ID (ID предмета)</li>
          <li>Grade (Оценка: число от 0 до 100 или текст: 5, 4, 3, 2, н/а, зачет, незачет)</li>
          <li>Type (Тип: current/midterm/exam/final или текущая/рубежная/экзамен/итоговая)</li>
          <li>Semester ID (ID семестра)</li>
          <li>Comment (Комментарий, необязательно)</li>
        </ul>
      </div>
    </div>
  );
} 