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
  subjects: { id: string; name: string; teacherId?: string }[];
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
  onAddLessons,
  subjects,
}) => {
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);
  const [roomError, setRoomError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRoomError(null);
    if (!selectedSubject || !selectedRoom || selectedDays.length === 0 || selectedTimeSlots.length === 0) {
      if (!selectedRoom) setRoomError('Аудитория обязательна');
      toast.error('Пожалуйста, заполните все обязательные поля');
      return;
    }

    const lessons: Lesson[] = [];
    const subject = subjects.find(s => s.id === selectedSubject);
    if (!subject) {
      toast.error('Ошибка: предмет не найден');
      return;
    }
    for (const day of selectedDays) {
      for (const timeSlot of selectedTimeSlots) {
        const [startTime, endTime] = timeSlot.split('-');
        lessons.push({
          id: uuidv4(),
          subjectId: selectedSubject,
          teacherId: subject.teacherId || '',
          room: selectedRoom,
          dayOfWeek: DAYS_OF_WEEK.findIndex(d => d.value === day) + 1,
          startTime,
          endTime,
          type: 'lecture',
          weekType: 'all'
        });
      }
    }

    onAddLessons(lessons);
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedSubject('');
    setSelectedRoom('');
    setSelectedDays([]);
    setSelectedTimeSlots([]);
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
            Добавьте несколько занятий одновременно, выбрав предмет, аудиторию, дни недели и время.
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
            <Button type="submit">Добавить занятия</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BulkLessonForm; 