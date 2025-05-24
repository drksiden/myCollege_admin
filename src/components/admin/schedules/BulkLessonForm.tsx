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
import type { Lesson } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface BulkLessonFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddLessons: (lessons: Lesson[]) => void;
  subjects: { id: string; name: string }[];
  teachers: { id: string; name: string }[];
  rooms: string[];
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
  { value: '1', label: '1 пара (8:30 - 10:00)' },
  { value: '2', label: '2 пара (10:10 - 11:40)' },
  { value: '3', label: '3 пара (12:10 - 13:40)' },
  { value: '4', label: '4 пара (14:00 - 15:30)' },
  { value: '5', label: '5 пара (15:40 - 17:10)' },
  { value: '6', label: '6 пара (17:20 - 18:50)' },
];

const BulkLessonForm: React.FC<BulkLessonFormProps> = ({
  open,
  onOpenChange,
  onAddLessons,
  subjects,
  teachers,
  rooms,
}) => {
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);
  const [weeks, setWeeks] = useState('1-16');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSubject || !selectedTeacher || !selectedRoom || selectedDays.length === 0 || selectedTimeSlots.length === 0) {
      toast.error('Пожалуйста, заполните все обязательные поля');
      return;
    }

    const [startWeek, endWeek] = weeks.split('-').map(Number);
    if (isNaN(startWeek) || isNaN(endWeek) || startWeek > endWeek || startWeek < 1 || endWeek > 16) {
      toast.error('Пожалуйста, введите корректный диапазон недель (1-16)');
      return;
    }

    const lessons: Lesson[] = [];
    const subject = subjects.find(s => s.id === selectedSubject);
    const teacher = teachers.find(t => t.id === selectedTeacher);

    if (!subject || !teacher) {
      toast.error('Ошибка: предмет или преподаватель не найдены');
      return;
    }

    for (let week = startWeek; week <= endWeek; week++) {
      for (const day of selectedDays) {
        for (const timeSlot of selectedTimeSlots) {
          const [startTime, endTime] = timeSlot.split(' - ');
          lessons.push({
            id: uuidv4(),
            subjectId: selectedSubject,
            teacherId: selectedTeacher,
            room: selectedRoom,
            dayOfWeek: DAYS_OF_WEEK.findIndex(d => d.value === day) + 1,
            startTime,
            endTime,
            type: 'lecture',
            weekType: 'all'
          });
        }
      }
    }

    onAddLessons(lessons);
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedSubject('');
    setSelectedTeacher('');
    setSelectedRoom('');
    setSelectedDays([]);
    setSelectedTimeSlots([]);
    setWeeks('1-16');
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
          <DialogTitle>Массовое добавление уроков</DialogTitle>
          <DialogDescription>
            Добавьте несколько уроков одновременно, выбрав предмет, преподавателя, аудиторию, дни недели и время.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Предмет</Label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите предмет" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map(subject => (
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
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="room">Аудитория</Label>
            <Select value={selectedRoom} onValueChange={setSelectedRoom}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите аудиторию" />
              </SelectTrigger>
              <SelectContent>
                {rooms.map(room => (
                  <SelectItem key={room} value={room}>
                    {room}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          <div className="space-y-2">
            <Label htmlFor="weeks">Недели</Label>
            <Input
              id="weeks"
              value={weeks}
              onChange={(e) => setWeeks(e.target.value)}
              placeholder="Например: 1-16"
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Отмена
              </Button>
            </DialogClose>
            <Button type="submit">Добавить уроки</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BulkLessonForm; 