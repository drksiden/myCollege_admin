import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Schedule, Group, Subject, Teacher } from '@/types';
import { useAuth } from '../../contexts/AuthContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";

const DAYS_OF_WEEK = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
];

const SchedulePage: React.FC = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const { isAdmin } = useAuth();

  const fetchSchedules = async () => {
    try {
      const schedulesCollection = collection(db, 'schedules');
      const schedulesSnapshot = await getDocs(schedulesCollection);
      const schedulesList = schedulesSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      })) as Schedule[];
      setSchedules(schedulesList);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  };

  const fetchData = async () => {
    try {
      const [groupsSnapshot, subjectsSnapshot, teachersSnapshot] = await Promise.all([
        getDocs(collection(db, 'groups')),
        getDocs(collection(db, 'subjects')),
        getDocs(collection(db, 'teachers')),
      ]);

      setGroups(groupsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Group[]);
      setSubjects(subjectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Subject[]);
      setTeachers(teachersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Teacher[]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
    fetchData();
  }, []);

  const getGroupName = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    return group ? group.name : 'Неизвестная группа';
  };

  const getSubjectName = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? subject.name : 'Неизвестный предмет';
  };

  const getTeacherName = (teacherId: string) => {
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher
      ? `${teacher.lastName} ${teacher.firstName} ${teacher.middleName || ''}`
      : 'Неизвестный преподаватель';
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <h2 className="text-lg font-semibold text-destructive">
          Доступ запрещен. Требуются права администратора.
        </h2>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <p>Загрузка...</p>
      </div>
    );
  }

  const filteredSchedules = selectedGroup === 'all'
    ? schedules
    : schedules.filter(schedule => schedule.groupId === selectedGroup);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Просмотр расписания</h1>
        <div className="flex gap-4">
          <Select value={selectedGroup} onValueChange={setSelectedGroup}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Выберите группу" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все группы</SelectItem>
              {groups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Группа</TableHead>
              <TableHead>День недели</TableHead>
              <TableHead>Время</TableHead>
              <TableHead>Предмет</TableHead>
              <TableHead>Преподаватель</TableHead>
              <TableHead>Аудитория</TableHead>
              <TableHead>Тип</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSchedules.map((schedule) =>
              schedule.lessons.map((lesson) => (
                <TableRow key={lesson.id}>
                  <TableCell>{getGroupName(schedule.groupId)}</TableCell>
                  <TableCell>{DAYS_OF_WEEK[lesson.dayOfWeek - 1]}</TableCell>
                  <TableCell>
                    {lesson.startTime} - {lesson.endTime}
                  </TableCell>
                  <TableCell>{getSubjectName(lesson.subjectId)}</TableCell>
                  <TableCell>{getTeacherName(lesson.teacherId)}</TableCell>
                  <TableCell>{lesson.room}</TableCell>
                  <TableCell>{lesson.type}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default SchedulePage;
