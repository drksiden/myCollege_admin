import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Typography,
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { Schedule, Lesson } from '../../types';

interface ScheduleFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schedule?: Schedule;
}

interface CloudFunctionResponse<T> {
  data: {
    success: boolean;
    message?: string;
  } & T;
}

interface GroupsResponse {
  groups: Array<{ id: string; name: string }>;
}

interface SubjectsResponse {
  subjects: Array<{ id: string; name: string }>;
}

interface TeachersResponse {
  teachers: Array<{ id: string; firstName: string; lastName: string; middleName?: string }>;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Понедельник' },
  { value: 2, label: 'Вторник' },
  { value: 3, label: 'Среда' },
  { value: 4, label: 'Четверг' },
  { value: 5, label: 'Пятница' },
  { value: 6, label: 'Суббота' },
];

const LESSON_TYPES = [
  { value: 'lecture', label: 'Лекция' },
  { value: 'practice', label: 'Практика' },
  { value: 'laboratory', label: 'Лабораторная работа' },
];

export const ScheduleFormDialog: React.FC<ScheduleFormDialogProps> = ({
  open,
  onClose,
  onSuccess,
  schedule,
}) => {
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([]);
  const [teachers, setTeachers] = useState<Array<{ id: string; firstName: string; lastName: string; middleName?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    groupId: string;
    lessons: Omit<Lesson, 'id'>[];
  }>({
    groupId: '',
    lessons: [],
  });

  useEffect(() => {
    if (open) {
      fetchData();
      if (schedule) {
        setFormData({
          groupId: schedule.groupId,
          lessons: schedule.lessons,
        });
      } else {
        setFormData({
          groupId: '',
          lessons: [],
        });
      }
    }
  }, [open, schedule]);

  const fetchData = async () => {
    try {
      const functions = getFunctions();
      const [groupsResult, subjectsResult, teachersResult] = await Promise.all([
        httpsCallable<Record<string, never>, CloudFunctionResponse<GroupsResponse>>(functions, 'getGroups')({}),
        httpsCallable<Record<string, never>, CloudFunctionResponse<SubjectsResponse>>(functions, 'getSubjects')({}),
        httpsCallable<Record<string, never>, CloudFunctionResponse<TeachersResponse>>(functions, 'getTeachers')({}),
      ]);

      setGroups(groupsResult.data.data.groups);
      setSubjects(subjectsResult.data.data.subjects);
      setTeachers(teachersResult.data.data.teachers);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Ошибка при загрузке данных');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const functions = getFunctions();
      const createScheduleFn = httpsCallable(functions, 'createSchedule');
      const updateScheduleFn = httpsCallable(functions, 'updateSchedule');

      if (schedule) {
        await updateScheduleFn({
          scheduleId: schedule.id,
          data: formData,
        });
      } else {
        await createScheduleFn(formData);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving schedule:', error);
      setError(error instanceof Error ? error.message : 'Ошибка при сохранении расписания');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLesson = () => {
    setFormData(prev => ({
      ...prev,
      lessons: [
        ...prev.lessons,
        {
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '10:30',
          subjectId: '',
          teacherId: '',
          room: '',
          type: 'lecture',
        },
      ],
    }));
  };

  const handleRemoveLesson = (index: number) => {
    setFormData(prev => ({
      ...prev,
      lessons: prev.lessons.filter((_, i) => i !== index),
    }));
  };

  const handleLessonChange = (index: number, field: keyof Omit<Lesson, 'id'>, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      lessons: prev.lessons.map((lesson, i) =>
        i === index ? { ...lesson, [field]: value } : lesson
      ),
    }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {schedule ? 'Редактировать расписание' : 'Создать расписание'}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}

          <Box sx={{ mb: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Группа</InputLabel>
              <Select
                value={formData.groupId}
                label="Группа"
                onChange={(e) => setFormData(prev => ({ ...prev, groupId: e.target.value }))}
                required
              >
                {groups.map((group) => (
                  <MenuItem key={group.id} value={group.id}>
                    {group.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Button
              startIcon={<AddIcon />}
              onClick={handleAddLesson}
              variant="outlined"
            >
              Добавить занятие
            </Button>
          </Box>

          {formData.lessons.map((lesson, index) => (
            <Box
              key={index}
              sx={{
                p: 2,
                mb: 2,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                position: 'relative',
              }}
            >
              <IconButton
                sx={{ position: 'absolute', right: 8, top: 8 }}
                onClick={() => handleRemoveLesson(index)}
                size="small"
              >
                <DeleteIcon />
              </IconButton>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
                  <FormControl fullWidth>
                    <InputLabel>День недели</InputLabel>
                    <Select
                      value={lesson.dayOfWeek}
                      label="День недели"
                      onChange={(e) => handleLessonChange(index, 'dayOfWeek', e.target.value)}
                      required
                    >
                      {DAYS_OF_WEEK.map((day) => (
                        <MenuItem key={day.value} value={day.value}>
                          {day.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
                  <FormControl fullWidth>
                    <InputLabel>Тип занятия</InputLabel>
                    <Select
                      value={lesson.type}
                      label="Тип занятия"
                      onChange={(e) => handleLessonChange(index, 'type', e.target.value)}
                      required
                    >
                      {LESSON_TYPES.map((type) => (
                        <MenuItem key={type.value} value={type.value}>
                          {type.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
                  <TextField
                    fullWidth
                    label="Время начала"
                    type="time"
                    value={lesson.startTime}
                    onChange={(e) => handleLessonChange(index, 'startTime', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    required
                  />
                </Box>

                <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
                  <TextField
                    fullWidth
                    label="Время окончания"
                    type="time"
                    value={lesson.endTime}
                    onChange={(e) => handleLessonChange(index, 'endTime', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    required
                  />
                </Box>

                <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
                  <FormControl fullWidth>
                    <InputLabel>Предмет</InputLabel>
                    <Select
                      value={lesson.subjectId}
                      label="Предмет"
                      onChange={(e) => handleLessonChange(index, 'subjectId', e.target.value)}
                      required
                    >
                      {subjects.map((subject) => (
                        <MenuItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                <Box sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)' } }}>
                  <FormControl fullWidth>
                    <InputLabel>Преподаватель</InputLabel>
                    <Select
                      value={lesson.teacherId}
                      label="Преподаватель"
                      onChange={(e) => handleLessonChange(index, 'teacherId', e.target.value)}
                      required
                    >
                      {teachers.map((teacher) => (
                        <MenuItem key={teacher.id} value={teacher.id}>
                          {`${teacher.lastName} ${teacher.firstName} ${teacher.middleName || ''}`}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                <Box sx={{ width: '100%' }}>
                  <TextField
                    fullWidth
                    label="Аудитория"
                    value={lesson.room}
                    onChange={(e) => handleLessonChange(index, 'room', e.target.value)}
                    required
                  />
                </Box>
              </Box>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Отмена</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || formData.lessons.length === 0}
          >
            {loading ? 'Сохранение...' : schedule ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}; 