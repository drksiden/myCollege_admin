import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Schedule, Group, Subject, Teacher } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { ScheduleFormDialog } from '../../components/admin/ScheduleFormDialog';

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
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [scheduleToDelete, setScheduleToDelete] = useState<Schedule | null>(null);
  const [isScheduleFormOpen, setIsScheduleFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
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

  const handleDeleteSchedule = async () => {
    if (!scheduleToDelete) return;

    try {
      await deleteDoc(doc(db, 'schedules', scheduleToDelete.id));
      await fetchSchedules();
    } catch (error) {
      console.error('Error deleting schedule:', error);
    } finally {
      setScheduleToDelete(null);
    }
  };

  const handleEditSchedule = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setIsScheduleFormOpen(true);
  };

  const handleScheduleCreatedOrUpdated = () => {
    fetchSchedules();
    setEditingSchedule(null);
  };

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
      <Box p={3}>
        <Typography variant="h5" color="error">
          Доступ запрещен. Требуются права администратора.
        </Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box p={3}>
        <Typography>Загрузка...</Typography>
      </Box>
    );
  }

  const filteredSchedules = selectedGroup
    ? schedules.filter(schedule => schedule.groupId === selectedGroup)
    : schedules;

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Управление расписанием</Typography>
        <Box display="flex" gap={2}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Группа</InputLabel>
            <Select
              value={selectedGroup}
              label="Группа"
              onChange={(e) => setSelectedGroup(e.target.value)}
            >
              <MenuItem value="">Все группы</MenuItem>
              {groups.map((group) => (
                <MenuItem key={group.id} value={group.id}>
                  {group.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setIsScheduleFormOpen(true)}
          >
            Добавить расписание
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Группа</TableCell>
              <TableCell>День недели</TableCell>
              <TableCell>Время</TableCell>
              <TableCell>Предмет</TableCell>
              <TableCell>Преподаватель</TableCell>
              <TableCell>Аудитория</TableCell>
              <TableCell>Тип</TableCell>
              <TableCell>Действия</TableCell>
            </TableRow>
          </TableHead>
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
                  <TableCell>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleEditSchedule(schedule)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setScheduleToDelete(schedule)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={!!scheduleToDelete}
        onClose={() => setScheduleToDelete(null)}
      >
        <DialogTitle>Удалить расписание?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Вы уверены, что хотите удалить расписание для группы{' '}
            {scheduleToDelete && getGroupName(scheduleToDelete.groupId)}?
            Это действие нельзя отменить.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleToDelete(null)}>Отмена</Button>
          <Button onClick={handleDeleteSchedule} color="error" variant="contained">
            Удалить
          </Button>
        </DialogActions>
      </Dialog>

      <ScheduleFormDialog
        open={isScheduleFormOpen}
        onClose={() => {
          setIsScheduleFormOpen(false);
          setEditingSchedule(null);
        }}
        onSuccess={handleScheduleCreatedOrUpdated}
        schedule={editingSchedule || undefined}
      />
    </Box>
  );
};

export default SchedulePage;
