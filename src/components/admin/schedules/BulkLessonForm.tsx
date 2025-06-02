import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import type { Lesson, Subject, TeacherUser, Group } from '@/types';

interface BulkLessonFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (lesson: Omit<Lesson, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  subjects: Subject[];
  teachers: TeacherUser[];
  groupId: string;
  semesterId: string;
  groups: Group[];
}

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Понедельник' },
  { value: 'tuesday', label: 'Вторник' },
  { value: 'wednesday', label: 'Среда' },
  { value: 'thursday', label: 'Четверг' },
  { value: 'friday', label: 'Пятница' },
  { value: 'saturday', label: 'Суббота' },
];

const TIME_SLOTS = [
  { value: '08:00-09:30', label: '1 пара (8:00 - 9:30)' },
  { value: '09:40-11:10', label: '2 пара (9:40 - 11:10)' },
  { value: '11:20-12:50', label: '3 пара (11:20 - 12:50)' },
  { value: '13:20-14:50', label: '4 пара (13:20 - 14:50)' },
  { value: '15:00-16:30', label: '5 пара (15:00 - 16:30)' },
  { value: '16:40-18:10', label: '6 пара (16:40 - 18:10)' },
  { value: '18:20-19:50', label: '7 пара (18:20 - 19:50)' },
];

const BulkLessonForm: React.FC<BulkLessonFormProps> = ({
  open,
  onOpenChange,
  onSave,
  subjects,
  teachers,
  groupId,
  semesterId,
  groups,
}) => {
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<'lecture' | 'seminar' | 'lab' | 'exam'>('lecture');
  const [selectedWeekType, setSelectedWeekType] = useState<'all' | 'odd' | 'even'>('all');
  const [roomError, setRoomError] = useState<string | null>(null);

  const group = groups?.find(g => g.id === groupId);
  const groupSubjects = subjects.filter(subject => group?.subjectIds.includes(subject.id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoomError(null);
    if (!selectedSubject || !selectedRoom || selectedDays.length === 0 || selectedTimeSlots.length === 0) {
      if (!selectedRoom) setRoomError('Аудитория обязательна');
      toast.error('Пожалуйста, заполните все обязательные поля');
      return;
    }

    if (!selectedTeacher) {
      toast.error('Пожалуйста, выберите преподавателя');
      return;
    }

    const subject = subjects.find(s => s.id === selectedSubject);
    if (!subject) {
      toast.error('Ошибка: предмет не найден');
      return;
    }

    for (const day of selectedDays) {
      for (const timeSlot of selectedTimeSlots) {
        const [startTime, endTime] = timeSlot.split('-');
        const lesson: Omit<Lesson, 'id' | 'createdAt' | 'updatedAt'> = {
          subjectId: selectedSubject,
          teacherId: selectedTeacher,
          room: selectedRoom,
          dayOfWeek: DAYS_OF_WEEK.findIndex(d => d.value === day) + 1,
          startTime,
          endTime,
          type: selectedType,
          weekType: selectedWeekType,
          groupId,
          semesterId,
        };

        try {
          await onSave(lesson);
        } catch (error) {
          console.error('Failed to save lesson:', error);
          toast.error('Не удалось сохранить занятие');
          return;
        }
      }
    }

    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedSubject('');
    setSelectedTeacher('');
    setSelectedRoom('');
    setSelectedDays([]);
    setSelectedTimeSlots([]);
    setSelectedType('lecture');
    setSelectedWeekType('all');
  };

  const handleDayToggle = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handleTimeSlotToggle = (timeSlot: string) => {
    setSelectedTimeSlots(prev =>
      prev.includes(timeSlot)
        ? prev.filter(t => t !== timeSlot)
        : [...prev, timeSlot]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Массовое добавление занятий</DialogTitle>
          <DialogDescription>
            Добавьте несколько занятий одновременно, выбрав предмет, преподавателя, аудиторию, дни недели и время.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Предмет</Label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите предмет" />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                {groupSubjects.map(subject => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="teacher">Преподаватель</Label>
            <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите преподавателя" />
              </SelectTrigger>
              <SelectContent>
                {teachers.map(teacher => (
                  <SelectItem key={teacher.uid} value={teacher.uid}>
                    {`${teacher.lastName} ${teacher.firstName} ${teacher.middleName || ''}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Тип занятия</Label>
            <Select value={selectedType} onValueChange={(value: 'lecture' | 'seminar' | 'lab' | 'exam') => setSelectedType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите тип занятия" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lecture">Лекция</SelectItem>
                <SelectItem value="seminar">Семинар</SelectItem>
                <SelectItem value="lab">Лабораторная</SelectItem>
                <SelectItem value="exam">Экзамен</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="weekType">Тип недели</Label>
            <Select value={selectedWeekType} onValueChange={(value: 'all' | 'odd' | 'even') => setSelectedWeekType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите тип недели" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Каждую неделю</SelectItem>
                <SelectItem value="odd">По нечетным</SelectItem>
                <SelectItem value="even">По четным</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="room">Аудитория</Label>
            <Input
              id="room"
              value={selectedRoom}
              onChange={e => setSelectedRoom(e.target.value)}
              placeholder="Например: 101, Онлайн"
            />
            {roomError && <div className="text-red-500 text-xs mt-1">{roomError}</div>}
          </div>

          <div className="space-y-2">
            <Label>Дни недели</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map(day => (
                <Button
                  key={day.value}
                  type="button"
                  variant={selectedDays.includes(day.value) ? 'default' : 'outline'}
                  onClick={() => handleDayToggle(day.value)}
                  className="flex-1"
                >
                  {day.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Время</Label>
            <div className="flex flex-wrap gap-2">
              {TIME_SLOTS.map(slot => (
                <Button
                  key={slot.value}
                  type="button"
                  variant={selectedTimeSlots.includes(slot.value) ? 'default' : 'outline'}
                  onClick={() => handleTimeSlotToggle(slot.value)}
                  className="flex-1"
                >
                  {slot.label}
                </Button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Отмена
              </Button>
            </DialogClose>
            <Button type="submit">
              Сохранить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BulkLessonForm; 