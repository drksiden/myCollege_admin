import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Trash2, Loader2, CalendarPlus, ListChecks, FileText, PlusCircle, MoreHorizontal, Eye, Edit2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { getAllSchedules, updateSchedule, getSchedule } from '@/lib/firebaseService/scheduleService';
import { getAllGroups } from '@/lib/firebaseService/groupService';
import { getAllTeachers } from '@/lib/firebaseService/teacherService';
import { getAllSubjects } from '@/services/firestore';
import { getAllRooms } from '@/lib/firebaseService/roomService';
import { getAllScheduleTemplates, saveScheduleTemplate, deleteScheduleTemplate, updateScheduleTemplate, type ScheduleTemplate } from '@/lib/firebaseService/scheduleTemplateService';
import { updateDoc, writeBatch, doc, Timestamp } from 'firebase/firestore';
import type { Schedule, Group, Teacher, Lesson, Subject } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import ScheduleMetadataForm from '@/components/admin/schedules/ScheduleMetadataForm';
import LessonForm from '@/components/admin/schedules/LessonForm';
import ScheduleView from '@/components/admin/schedules/ScheduleView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ScheduleCalendar from '@/components/admin/schedules/ScheduleCalendar';
import ScheduleFilters, { type ScheduleFilters as ScheduleFiltersType } from '@/components/admin/schedules/ScheduleFilters';
import BulkLessonForm from '@/components/admin/schedules/BulkLessonForm';
import ScheduleTemplateForm from '@/components/admin/schedules/ScheduleTemplateForm';
import ScheduleTemplatesList from '@/components/admin/schedules/ScheduleTemplatesList';
import ScheduleExport from '@/components/admin/schedules/ScheduleExport';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const ManageSchedulesPage: React.FC = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [rooms, setRooms] = useState<string[]>([]);
  
  const [showMetadataDialog, setShowMetadataDialog] = useState(false);
  const [metadataFormMode, setMetadataFormMode] = useState<'create' | 'edit'>('create');
  const [selectedScheduleForMetadata, setSelectedScheduleForMetadata] = useState<Schedule | null>(null);

  const [showManageLessonsDialog, setShowManageLessonsDialog] = useState(false);
  const [currentManagingSchedule, setCurrentManagingSchedule] = useState<Schedule | null>(null);
  
  const [showLessonFormDialog, setShowLessonFormDialog] = useState(false);
  const [lessonFormMode, setLessonFormMode] = useState<'create' | 'edit'>('create');
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  const [scheduleToDelete, setScheduleToDelete] = useState<Schedule | null>(null);
  const [lessonToRemove, setLessonToRemove] = useState<{ lessonId: string} | null>(null); // scheduleId is in currentManagingSchedule

  const [isLoading, setIsLoading] = useState(true); // For initial data load
  const [isSubmitting, setIsSubmitting] = useState(false); // For any submit operation

  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');

  const [filters, setFilters] = useState<ScheduleFiltersType>({
    search: '',
    groupId: '',
    teacherId: '',
  });

  const [showBulkLessonForm, setShowBulkLessonForm] = useState(false);

  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showTemplatesList, setShowTemplatesList] = useState(false);
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);

  const [editingTemplate, setEditingTemplate] = useState<ScheduleTemplate | null>(null);

  const [showExportDialog, setShowExportDialog] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedSchedules, fetchedGroups, fetchedTeachers, fetchedSubjects, fetchedRooms, fetchedTemplates] = await Promise.all([
        getAllSchedules(db),
        getAllGroups(db),
        getAllTeachers(db),
        getAllSubjects(),
        getAllRooms(),
        getAllScheduleTemplates(),
      ]);
      setSchedules(fetchedSchedules);
      setGroups(fetchedGroups);
      setTeachers(fetchedTeachers);
      setSubjects(fetchedSubjects);
      setRooms(fetchedRooms);
      setTemplates(fetchedTemplates);
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Failed to load data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getGroupName = (groupId: string) => groups.find(g => g.id === groupId)?.name || 'Unknown Group';

  const handleOpenCreateScheduleDialog = () => {
    setSelectedScheduleForMetadata(null);
    setMetadataFormMode('create');
    setShowMetadataDialog(true);
  };

  const handleOpenEditScheduleMetadataDialog = (schedule: Schedule) => {
    setSelectedScheduleForMetadata(schedule);
    setMetadataFormMode('edit');
    setShowMetadataDialog(true);
  };

  const handleMetadataFormSuccess = async (scheduleId: string) => {
    setShowMetadataDialog(false);
    await fetchData(); 
    if (metadataFormMode === 'create') {
      const newSchedule = await getSchedule(db, scheduleId);
      if (newSchedule) {
        // Update group's scheduleId
        const groupToUpdate = groups.find(g => g.id === newSchedule.groupId);
        if (groupToUpdate && !groupToUpdate.scheduleId) { // Only link if group doesn't have a schedule
          try {
            await updateDoc(doc(db, 'groups', newSchedule.groupId), { scheduleId: newSchedule.id });
            toast.info(`Schedule linked to group ${getGroupName(newSchedule.groupId)}.`);
            await fetchData(); // Refresh groups too
          } catch (error) {
            console.error('Failed to link schedule to group:', error);
            toast.error(`Failed to link schedule to group.`);
          }
        } else if (groupToUpdate && groupToUpdate.scheduleId) {
          toast.info(`Group ${getGroupName(newSchedule.groupId)} already has a schedule. Not linked.`);
        }
        setCurrentManagingSchedule(newSchedule);
        setShowManageLessonsDialog(true);
      } else {
        toast.error("Could not load the new schedule to manage lessons.");
      }
    }
  };
  
  const handleDeleteScheduleInitiate = (schedule: Schedule) => setScheduleToDelete(schedule);

  const confirmDeleteSchedule = async () => {
    if (!scheduleToDelete) return;
    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'schedules', scheduleToDelete.id));
      const groupToUpdate = groups.find(g => g.scheduleId === scheduleToDelete.id);
      if (groupToUpdate) {
        batch.update(doc(db, 'groups', groupToUpdate.id), { scheduleId: "" });
      }
      await batch.commit();
      toast.success(`Schedule for ${getGroupName(scheduleToDelete.groupId)} deleted successfully.`);
      fetchData();
    } catch (err) {
      console.error('Failed to delete schedule:', err);
      toast.error('Failed to delete schedule.');
    } finally {
      setScheduleToDelete(null);
      setIsSubmitting(false);
    }
  };

  const handleOpenManageLessons = async (schedule: Schedule) => {
    // Refetch the latest schedule data before opening, in case lessons changed
    setIsLoading(true);
    const freshSchedule = await getSchedule(db, schedule.id);
    if (freshSchedule) {
        setCurrentManagingSchedule(freshSchedule);
        setShowManageLessonsDialog(true);
    } else {
        toast.error("Could not load schedule details.");
    }
    setIsLoading(false);
  };

  const handleOpenAddLessonDialog = () => {
    if (!currentManagingSchedule) return;
    setSelectedLesson(null);
    setLessonFormMode('create');
    setShowLessonFormDialog(true);
  };

  const handleLessonFormSuccess = async () => {
    if (!currentManagingSchedule) return;
    setIsSubmitting(true);
    try {
      const updatedSchedule = { ...currentManagingSchedule, updatedAt: Timestamp.now() };
      await updateSchedule(db, currentManagingSchedule.id, { lessons: updatedSchedule.lessons });
      setCurrentManagingSchedule(updatedSchedule);
      setSchedules(prevSchedules => prevSchedules.map(s => s.id === updatedSchedule.id ? updatedSchedule : s));
      toast.success(`Lesson ${lessonFormMode === 'create' ? 'added' : 'updated'} successfully.`);
      setShowLessonFormDialog(false);
      setSelectedLesson(null);
    } catch (err) {
      console.error('Failed to update lesson:', err);
      toast.error(`Failed to ${lessonFormMode} lesson.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkAddLessons = async (lessons: Lesson[]) => {
    if (!currentManagingSchedule) return;
    setIsSubmitting(true);
    try {
      const updatedLessons = [...currentManagingSchedule.lessons, ...lessons];
      await updateSchedule(db, currentManagingSchedule.id, { lessons: updatedLessons });
      
      const updatedSchedule = { ...currentManagingSchedule, lessons: updatedLessons, updatedAt: Timestamp.now() };
      setCurrentManagingSchedule(updatedSchedule);
      setSchedules(prevSchedules => prevSchedules.map(s => s.id === updatedSchedule.id ? updatedSchedule : s));
      toast.success(`Added ${lessons.length} lessons successfully.`);
    } catch (error) {
      console.error('Failed to add lessons:', error);
      toast.error('Failed to add lessons.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveTemplate = async (template: { name: string; description: string; schedule: Schedule }) => {
    if (!currentManagingSchedule) return;
    setIsSubmitting(true);
    try {
      if (editingTemplate) {
        await updateScheduleTemplate(editingTemplate.id, {
          name: template.name,
          description: template.description,
          schedule: template.schedule,
        });
        toast.success('Template updated successfully.');
      } else {
        await saveScheduleTemplate(template);
        toast.success('Template saved successfully.');
      }
      const updatedTemplates = await getAllScheduleTemplates();
      setTemplates(updatedTemplates);
      setEditingTemplate(null);
    } catch (error) {
      console.error('Failed to save template:', error);
      toast.error(`Failed to ${editingTemplate ? 'update' : 'save'} template.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTemplate = (template: ScheduleTemplate) => {
    setEditingTemplate(template);
    setShowTemplateForm(true);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    setIsSubmitting(true);
    try {
      await deleteScheduleTemplate(templateId);
      const updatedTemplates = await getAllScheduleTemplates();
      setTemplates(updatedTemplates);
      toast.success('Template deleted successfully.');
    } catch (error) {
      console.error('Failed to delete template:', error);
      toast.error('Failed to delete template.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyTemplate = async (template: ScheduleTemplate) => {
    if (!currentManagingSchedule) return;
    setIsSubmitting(true);
    try {
      const updatedLessons = [...currentManagingSchedule.lessons, ...template.schedule.lessons];
      await updateSchedule(db, currentManagingSchedule.id, { lessons: updatedLessons });
      
      const updatedSchedule = { ...currentManagingSchedule, lessons: updatedLessons, updatedAt: Timestamp.now() };
      setCurrentManagingSchedule(updatedSchedule);
      setSchedules(prevSchedules => prevSchedules.map(s => s.id === updatedSchedule.id ? updatedSchedule : s));
      toast.success('Template applied successfully.');
      setShowTemplatesList(false);
    } catch (error) {
      console.error('Failed to apply template:', error);
      toast.error('Failed to apply template.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmRemoveLesson = async () => {
    if (!lessonToRemove || !currentManagingSchedule) return;
    setIsSubmitting(true);
    try {
      const updatedLessons = currentManagingSchedule.lessons.filter(l => l.id !== lessonToRemove.lessonId);
      await updateSchedule(db, currentManagingSchedule.id, { lessons: updatedLessons });
      const updatedSchedule = { ...currentManagingSchedule, lessons: updatedLessons, updatedAt: Timestamp.now() };
      setCurrentManagingSchedule(updatedSchedule);
      setSchedules(prevSchedules => prevSchedules.map(s => s.id === updatedSchedule.id ? updatedSchedule : s));
      toast.success("Lesson removed successfully.");
    } catch (err) {
      console.error('Failed to remove lesson:', err);
      toast.error("Failed to remove lesson.");
    } finally {
      setLessonToRemove(null);
      setIsSubmitting(false);
    }
  };

  const handleLessonClick = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setLessonFormMode('edit');
    setShowLessonFormDialog(true);
  };

  const filteredSchedules = React.useMemo(() => {
    return schedules.filter(schedule => {
      const matchesSearch = filters.search === '' || 
        getGroupName(schedule.groupId).toLowerCase().includes(filters.search.toLowerCase()) ||
        schedule.lessons.some(lesson => 
          lesson.subjectId.toLowerCase().includes(filters.search.toLowerCase()) ||
          lesson.room.toLowerCase().includes(filters.search.toLowerCase())
        );
      
      const matchesGroup = filters.groupId === '' || schedule.groupId === filters.groupId;
      
      const matchesTeacher = filters.teacherId === '' || 
        schedule.lessons.some(lesson => lesson.teacherId === filters.teacherId);

      return matchesSearch && matchesGroup && matchesTeacher;
    });
  }, [schedules, filters, getGroupName]);

  if (isLoading && schedules.length === 0 && groups.length === 0) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /> <span className="ml-2">Loading schedules...</span></div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <Dialog open={showMetadataDialog} onOpenChange={(open) => { if (!open) setSelectedScheduleForMetadata(null); setShowMetadataDialog(open); }}>
        <DialogContent className="sm:max-w-md"><DialogHeader>
            <DialogTitle>{metadataFormMode === 'create' ? 'Create New Schedule' : 'Edit Schedule Details'}</DialogTitle>
            <DialogDescription>{metadataFormMode === 'create' ? 'Select group, semester, and year.' : `Editing: ${getGroupName(selectedScheduleForMetadata?.groupId || '')}`}</DialogDescription>
          </DialogHeader>{showMetadataDialog && <ScheduleMetadataForm mode={metadataFormMode} scheduleId={selectedScheduleForMetadata?.id} onFormSubmitSuccess={handleMetadataFormSuccess} onCancel={() => setShowMetadataDialog(false)} />}</DialogContent></Dialog>

      <Dialog open={showManageLessonsDialog} onOpenChange={(open) => { if (!open) setCurrentManagingSchedule(null); setShowManageLessonsDialog(open); }}>
        <DialogContent className="max-w-3xl lg:max-w-4xl xl:max-w-6xl h-[90vh] flex flex-col"><DialogHeader>
            <DialogTitle>Manage Schedule: {getGroupName(currentManagingSchedule?.groupId || '')} ({currentManagingSchedule?.year} Sem {currentManagingSchedule?.semester})</DialogTitle>
            <DialogDescription>Add, edit, or remove lessons from this schedule.</DialogDescription>
          </DialogHeader>{currentManagingSchedule && (<><div className="py-2 border-b mb-2 flex items-center gap-2">
                <Button onClick={handleOpenAddLessonDialog} size="sm" disabled={isSubmitting}>
                  <CalendarPlus className="mr-2 h-4 w-4" /> Add Lesson
                </Button>
                <Button onClick={() => setShowBulkLessonForm(true)} size="sm" disabled={isSubmitting}>
                  <ListChecks className="mr-2 h-4 w-4" /> Bulk Add
                </Button>
                <Button onClick={() => setShowTemplateForm(true)} size="sm" disabled={isSubmitting}>
                  <FileText className="mr-2 h-4 w-4" /> Save as Template
                </Button>
                <Button onClick={() => setShowTemplatesList(true)} size="sm" disabled={isSubmitting}>
                  <FileText className="mr-2 h-4 w-4" /> Apply Template
                </Button>
              </div><div className="flex-grow overflow-y-auto pr-1"><ScheduleView
                schedule={currentManagingSchedule}
                subjects={subjects}
                teachers={teachers}
              />
              </div><DialogFooter className="mt-auto pt-4 border-t"><DialogClose asChild><Button type="button" variant="outline">Close</Button></DialogClose></DialogFooter></>)}</DialogContent></Dialog>

      <Dialog open={showLessonFormDialog} onOpenChange={(open) => { if (!open) setSelectedLesson(null); setShowLessonFormDialog(open); }}>
        <DialogContent className="sm:max-w-lg"><DialogHeader>
            <DialogTitle>{lessonFormMode === 'create' ? 'Add New Lesson' : 'Edit Lesson'}</DialogTitle>
            <DialogDescription>For schedule: {getGroupName(currentManagingSchedule?.groupId || '')} ({currentManagingSchedule?.year} Sem {currentManagingSchedule?.semester})</DialogDescription>
          </DialogHeader>{showLessonFormDialog && currentManagingSchedule && (
            <LessonForm
              mode={lessonFormMode}
              scheduleId={currentManagingSchedule.id}
              lessonId={selectedLesson?.id}
              subjects={subjects}
              teachers={teachers}
              onFormSubmitSuccess={handleLessonFormSuccess}
              onCancel={() => setShowLessonFormDialog(false)}
            />
          )}</DialogContent></Dialog>
      
      {scheduleToDelete && (<AlertDialog open={!!scheduleToDelete} onOpenChange={() => setScheduleToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>Delete schedule for {getGroupName(scheduleToDelete.groupId)} ({scheduleToDelete.year}, Sem {scheduleToDelete.semester})? This is irreversible.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteSchedule} className="bg-red-600 hover:bg-red-700" disabled={isSubmitting}>{isSubmitting ? "Deleting..." : "Delete"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>)}
      
      {lessonToRemove && (<AlertDialog open={!!lessonToRemove} onOpenChange={() => setLessonToRemove(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remove Lesson?</AlertDialogTitle>
              <AlertDialogDescription>Are you sure you want to remove this lesson?</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmRemoveLesson} className="bg-red-600 hover:bg-red-700" disabled={isSubmitting}>{isSubmitting ? "Removing..." : "Remove"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>)}

      {currentManagingSchedule && (
        <>
          <BulkLessonForm
            open={showBulkLessonForm}
            onOpenChange={setShowBulkLessonForm}
            onAddLessons={handleBulkAddLessons}
            subjects={subjects.map(s => ({ id: s.id, name: s.name }))}
            teachers={teachers.map(t => ({ id: t.id, name: `${t.firstName} ${t.lastName}`.trim() }))}
            rooms={rooms}
          />
          <ScheduleTemplateForm
            open={showTemplateForm}
            onOpenChange={(open) => {
              if (!open) {
                setEditingTemplate(null);
              }
              setShowTemplateForm(open);
            }}
            onSaveTemplate={handleSaveTemplate}
            schedule={currentManagingSchedule}
            editingTemplate={editingTemplate}
          />
        </>
      )}

      <ScheduleTemplatesList
        open={showTemplatesList}
        onOpenChange={setShowTemplatesList}
        templates={templates}
        onDeleteTemplate={handleDeleteTemplate}
        onApplyTemplate={handleApplyTemplate}
        onEditTemplate={handleEditTemplate}
      />

      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Schedule Management</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Create, view, and manage academic schedules.
            </p>
          </div>
          <Button onClick={handleOpenCreateScheduleDialog} disabled={isLoading}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create Schedule
          </Button>
        </div>
      </header>

      <section>
        <div className="bg-card shadow sm:rounded-lg">
          {schedules.length === 0 && !isLoading ? (
            <div className="p-10 text-center text-muted-foreground">
              <ListChecks className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium">No schedules found</h3>
              <p className="mt-1 text-sm">Get started by creating a new schedule.</p>
            </div>
          ) : (
            <>
              <div className="p-4 border-b">
                <ScheduleFilters
                  groups={groups}
                  teachers={teachers}
                  onFilterChange={setFilters}
                />
              </div>

              <Tabs defaultValue="table" value={viewMode} onValueChange={(v) => setViewMode(v as 'table' | 'calendar')}>
                <div className="border-b px-4 py-2">
                  <TabsList>
                    <TabsTrigger value="table">Table View</TabsTrigger>
                    <TabsTrigger value="calendar">Calendar View</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="table" className="p-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Group</TableHead>
                        <TableHead className="text-center">Year</TableHead>
                        <TableHead className="text-center">Semester</TableHead>
                        <TableHead className="text-center">Lessons</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSchedules.map(schedule => (
                        <TableRow key={schedule.id}>
                          <TableCell className="font-medium">
                            {getGroupName(schedule.groupId)}
                          </TableCell>
                          <TableCell className="text-center">{schedule.year}</TableCell>
                          <TableCell className="text-center">{schedule.semester}</TableCell>
                          <TableCell className="text-center">
                            {schedule.lessons?.length || 0}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <ScheduleExport
                                schedule={schedule}
                                subjects={subjects.map(s => ({ id: s.id, name: s.name }))}
                                teachers={teachers.map(t => ({ id: t.id, firstName: t.firstName, lastName: t.lastName }))}
                                open={showExportDialog}
                                onOpenChange={setShowExportDialog}
                              />
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => handleOpenManageLessons(schedule)}>
                                    <Eye className="mr-2 h-4 w-4" /> View/Manage Lessons
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleOpenEditScheduleMetadataDialog(schedule)}>
                                    <Edit2 className="mr-2 h-4 w-4" /> Edit Details
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteScheduleInitiate(schedule)}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Schedule
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="calendar" className="p-4">
                  <div className="space-y-4">
                    {filteredSchedules.map(schedule => (
                      <div key={schedule.id} className="border rounded-lg overflow-hidden">
                        <div className="bg-muted/50 px-4 py-2 border-b flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">
                              {getGroupName(schedule.groupId)} - Semester {schedule.semester}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {schedule.year} Academic Year
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <ScheduleExport
                              schedule={schedule}
                              subjects={subjects.map(s => ({ id: s.id, name: s.name }))}
                              teachers={teachers.map(t => ({ id: t.id, firstName: t.firstName, lastName: t.lastName }))}
                              open={showExportDialog}
                              onOpenChange={setShowExportDialog}
                            />
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleOpenManageLessons(schedule)}>
                                  <Eye className="mr-2 h-4 w-4" /> View/Manage Lessons
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenEditScheduleMetadataDialog(schedule)}>
                                  <Edit2 className="mr-2 h-4 w-4" /> Edit Details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteScheduleInitiate(schedule)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete Schedule
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        <div className="h-[600px]">
                          <ScheduleCalendar
                            schedule={schedule}
                            onLessonClick={handleLessonClick}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </section>
    </div>
  );
};
export default ManageSchedulesPage;
