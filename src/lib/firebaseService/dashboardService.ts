// src/lib/firebaseService/dashboardService.ts
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getUsers } from './userService';
import { getAllGroups } from './groupService';
import { getAllSubjects } from './subjectService';

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

interface JournalEntry {
  id: string;
  journalId: string;
  lessonId: string;
  studentId: string;
  date: Timestamp;
  present: boolean;
  attendanceStatus: 'present' | 'absent' | 'late' | 'excused';
  grade?: string;
  gradeType?: string;
  comment?: string;
  topicCovered?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface Journal {
  id: string;
  groupId: string;
  subjectId: string;
  teacherId: string;
  semesterId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
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

    // Получаем записи журнала за последние 30 дней
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const journalEntriesRef = collection(db, 'journalEntries');
    const q = query(
      journalEntriesRef,
      where('date', '>=', Timestamp.fromDate(thirtyDaysAgo))
    );
    const entriesSnapshot = await getDocs(q);
    const entries = entriesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as JournalEntry));

    // Получаем журналы для связи с группами и предметами
    const journalsRef = collection(db, 'journals');
    const journalsSnapshot = await getDocs(journalsRef);
    const journals = journalsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Journal));

    // Создаем карту журналов для быстрого поиска
    const journalMap = new Map<string, Journal>();
    journals.forEach(journal => {
      journalMap.set(journal.id, journal);
    });

    // Статистика посещаемости по группам
    const attendanceByGroup = new Map<string, {
      groupId: string;
      groupName: string;
      present: number;
      absent: number;
      late: number;
      excused: number;
    }>();

    // Инициализируем статистику для всех групп
    groups.forEach(group => {
      attendanceByGroup.set(group.id, {
        groupId: group.id,
        groupName: group.name,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
      });
    });

    // Подсчитываем посещаемость
    entries.forEach(entry => {
      const journal = journalMap.get(entry.journalId);
      if (journal) {
        const groupStats = attendanceByGroup.get(journal.groupId);
        if (groupStats) {
          switch (entry.attendanceStatus) {
            case 'present':
              groupStats.present++;
              break;
            case 'absent':
              groupStats.absent++;
              break;
            case 'late':
              groupStats.late++;
              break;
            case 'excused':
              groupStats.excused++;
              break;
          }
        }
      }
    });

    const attendanceStats = Array.from(attendanceByGroup.values());

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
        if (!entry.grade) return false;
        const grade = parseInt(entry.grade);
        if (isNaN(grade)) return false;
        return grade >= range.min && grade <= range.max;
      }).length,
    }));

    // Активность по предметам
    const subjectActivityMap = new Map<string, number>();
    
    // Инициализируем все предметы
    subjects.forEach(subject => {
      subjectActivityMap.set(subject.id, 0);
    });

    // Подсчитываем записи по предметам
    entries.forEach(entry => {
      const journal = journalMap.get(entry.journalId);
      if (journal) {
        const currentCount = subjectActivityMap.get(journal.subjectId) || 0;
        subjectActivityMap.set(journal.subjectId, currentCount + 1);
      }
    });

    const subjectActivity = subjects.map(subject => ({
      subjectId: subject.id,
      subjectName: subject.name,
      entriesCount: subjectActivityMap.get(subject.id) || 0,
    })).filter(activity => activity.entriesCount > 0); // Показываем только предметы с активностью

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