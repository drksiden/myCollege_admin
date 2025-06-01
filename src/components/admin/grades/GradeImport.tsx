import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { createGrade } from '@/lib/firebaseService/gradeService';
import type { GradeValue, GradeType } from '@/types';
import { Timestamp } from 'firebase/firestore';

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
              subjectId: row['Subject ID'],
              teacherId,
              value: convertToGradeValue(row['Grade']),
              type: convertToGradeType(row['Type']),
              semesterId: row['Semester ID'],
              date: Timestamp.now(),
              comment: row['Comment'],
              isPublished: true,
            };

            // Validate required fields
            if (!gradeData.studentId || !gradeData.subjectId || !gradeData.semesterId) {
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