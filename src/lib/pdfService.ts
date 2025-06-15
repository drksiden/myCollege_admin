import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import type { Grade, AppUser, Subject, GradeType } from '@/types';

interface GradeReportData {
  studentName: string;
  subjectName: string;
  gradeType: GradeType;
  grade: string;
  date: string;
  present: boolean;
  attendanceStatus: string;
  topicCovered: boolean;
}

interface AutoTableOptions {
  head: string[][];
  body: string[][];
  startY: number;
  theme: string;
  styles: {
    fontSize: number;
    cellPadding: number;
  };
  headStyles: {
    fillColor: number[];
    textColor: number;
    fontSize: number;
    fontStyle: string;
  };
}

export function generateGradeReport(
  grades: Grade[],
  students: AppUser[],
  subjects: Subject[]
): GradeReportData[] {
  return grades.map(grade => {
    const student = students.find(s => s.uid === grade.studentId);
    const subject = subjects.find(s => s.id === grade.journalId);
    
    return {
      studentName: student ? `${student.lastName} ${student.firstName}` : 'Неизвестный студент',
      subjectName: subject ? subject.name : 'Неизвестный предмет',
      gradeType: grade.gradeType as GradeType,
      grade: grade.grade,
      date: grade.date.toDate().toLocaleDateString(),
      present: Boolean(grade.present),
      attendanceStatus: grade.attendanceStatus ?? 'Не указан',
      topicCovered: Boolean(grade.topicCovered)
    };
  });
}

export function calculateAverageGrade(grades: Grade[], gradeType: GradeType): number {
  const numericGrades = grades
    .filter(g => g.gradeType === gradeType && !isNaN(Number(g.grade)))
    .map(g => Number(g.grade));
  
  if (numericGrades.length === 0) return 0;
  return numericGrades.reduce((a, b) => a + b, 0) / numericGrades.length;
}

export function exportGradesToPDF(
  grades: Grade[],
  students: AppUser[],
  subjects: Subject[]
): void {
  const doc = new jsPDF();
  const reportData = generateGradeReport(grades, students, subjects);

  doc.setFontSize(16);
  doc.text('Отчет по оценкам', 14, 15);

  const tableColumn = [
    'Студент',
    'Предмет',
    'Тип оценки',
    'Оценка',
    'Дата',
    'Присутствие',
    'Статус',
    'Тема пройдена'
  ];

  const tableRows = reportData.map(data => [
    data.studentName,
    data.subjectName,
    data.gradeType,
    data.grade,
    data.date,
    data.present ? 'Да' : 'Нет',
    data.attendanceStatus,
    data.topicCovered ? 'Да' : 'Нет'
  ]);

  (doc as jsPDF & { autoTable: (options: AutoTableOptions) => void }).autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 25,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontSize: 10,
      fontStyle: 'bold'
    }
  });

  doc.save('grades_report.pdf');
} 