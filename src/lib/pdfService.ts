import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Grade, AppUser, Subject, Group } from '@/types';
import { Timestamp } from 'firebase/firestore';

interface ExportData {
  grades: Grade[];
  students: AppUser[];
  subjects: Subject[];
  groups: Group[];
  selectedGroup?: string;
  selectedSubject?: string;
  selectedSemesterId?: string;
}

// Функция для преобразования GradeValue в числовое значение
const gradeValueToNumber = (value: string): number => {
  switch (value) {
    case '5': return 5;
    case '4': return 4;
    case '3': return 3;
    case '2': return 2;
    case 'зачет': return 4;
    case 'незачет': return 2;
    case 'н/а': return 0;
    default: return 0;
  }
};

// Функция для проверки, является ли оценка числовой
const isNumericGrade = (value: string): boolean => {
  return ['5', '4', '3', '2'].includes(value);
};

export function exportGradesToPDF(data: ExportData) {
  const { grades, students, subjects, groups, selectedGroup, selectedSubject, selectedSemesterId } = data;
  const doc = new jsPDF();

  // Add title
  doc.setFontSize(20);
  doc.text('Отчет по оценкам', 14, 20);

  // Add filters info
  doc.setFontSize(12);
  const group = groups.find(g => g.id === selectedGroup);
  const subject = subjects.find(s => s.id === selectedSubject);
  doc.text(`Группа: ${group?.name || 'Все'}`, 14, 30);
  doc.text(`Предмет: ${subject?.name || 'Все'}`, 14, 35);
  doc.text(`Семестр: ${selectedSemesterId || 'Все'}`, 14, 40);

  // Filter grades
  const filteredGrades = grades.filter(grade => {
    if (selectedGroup) {
      const student = students.find(s => s.uid === grade.studentId);
      if (!student || (student as AppUser & { groupId: string }).role !== 'student' || 
          (student as AppUser & { groupId: string }).groupId !== selectedGroup) {
        return false;
      }
    }
    if (selectedSubject && grade.subjectId !== selectedSubject) return false;
    if (selectedSemesterId && grade.semesterId !== selectedSemesterId) return false;
    return true;
  });

  // Prepare data for the table
  const tableData = filteredGrades.map(grade => {
    const student = students.find(s => s.uid === grade.studentId);
    const subject = subjects.find(s => s.id === grade.subjectId);
    const studentGroup = student && (student as AppUser & { groupId: string }).role === 'student' 
      ? groups.find(g => g.id === (student as AppUser & { groupId: string }).groupId)
      : null;

    return [
      student ? `${student.lastName} ${student.firstName} ${student.middleName || ''}`.trim() : grade.studentId,
      subject?.name || grade.subjectId,
      studentGroup?.name || '',
      grade.type === 'current' ? 'Текущая' :
      grade.type === 'midterm' ? 'Рубежная' :
      grade.type === 'exam' ? 'Экзамен' : 'Итоговая',
      grade.value,
      grade.date instanceof Timestamp ? grade.date.toDate().toLocaleDateString() : '',
      grade.comment || '',
    ];
  });

  // Add grades table
  autoTable(doc, {
    startY: 50,
    head: [['Студент', 'Предмет', 'Группа', 'Тип', 'Оценка', 'Дата', 'Комментарий']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [66, 139, 202] },
  });

  // Add statistics
  const statsY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;
  doc.setFontSize(16);
  doc.text('Статистика', 14, statsY);

  // Calculate and add average grades by type
  const averageByType = ['current', 'midterm', 'exam', 'final'].map(type => {
    const typeGrades = filteredGrades.filter(g => g.type === type && isNumericGrade(g.value));
    const average = typeGrades.length > 0
      ? typeGrades.reduce((acc, g) => acc + gradeValueToNumber(g.value), 0) / typeGrades.length
      : 0;
    return {
      type: type === 'current' ? 'Текущие' :
            type === 'midterm' ? 'Рубежные' :
            type === 'exam' ? 'Экзамены' : 'Итоговые',
      average: Number(average.toFixed(2)),
    };
  });

  // Add statistics table
  autoTable(doc, {
    startY: statsY + 10,
    head: [['Тип', 'Средний балл']],
    body: averageByType.map(({ type, average }) => [type, average.toString()]),
    theme: 'grid',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [66, 139, 202] },
  });

  // Save the PDF
  doc.save('grades_report.pdf');
} 