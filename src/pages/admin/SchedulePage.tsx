import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface ScheduleItem {
  id: string;
  groupId: string;
  subject: string;
  teacherId: string;
  teacherName: string;
  dayOfWeek: number;
  lessonNumber: number;
  startTime: string;
  endTime: string;
  classroom: string;
  lessonType: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface Group {
  id: string;
  name: string;
  course: number;
  specialty: string;
  subjects: Array<{
    subjectName: string;
    teacherId: string;
    teacherName: string;
  }>;
}

export default function SchedulePage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [formData, setFormData] = useState({
    subject: '',
    teacherId: '',
    dayOfWeek: 1,
    lessonNumber: 1,
    startTime: '09:00',
    endTime: '10:30',
    classroom: '',
    lessonType: 'Лекция'
  });

  // Загрузка групп
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const groupsRef = collection(db, 'groups');
        const snapshot = await getDocs(groupsRef);
        const groupsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Group[];
        setGroups(groupsData);
      } catch (error) {
        console.error('Error fetching groups:', error);
      }
    };

    fetchGroups();
  }, []);

  // Загрузка расписания
  useEffect(() => {
    const fetchSchedule = async () => {
      if (!selectedGroup) return;

      setLoading(true);
      try {
        const scheduleRef = collection(db, 'groups', selectedGroup, 'schedule');
        const snapshot = await getDocs(scheduleRef);
        const scheduleData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ScheduleItem[];
        setSchedule(scheduleData);
      } catch (error) {
        console.error('Error fetching schedule:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [selectedGroup]);

  const handleEdit = (item: ScheduleItem) => {
    setEditingItem(item);
    setFormData({
      subject: item.subject,
      teacherId: item.teacherId,
      dayOfWeek: item.dayOfWeek,
      lessonNumber: item.lessonNumber,
      startTime: item.startTime,
      endTime: item.endTime,
      classroom: item.classroom,
      lessonType: item.lessonType
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот элемент расписания?')) return;

    try {
      await deleteDoc(doc(db, 'groups', selectedGroup, 'schedule', id));
      setSchedule(schedule.filter(item => item.id !== id));
    } catch (error) {
      console.error('Error deleting schedule item:', error);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) return;

    const selectedGroupData = groups.find(g => g.id === selectedGroup);
    if (!selectedGroupData) return;

    const selectedSubject = selectedGroupData.subjects.find(s => s.subjectName === formData.subject);
    if (!selectedSubject) return;

    const scheduleData = {
      ...formData,
      groupId: selectedGroup,
      teacherId: selectedSubject.teacherId,
      teacherName: selectedSubject.teacherName,
      createdAt: editingItem ? editingItem.createdAt : Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    try {
      if (editingItem) {
        await updateDoc(doc(db, 'groups', selectedGroup, 'schedule', editingItem.id), scheduleData);
        setSchedule(schedule.map(item => 
          item.id === editingItem.id ? { ...item, ...scheduleData } : item
        ));
      } else {
        const docRef = await addDoc(collection(db, 'groups', selectedGroup, 'schedule'), scheduleData);
        setSchedule([...schedule, { id: docRef.id, ...scheduleData }]);
      }

      setIsDialogOpen(false);
      setEditingItem(null);
      setFormData({
        subject: '',
        teacherId: '',
        dayOfWeek: 1,
        lessonNumber: 1,
        startTime: '09:00',
        endTime: '10:30',
        classroom: '',
        lessonType: 'Лекция'
      });
    } catch (error) {
      console.error('Error saving schedule item:', error);
    }
  };

  const getDayName = (day: number) => {
    const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    return days[day - 1] || '';
  };

  const getLessonTypeName = (type: string) => {
    const types: { [key: string]: string } = {
      'Лекция': 'Лекция',
      'Практика': 'Практическое занятие',
      'Лабораторная': 'Лабораторная работа',
      'Семинар': 'Семинар'
    };
    return types[type] || type;
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Расписание занятий</h1>
        <Button onClick={() => setIsDialogOpen(true)}>Добавить занятие</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Select value={selectedGroup} onValueChange={setSelectedGroup}>
          <SelectTrigger>
            <SelectValue placeholder="Выберите группу" />
          </SelectTrigger>
          <SelectContent>
            {groups.map(group => (
              <SelectItem key={group.id} value={group.id}>
                {group.name} - {group.specialty}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {schedule.map(item => (
            <Card key={item.id}>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>{item.subject}</span>
                  <div className="space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                      Редактировать
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)}>
                      Удалить
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>Преподаватель: {item.teacherName}</p>
                <p>День: {getDayName(item.dayOfWeek)}</p>
                <p>Пара: {item.lessonNumber}</p>
                <p>Время: {item.startTime} - {item.endTime}</p>
                <p>Аудитория: {item.classroom}</p>
                <p>Тип: {getLessonTypeName(item.lessonType)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Редактировать занятие' : 'Добавить занятие'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleScheduleSubmit} className="space-y-4">
            <Select
              value={formData.subject}
              onValueChange={(value) => setFormData({ ...formData, subject: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите предмет" />
              </SelectTrigger>
              <SelectContent>
                {selectedGroup && groups
                  .find(g => g.id === selectedGroup)
                  ?.subjects.map(subject => (
                    <SelectItem key={subject.subjectName} value={subject.subjectName}>
                      {subject.subjectName}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Select
              value={formData.dayOfWeek.toString()}
              onValueChange={(value) => setFormData({ ...formData, dayOfWeek: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите день недели" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6].map(day => (
                  <SelectItem key={day} value={day.toString()}>
                    {getDayName(day)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={formData.lessonNumber.toString()}
              onValueChange={(value) => setFormData({ ...formData, lessonNumber: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите номер пары" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} пара
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="grid grid-cols-2 gap-4">
              <Input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              />
              <Input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              />
            </div>

            <Input
              placeholder="Номер аудитории"
              value={formData.classroom}
              onChange={(e) => setFormData({ ...formData, classroom: e.target.value })}
            />

            <Select
              value={formData.lessonType}
              onValueChange={(value) => setFormData({ ...formData, lessonType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите тип занятия" />
              </SelectTrigger>
              <SelectContent>
                {['Лекция', 'Практика', 'Лабораторная', 'Семинар'].map(type => (
                  <SelectItem key={type} value={type}>
                    {getLessonTypeName(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Отмена
              </Button>
              <Button type="submit">
                {editingItem ? 'Сохранить' : 'Добавить'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
