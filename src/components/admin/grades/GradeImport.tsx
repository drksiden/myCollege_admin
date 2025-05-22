import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { createGrade } from '@/lib/firebaseService/gradeService';
import type { Grade } from '@/types';
import { Timestamp } from 'firebase/firestore';

interface GradeImportProps {
  teacherId: string;
  onSuccess?: () => void;
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
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          // Validate and process each row
          for (const row of jsonData) {
            const gradeData = {
              studentId: row['Student ID'],
              subjectId: row['Subject ID'],
              groupId: row['Group ID'],
              teacherId,
              value: Number(row['Grade']),
              type: row['Type'] as Grade['type'],
              semester: Number(row['Semester']),
              date: Timestamp.now(),
              notes: row['Notes'] as string | undefined,
            };

            // Validate required fields
            if (!gradeData.studentId || !gradeData.subjectId || !gradeData.groupId || !gradeData.value || !gradeData.type || !gradeData.semester) {
              throw new Error(`Invalid data in row: ${JSON.stringify(row)}`);
            }

            // Validate grade type
            if (!['exam', 'test', 'homework', 'project'].includes(gradeData.type)) {
              throw new Error(`Invalid grade type: ${gradeData.type}`);
            }

            // Validate grade value
            if (gradeData.value < 0 || gradeData.value > 100) {
              throw new Error(`Invalid grade value: ${gradeData.value}`);
            }

            await createGrade(gradeData);
          }

          toast.success('Grades imported successfully');
          onSuccess?.();
        } catch (error) {
          console.error('Error processing file:', error);
          toast.error('Failed to process file: ' + (error as Error).message);
        } finally {
          setLoading(false);
        }
      };

      reader.onerror = () => {
        toast.error('Failed to read file');
        setLoading(false);
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="file">Import Grades from Excel</Label>
        <Input
          id="file"
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileUpload}
          disabled={loading}
        />
      </div>
      <div className="text-sm text-muted-foreground">
        <p>Excel file should have the following columns:</p>
        <ul className="list-disc list-inside">
          <li>Student ID</li>
          <li>Subject ID</li>
          <li>Group ID</li>
          <li>Grade (0-100)</li>
          <li>Type (exam, test, homework, project)</li>
          <li>Semester (1-8)</li>
          <li>Notes (optional)</li>
        </ul>
      </div>
    </div>
  );
} 