import * as XLSX from 'xlsx';
import type { Grade, Student, Subject, Group } from '@/types';
import { format } from 'date-fns';

interface ExportData {
  grades: Grade[];
  students: Student[];
  subjects: Subject[];
  groups: Group[];
}

export function exportGradesToExcel(data: ExportData) {
  const { grades, students, subjects, groups } = data;

  // Create a worksheet with grades data
  const gradesData = grades.map(grade => {
    const student = students.find(s => s.id === grade.studentId);
    const subject = subjects.find(s => s.id === grade.subjectId);
    const group = groups.find(g => g.id === grade.groupId);

    return {
      'Student': student ? `${student.firstName} ${student.lastName}` : grade.studentId,
      'Subject': subject?.name || grade.subjectId,
      'Group': group?.name || grade.groupId,
      'Value': grade.value,
      'Type': grade.type,
      'Semester': grade.semester,
      'Date': format(grade.date.toDate(), 'MMM dd, yyyy'),
      'Notes': grade.notes || '',
    };
  });

  // Create a worksheet with statistics
  const statistics = calculateStatistics(grades, students, subjects, groups);

  // Create workbook with multiple sheets
  const wb = XLSX.utils.book_new();
  
  // Add grades sheet
  const wsGrades = XLSX.utils.json_to_sheet(gradesData);
  XLSX.utils.book_append_sheet(wb, wsGrades, 'Grades');

  // Add statistics sheet
  const wsStats = XLSX.utils.json_to_sheet(statistics);
  XLSX.utils.book_append_sheet(wb, wsStats, 'Statistics');

  // Generate Excel file
  XLSX.writeFile(wb, 'grades_report.xlsx');
}

function calculateStatistics(
  grades: Grade[],
  students: Student[],
  subjects: Subject[],
  groups: Group[]
) {
  const statistics = [];

  // Calculate average grade per subject
  const subjectStats = subjects.map(subject => {
    const subjectGrades = grades.filter(g => g.subjectId === subject.id);
    const average = subjectGrades.reduce((acc, g) => acc + g.value, 0) / subjectGrades.length || 0;
    
    return {
      'Category': 'Subject',
      'Name': subject.name,
      'Average Grade': average.toFixed(2),
      'Total Grades': subjectGrades.length,
    };
  });

  // Calculate average grade per group
  const groupStats = groups.map(group => {
    const groupGrades = grades.filter(g => g.groupId === group.id);
    const average = groupGrades.reduce((acc, g) => acc + g.value, 0) / groupGrades.length || 0;
    
    return {
      'Category': 'Group',
      'Name': group.name,
      'Average Grade': average.toFixed(2),
      'Total Grades': groupGrades.length,
    };
  });

  // Calculate average grade per student
  const studentStats = students.map(student => {
    const studentGrades = grades.filter(g => g.studentId === student.id);
    const average = studentGrades.reduce((acc, g) => acc + g.value, 0) / studentGrades.length || 0;
    
    return {
      'Category': 'Student',
      'Name': `${student.firstName} ${student.lastName}`,
      'Average Grade': average.toFixed(2),
      'Total Grades': studentGrades.length,
    };
  });

  // Combine all statistics
  statistics.push(...subjectStats, ...groupStats, ...studentStats);

  return statistics;
} 