import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getUsers } from './userService';
import { getAllGroups } from './groupService';
import { getAllSubjects } from './subjectService';
import { getJournalEntries } from './journalService';
import type { JournalEntry } from '@/types';

export interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalGroups: number;
  totalSubjects: number;
  attendanceStats: {
    groupId: string;
    groupName: string;
    present: number;
    absent: number;
    late: number;
    excused: number;
  }[];
  gradeDistribution: {
    range: string;
    count: number;
  }[];
  subjectActivity: {
    subjectId: string;
    subjectName: string;
    entriesCount: number;
  }[];
}

export const getDashboardData = async (): Promise<DashboardStats> => {
  try {
    // Получаем базовую статистику
    const [{ users: allUsers }, groups, subjects] = await Promise.all([
      getUsers(),
      getAllGroups(),
      getAllSubjects(),
    ]);

    const students = allUsers.filter(user => user.role === 'student');
    const teachers = allUsers.filter(user => user.role === 'teacher');

    // Получаем все записи журнала за последние 30 дней
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const journalEntriesCollection = collection(db, 'journalEntries');
    const q = query(
      journalEntriesCollection,
      where('date', '>=', Timestamp.fromDate(thirtyDaysAgo))
    );
    const entriesSnapshot = await getDocs(q);
    const entries = entriesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as JournalEntry));

    // Статистика посещаемости по группам
    const attendanceStats = groups.map(group => {
      const groupEntries = entries.filter(entry => entry.groupId === group.id);
      return {
        groupId: group.id,
        groupName: group.name,
        present: groupEntries.filter(entry => entry.attendanceStatus === 'present').length,
        absent: groupEntries.filter(entry => entry.attendanceStatus === 'absent').length,
        late: groupEntries.filter(entry => entry.attendanceStatus === 'late').length,
        excused: groupEntries.filter(entry => entry.attendanceStatus === 'excused').length,
      };
    });

    // Распределение оценок
    const gradeRanges = [
      { min: 0, max: 20, label: '0-20' },
      { min: 21, max: 40, label: '21-40' },
      { min: 41, max: 60, label: '41-60' },
      { min: 61, max: 80, label: '61-80' },
      { min: 81, max: 100, label: '81-100' },
    ];

    const gradeDistribution = gradeRanges.map(range => ({
      range: range.label,
      count: entries.filter(entry => {
        const grade = parseInt(entry.grade || '0');
        return grade >= range.min && grade <= range.max;
      }).length,
    }));

    // Активность по предметам
    const subjectActivity = subjects.map(subject => ({
      subjectId: subject.id,
      subjectName: subject.name,
      entriesCount: entries.filter(entry => entry.subjectId === subject.id).length,
    }));

    return {
      totalStudents: students.length,
      totalTeachers: teachers.length,
      totalGroups: groups.length,
      totalSubjects: subjects.length,
      attendanceStats,
      gradeDistribution,
      subjectActivity,
    };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    throw error;
  }
}; 