import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { subMonths, startOfMonth as startOfMonthFn, endOfMonth as endOfMonthFn, format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface User {
  uid: string;
  role: 'student' | 'teacher' | 'admin';
  createdAt: Timestamp;
  groupId?: string;
  status?: 'active' | 'inactive';
}

interface Group {
  id: string;
  name: string;
}

interface DashboardData {
  studentEnrollment: {
    month: string;
    count: number;
  }[];
  groupDistribution: {
    name: string;
    value: number;
  }[];
  totalStudents: number;
  totalTeachers: number;
  activeStudents: number;
  newStudentsThisMonth: number;
  newTeachersThisMonth: number;
  attendanceRate: number;
}

export const getDashboardData = async (): Promise<DashboardData> => {
  try {
    // Получаем данные о пользователях
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const users = usersSnapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id })) as User[];

    // Получаем данные о группах
    const groupsSnapshot = await getDocs(collection(db, 'groups'));
    const groups = groupsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Group[];

    // Получаем данные о посещаемости
    const attendanceSnapshot = await getDocs(collection(db, 'attendance'));
    const attendances = attendanceSnapshot.docs.map(doc => doc.data());

    // Подготавливаем данные для графика набора студентов
    const studentEnrollment = Array.from({ length: 6 }, (_, i) => {
      const month = subMonths(new Date(), i);
      const startOfMonthDate = startOfMonthFn(month);
      const endOfMonthDate = endOfMonthFn(month);

      const count = users.filter(user => 
        user.role === 'student' &&
        user.createdAt &&
        user.createdAt.toDate() >= startOfMonthDate &&
        user.createdAt.toDate() <= endOfMonthDate
      ).length;

      return {
        month: format(month, 'LLLL', { locale: ru }),
        count
      };
    }).reverse();

    // Подготавливаем данные для графика распределения по группам
    const groupCounts = new Map<string, number>();
    
    // Инициализируем счетчики для всех групп
    groups.forEach(group => {
      groupCounts.set(group.name, 0);
    });

    // Подсчитываем количество студентов в каждой группе
    users.forEach(user => {
      if (user.role === 'student' && user.groupId) {
        const group = groups.find(g => g.id === user.groupId);
        if (group) {
          groupCounts.set(group.name, (groupCounts.get(group.name) || 0) + 1);
        }
      }
    });

    const groupDistribution = Array.from(groupCounts.entries()).map(([name, value]) => ({
      name,
      value
    }));

    // Рассчитываем общую статистику
    const totalStudents = users.filter(user => user.role === 'student').length;
    const totalTeachers = users.filter(user => user.role === 'teacher').length;
    const activeStudents = users.filter(user => user.role === 'student' && user.status === 'active').length;

    // Рассчитываем статистику за текущий месяц
    const currentMonthStart = startOfMonthFn(new Date());
    const currentMonthEnd = endOfMonthFn(new Date());

    const newStudentsThisMonth = users.filter(user => 
      user.role === 'student' &&
      user.createdAt &&
      user.createdAt.toDate() >= currentMonthStart &&
      user.createdAt.toDate() <= currentMonthEnd
    ).length;

    const newTeachersThisMonth = users.filter(user => 
      user.role === 'teacher' &&
      user.createdAt &&
      user.createdAt.toDate() >= currentMonthStart &&
      user.createdAt.toDate() <= currentMonthEnd
    ).length;

    // Рассчитываем среднюю посещаемость
    const totalAttendance = attendances.reduce((sum, attendance) => sum + (attendance.present ? 1 : 0), 0);
    const attendanceRate = attendances.length > 0 ? (totalAttendance / attendances.length) * 100 : 0;

    return {
      studentEnrollment,
      groupDistribution,
      totalStudents,
      totalTeachers,
      activeStudents,
      newStudentsThisMonth,
      newTeachersThisMonth,
      attendanceRate
    };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    throw error;
  }
}; 