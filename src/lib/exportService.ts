import * as XLSX from 'xlsx';
import type { Grade, AppUser, Subject } from '@/types';

function gradeValueToNumber(grade: string): number {
  const gradeMap: { [key: string]: number } = {
    '5': 5,
    '4': 4,
    '3': 3,
    '2': 2,
    'н/а': 0,
    'зачет': 1,
    'незачет': 0
  };
  return gradeMap[grade.toLowerCase()] || 0;
}

function isNumericGrade(grade: string): boolean {
  return !isNaN(Number(grade)) && Number(grade) >= 2 && Number(grade) <= 5;
}

export async function exportGradesToExcel(
  grades: Grade[],
  students: AppUser[],
  subjects: Subject[]
): Promise<void> {
  try {
    const data = grades.map(grade => {
      const student = students.find(s => s.uid === grade.studentId);
      const subject = subjects.find(s => s.id === grade.journalId);
      return {
        'ФИО студента': student ? `${student.lastName} ${student.firstName}` : 'Неизвестный студент',
        'Предмет': subject ? subject.name : 'Неизвестный предмет',
        'Тип оценки': grade.gradeType,
        'Оценка': grade.grade,
        'Дата': grade.date.toDate().toLocaleDateString(),
        'Присутствие': grade.present ? 'Присутствовал' : 'Отсутствовал',
        'Статус': grade.attendanceStatus,
        'Тема пройдена': grade.topicCovered ? 'Да' : 'Нет'
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Оценки');
    XLSX.writeFile(wb, 'grades.xlsx');
  } catch (error) {
    console.error('Error exporting grades:', error);
    throw new Error('Failed to export grades to Excel');
  }
}

export async function exportStudentGradesToExcel(
  studentId: string,
  grades: Grade[],
  subjects: Subject[]
): Promise<void> {
  try {
    const studentGrades = grades.filter(g => g.studentId === studentId);
    const subjectGrades = new Map<string, Grade[]>();

    studentGrades.forEach(grade => {
      const subjectGradesList = subjectGrades.get(grade.journalId) || [];
      subjectGradesList.push(grade);
      subjectGrades.set(grade.journalId, subjectGradesList);
    });

    const data = Array.from(subjectGrades.entries()).map(([subjectId, grades]) => {
      const subject = subjects.find(s => s.id === subjectId);
      const numericGrades = grades
        .filter(g => isNumericGrade(g.grade))
        .map(g => gradeValueToNumber(g.grade));
      
      const averageGrade = numericGrades.length > 0
        ? numericGrades.reduce((a, b) => a + b, 0) / numericGrades.length
        : 0;

      return {
        'Предмет': subject ? subject.name : 'Неизвестный предмет',
        'Средний балл': averageGrade.toFixed(2),
        'Количество оценок': grades.length,
        'Оценки': grades.map(g => g.grade).join(', ')
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Оценки студента');
    XLSX.writeFile(wb, `student_grades_${studentId}.xlsx`);
  } catch (error) {
    console.error('Error exporting student grades:', error);
    throw new Error('Failed to export student grades to Excel');
  }
} 