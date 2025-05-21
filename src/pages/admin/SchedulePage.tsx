import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, Plus } from 'lucide-react';
import { ScheduleFormDialog } from '@/components/admin/schedule/ScheduleForm';
import { ScheduleView } from '@/components/admin/schedule/ScheduleView';
import { toast } from 'sonner';

interface ScheduleItem {
  id: string;
  subject: string;
  teacher: string;
  startTime: string;
  endTime: string;
  room: string;
  type: 'lecture' | 'practice' | 'lab';
  date: Date;
  groupId: string;
  subjectId: string;
  teacherId: string;
}

// Моковые данные для групп и расписания
const mockGroups = [
  { id: 'group1', name: 'Группа 1' },
  { id: 'group2', name: 'Группа 2' },
  { id: 'group3', name: 'Группа 3' },
];

const initialSchedule: ScheduleItem[] = [
  {
    id: '1',
    subject: 'Математика',
    teacher: 'Иванов И.И.',
    startTime: '09:00',
    endTime: '10:30',
    room: '101',
    type: 'lecture',
    date: new Date(2025, 4, 28),
    groupId: 'group1',
    subjectId: 'subj1',
    teacherId: 'teacher1',
  },
  {
    id: '2',
    subject: 'Программирование',
    teacher: 'Петров П.П.',
    startTime: '10:40',
    endTime: '12:10',
    room: '102',
    type: 'practice',
    date: new Date(2025, 4, 28),
    groupId: 'group1',
    subjectId: 'subj2',
    teacherId: 'teacher2',
  },
];

const SchedulePage: React.FC = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedGroup, setSelectedGroup] = useState<string>('group1');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ScheduleItem | undefined>();
  const [schedule, setSchedule] = useState<ScheduleItem[]>(initialSchedule);
  const [originalSchedule, setOriginalSchedule] = useState<ScheduleItem[]>(initialSchedule);
  const [isSaving, setIsSaving] = useState(false);

  // Фильтрация занятий по дате и группе
  const filteredSchedule = schedule.filter(
    (item) =>
      item.groupId === selectedGroup &&
      date &&
      item.date.getFullYear() === date.getFullYear() &&
      item.date.getMonth() === date.getMonth() &&
      item.date.getDate() === date.getDate()
  );

  const handleEdit = (item: ScheduleItem) => {
    setSelectedItem(item);
    setIsFormOpen(true);
  };

  const handleDelete = (itemId: string) => {
    setSchedule((prev) => prev.filter((item) => item.id !== itemId));
    toast.info('Занятие удалено (не сохранено)');
  };

  const handleScheduleSubmit = (data: Omit<ScheduleItem, 'id'>) => {
    if (selectedItem) {
      // Обновление существующего занятия
      setSchedule((prev) =>
        prev.map((item) =>
          item.id === selectedItem.id ? { ...item, ...data } : item
        )
      );
      toast.info('Занятие обновлено (не сохранено)');
    } else {
      // Добавление нового занятия
      const newItem: ScheduleItem = {
        id: Date.now().toString(),
        ...data,
      };
      setSchedule((prev) => [...prev, newItem]);
      toast.info('Занятие добавлено (не сохранено)');
    }
    setIsFormOpen(false);
    setSelectedItem(undefined);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Здесь должен быть вызов API/Firebase для сохранения schedule
      // await saveScheduleToFirebase(schedule);
      setOriginalSchedule(schedule);
      toast.success('Изменения успешно сохранены!');
    } catch (error) {
      toast.error('Ошибка при сохранении изменений');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setSchedule(originalSchedule);
    toast('Изменения отменены');
  };

  const hasUnsavedChanges = JSON.stringify(schedule) !== JSON.stringify(originalSchedule);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col gap-4"
    >
      <div className="flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Расписание
        </h1>
        <div className="flex gap-2">
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Добавить занятие
          </Button>
          {hasUnsavedChanges && (
            <>
              <Button onClick={handleSave} disabled={isSaving} variant="success">
                {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
              </Button>
              <Button onClick={handleCancel} variant="outline">
                Отменить
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Фильтры</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Группа</label>
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите группу" />
                </SelectTrigger>
                <SelectContent>
                  {mockGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Дата</label>
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md border"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Занятия на выбранный день
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScheduleView
              items={filteredSchedule}
              date={date || new Date()}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </CardContent>
        </Card>
      </div>

      <ScheduleFormDialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) {
            setSelectedItem(undefined);
          }
        }}
        onScheduleSubmitSuccess={handleScheduleSubmit}
        initialData={selectedItem}
      />
    </motion.div>
  );
};

export default SchedulePage;
