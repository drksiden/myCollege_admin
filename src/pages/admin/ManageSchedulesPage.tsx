import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Trash2, Edit2 } from 'lucide-react';
import LessonForm from '@/components/admin/schedules/LessonForm';
import BulkLessonForm from '@/components/admin/schedules/BulkLessonForm';
import ScheduleTemplateForm from '@/components/admin/schedules/ScheduleTemplateForm';
import { ScheduleTemplatesList } from '@/components/admin/schedules/ScheduleTemplatesList';
import { useToast } from '@/components/ui/use-toast';
import { getGroupSchedule, createLesson, updateLesson, deleteLesson } from '@/lib/firebaseService/scheduleService';
import { saveScheduleTemplate, getAllScheduleTemplates, deleteScheduleTemplate, updateScheduleTemplate } from '@/lib/firebaseService/scheduleTemplateService';
import { getAllGroups } from '@/lib/firebaseService/groupService';
import { getAllTeachers } from '@/lib/firebaseService/teacherService';
import { getAllSubjects } from '@/lib/firebaseService/subjectService';
import { getSemesters } from '@/lib/firebaseService/semesterService';
import type { Lesson, Group, TeacherUser, Subject, Semester, ScheduleTemplate } from '@/types';

export default function ManageSchedulesPage() {
  const { toast } = useToast();

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [teachers, setTeachers] = useState<TeacherUser[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLessonFormOpen, setIsLessonFormOpen] = useState(false);
  const [isBulkLessonFormOpen, setIsBulkLessonFormOpen] = useState(false);
  const [isTemplateFormOpen, setIsTemplateFormOpen] = useState(false);
  const [isTemplatesListOpen, setIsTemplatesListOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<ScheduleTemplate | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [groupsData, teachersData, subjectsData, semestersData, templatesData] = await Promise.all([
          getAllGroups(),
          getAllTeachers(),
          getAllSubjects(),
          getSemesters(),
          getAllScheduleTemplates(),
        ]);

        setGroups(groupsData);
        setTeachers(teachersData);
        setSubjects(subjectsData);
        setSemesters(semestersData);
        setTemplates(templatesData);

        if (groupsData.length > 0) {
          setSelectedGroup(groupsData[0].id);
        }
        if (semestersData.length > 0) {
          setSelectedSemester(semestersData[0].id);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: 'Ошибка',
          description: 'Не удалось загрузить данные',
          variant: 'destructive',
        });
      }
    };

    fetchData();
  }, [toast]);

  useEffect(() => {
    const fetchLessons = async () => {
      if (selectedGroup && selectedSemester) {
        try {
          const lessonsData = await getGroupSchedule(selectedGroup, selectedSemester);
          setLessons(lessonsData);
        } catch (error) {
          console.error('Error fetching lessons:', error);
          toast({
            title: 'Ошибка',
            description: 'Не удалось загрузить расписание',
            variant: 'destructive',
          });
        }
      }
    };

    fetchLessons();
  }, [selectedGroup, selectedSemester, toast]);

  const handleCreateLesson = async (lesson: Omit<Lesson, 'id'>) => {
    try {
      await createLesson(lesson);
      const updatedLessons = await getGroupSchedule(selectedGroup, selectedSemester);
      setLessons(updatedLessons);
      setIsLessonFormOpen(false);
      toast({
        title: 'Успех',
        description: 'Занятие успешно создано',
      });
    } catch (error) {
      console.error('Error creating lesson:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось создать занятие',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateLesson = async (lesson: Omit<Lesson, 'id'>) => {
    if (!editingLesson) return;
    try {
      await updateLesson({ ...lesson, id: editingLesson.id });
      const updatedLessons = await getGroupSchedule(selectedGroup, selectedSemester);
      setLessons(updatedLessons);
      setEditingLesson(null);
      toast({
        title: 'Успех',
        description: 'Занятие успешно обновлено',
      });
    } catch (error) {
      console.error('Error updating lesson:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить занятие',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    try {
      await deleteLesson(lessonId);
      const updatedLessons = await getGroupSchedule(selectedGroup, selectedSemester);
      setLessons(updatedLessons);
      toast({
        title: 'Успех',
        description: 'Занятие успешно удалено',
      });
    } catch (error) {
      console.error('Error deleting lesson:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить занятие',
        variant: 'destructive',
      });
    }
  };

  const handleSaveTemplate = async (template: { name: string; description: string; lessons: Lesson[] }) => {
    try {
      if (editingTemplate) {
        await updateScheduleTemplate(editingTemplate.id, template);
      } else {
        await saveScheduleTemplate(template);
      }
      const updatedTemplates = await getAllScheduleTemplates();
      setTemplates(updatedTemplates);
      setIsTemplateFormOpen(false);
      setEditingTemplate(null);
      toast({
        title: 'Успех',
        description: `Шаблон успешно ${editingTemplate ? 'обновлен' : 'создан'}`,
      });
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: 'Ошибка',
        description: `Не удалось ${editingTemplate ? 'обновить' : 'создать'} шаблон`,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await deleteScheduleTemplate(templateId);
      const updatedTemplates = await getAllScheduleTemplates();
      setTemplates(updatedTemplates);
      toast({
        title: 'Успех',
        description: 'Шаблон успешно удален',
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить шаблон',
        variant: 'destructive',
      });
    }
  };

  const handleApplyTemplate = (template: ScheduleTemplate) => {
    // TODO: Implement template application logic
    console.log('Applying template:', template);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Управление расписанием</h1>
        <div className="flex gap-2">
          <Button onClick={() => setIsLessonFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Добавить занятие
          </Button>
          <Button onClick={() => setIsBulkLessonFormOpen(true)} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Массовое добавление
          </Button>
          <Button onClick={() => setIsTemplateFormOpen(true)} variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            Сохранить как шаблон
          </Button>
          <Button onClick={() => setIsTemplatesListOpen(true)} variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            Шаблоны
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Select value={selectedGroup} onValueChange={setSelectedGroup}>
          <SelectTrigger>
            <SelectValue placeholder="Выберите группу" />
          </SelectTrigger>
          <SelectContent>
            {groups.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedSemester} onValueChange={setSelectedSemester}>
          <SelectTrigger>
            <SelectValue placeholder="Выберите семестр" />
          </SelectTrigger>
          <SelectContent>
            {semesters.map((semester) => (
              <SelectItem key={semester.id} value={semester.id}>
                {semester.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Поиск занятий..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <ScrollArea className="h-[calc(100vh-300px)]">
        <div className="grid grid-cols-1 gap-4">
          {lessons
            .filter((lesson) => {
              const subject = subjects.find((s) => s.id === lesson.subjectId);
              const teacher = teachers.find((t) => t.uid === lesson.teacherId);
              const searchLower = searchQuery.toLowerCase();
              return (
                subject?.name.toLowerCase().includes(searchLower) ||
                teacher?.lastName?.toLowerCase().includes(searchLower) ||
                lesson.room.toLowerCase().includes(searchLower)
              );
            })
            .map((lesson) => {
              const subject = subjects.find((s) => s.id === lesson.subjectId);
              const teacher = teachers.find((t) => t.uid === lesson.teacherId);
              return (
                <div
                  key={lesson.id}
                  className="p-4 border rounded-lg flex justify-between items-center"
                >
                  <div>
                    <h3 className="font-semibold">{subject?.name}</h3>
                    <p className="text-sm text-gray-500">
                      {teacher?.lastName} {teacher?.firstName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {lesson.room} • {lesson.startTime} - {lesson.endTime}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">{lesson.type}</Badge>
                      <Badge variant="outline">{lesson.weekType}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingLesson(lesson);
                        setIsLessonFormOpen(true);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteLesson(lesson.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
        </div>
      </ScrollArea>

      <LessonForm
        open={isLessonFormOpen}
        onOpenChange={setIsLessonFormOpen}
        onSubmit={editingLesson ? handleUpdateLesson : handleCreateLesson}
        subjects={subjects}
        teachers={teachers}
        groupId={selectedGroup}
        semesterId={selectedSemester}
        lesson={editingLesson}
      />

      <BulkLessonForm
        open={isBulkLessonFormOpen}
        onOpenChange={setIsBulkLessonFormOpen}
        onSave={handleCreateLesson}
        subjects={subjects}
        teachers={teachers}
        groupId={selectedGroup}
        semesterId={selectedSemester}
      />

      <ScheduleTemplateForm
        open={isTemplateFormOpen}
        onOpenChange={setIsTemplateFormOpen}
        onSaveTemplate={handleSaveTemplate}
        lessons={lessons}
        template={editingTemplate}
      />

      <ScheduleTemplatesList
        templates={templates}
        onApplyTemplate={handleApplyTemplate}
        onEditTemplate={(template) => {
          setEditingTemplate(template);
          setIsTemplateFormOpen(true);
        }}
        onDeleteTemplate={handleDeleteTemplate}
      />
    </div>
  );
}
