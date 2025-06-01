import * as XLSX from 'xlsx';
import type { Grade, AppUser, Subject, Group } from '@/types';
import { getUsers } from './firebaseService/userService';
import { getGrades } from './firebaseService/gradeService';
import { getGroups } from './firebaseService/groupService';
import { getSubjects } from './firebaseService/subjectService';
import { Timestamp } from 'firebase/firestore';

interface ExportData {
  grades: Grade[];
  students: AppUser[];
  subjects: Subject[];
  groups: Group[];
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

export async function exportGradesToExcel(data?: ExportData) {
  try {
    let grades: Grade[];
    let students: AppUser[];
    let groups: Group[];
    let subjects: Subject[];

    if (data) {
      ({ grades, students, groups, subjects } = data);
    } else {
      // Получаем все необходимые данные
      const [gradesData, studentsData, groupsData, subjectsData] = await Promise.all([
        getGrades(),
        getUsers({ role: 'student' }),
        getGroups(),
        getSubjects(),
      ]);
      grades = gradesData;
      students = studentsData.users;
      groups = groupsData;
      subjects = subjectsData;
    }

    // Преобразуем данные для экспорта
    const exportData = grades.map(grade => {
      const student = students.find(s => s.uid === grade.studentId);
      const studentGroup = student && (student as AppUser & { groupId: string }).role === 'student' 
        ? groups.find(g => g.id === (student as AppUser & { groupId: string }).groupId)
        : null;
      const subject = subjects.find(s => s.id === grade.subjectId);

      return {
        'ID студента': grade.studentId,
        'ФИО студента': student ? `${student.lastName} ${student.firstName} ${student.middleName || ''}`.trim() : '',
        'Группа': studentGroup?.name || '',
        'Предмет': subject?.name || '',
        'Тип оценки': grade.type,
        'Оценка': grade.value,
        'Дата': grade.date instanceof Timestamp ? grade.date.toDate().toLocaleDateString() : '',
        'Комментарий': grade.comment || '',
        'Семестр': grade.semesterId,
        'Опубликовано': grade.isPublished ? 'Да' : 'Нет'
      };
    });

    // Создаем рабочую книгу Excel
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, 'Grades');

    // Добавляем лист со статистикой
    const statistics = calculateStatistics(grades, students, subjects);
    const statsWs = XLSX.utils.json_to_sheet(statistics);
    XLSX.utils.book_append_sheet(wb, statsWs, 'Statistics');

    // Генерируем файл
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  } catch (error) {
    console.error('Error exporting grades:', error);
    throw error;
  }
}

function calculateStatistics(
  grades: Grade[],
  students: AppUser[],
  subjects: Subject[]
) {
  const statistics = [];

  // Статистика по студентам
  for (const student of students) {
    const studentGrades = grades.filter(g => g.studentId === student.uid);
    const numericGrades = studentGrades.filter(g => isNumericGrade(g.value));
    
    const average = numericGrades.length > 0
      ? numericGrades.reduce((acc, g) => acc + gradeValueToNumber(g.value), 0) / numericGrades.length
      : 0;

    statistics.push({
      'Category': 'Student',
      'Name': `${student.lastName} ${student.firstName} ${student.middleName || ''}`.trim(),
      'Average Grade': average.toFixed(2),
      'Total Grades': studentGrades.length,
      'Numeric Grades': numericGrades.length
    });
  }

  // Статистика по предметам
  for (const subject of subjects) {
    const subjectGrades = grades.filter(g => g.subjectId === subject.id);
    const numericGrades = subjectGrades.filter(g => isNumericGrade(g.value));
    
    const average = numericGrades.length > 0
      ? numericGrades.reduce((acc, g) => acc + gradeValueToNumber(g.value), 0) / numericGrades.length
      : 0;

    statistics.push({
      'Category': 'Subject',
      'Name': subject.name,
      'Average Grade': average.toFixed(2),
      'Total Grades': subjectGrades.length,
      'Numeric Grades': numericGrades.length
    });
  }

  return statistics;
} 