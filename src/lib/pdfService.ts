import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Grade, Student, Subject, Group } from '@/types';
import { format } from 'date-fns';

interface ExportData {
  grades: Grade[];
  students: Student[];
  subjects: Subject[];
  groups: Group[];
  selectedGroup?: string;
  selectedSubject?: string;
  selectedSemester?: number;
}

export function exportGradesToPDF(data: ExportData) {
  const { grades, students, subjects, groups, selectedGroup, selectedSubject, selectedSemester } = data;
  const doc = new jsPDF();

  // Add title
  doc.setFontSize(20);
  doc.text('Grade Report', 14, 20);

  // Add filters info
  doc.setFontSize(12);
  const group = groups.find(g => g.id === selectedGroup);
  const subject = subjects.find(s => s.id === selectedSubject);
  doc.text(`Group: ${group?.name || 'All'}`, 14, 30);
  doc.text(`Subject: ${subject?.name || 'All'}`, 14, 35);
  doc.text(`Semester: ${selectedSemester || 'All'}`, 14, 40);

  // Filter grades
  const filteredGrades = grades.filter(grade => {
    if (selectedGroup && grade.groupId !== selectedGroup) return false;
    if (selectedSubject && grade.subjectId !== selectedSubject) return false;
    if (selectedSemester && grade.semester !== selectedSemester) return false;
    return true;
  });

  // Prepare data for the table
  const tableData = filteredGrades.map(grade => {
    const student = students.find(s => s.id === grade.studentId);
    const subject = subjects.find(s => s.id === grade.subjectId);
    const group = groups.find(g => g.id === grade.groupId);
    return [
      student ? `${student.firstName} ${student.lastName}` : grade.studentId,
      subject?.name || grade.subjectId,
      group?.name || grade.groupId,
      grade.type,
      grade.value.toString(),
      format(grade.date.toDate(), 'MMM dd, yyyy'),
      grade.notes || '',
    ];
  });

  // Add grades table
  autoTable(doc, {
    startY: 50,
    head: [['Student', 'Subject', 'Group', 'Type', 'Grade', 'Date', 'Notes']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [66, 139, 202] },
  });

  // Add statistics
  const statsY = (doc as any).lastAutoTable.finalY + 20;
  doc.setFontSize(16);
  doc.text('Statistics', 14, statsY);

  // Calculate and add average grades by type
  const averageByType = ['exam', 'test', 'homework', 'project'].map(type => {
    const typeGrades = filteredGrades.filter(g => g.type === type);
    const average = typeGrades.reduce((acc, g) => acc + g.value, 0) / typeGrades.length || 0;
    return {
      type: type.charAt(0).toUpperCase() + type.slice(1),
      average: Number(average.toFixed(2)),
    };
  });

  // Add statistics table
  autoTable(doc, {
    startY: statsY + 10,
    head: [['Type', 'Average']],
    body: averageByType.map(({ type, average }) => [type, average.toString()]),
    theme: 'grid',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [66, 139, 202] },
  });

  // Save the PDF
  doc.save('grades_report.pdf');
} 