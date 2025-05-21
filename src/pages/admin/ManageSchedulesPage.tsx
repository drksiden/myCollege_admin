import React, { useState, useEffect, useCallback } from 'react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MoreHorizontal, PlusCircle, Edit2, Trash2, Eye, CalendarPlus, ListChecks, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import {
  getAllSchedules,
  deleteSchedule as deleteScheduleService, // Renamed to avoid conflict
  updateSchedule, // For updating the whole lessons array
  getSchedule as getScheduleService, // To refetch schedule for manage lessons dialog
} from '@/lib/firebaseService/scheduleService';
import { getAllGroups } from '@/lib/firebaseService/groupService';
import { updateUserInFirestore } from '@/lib/firebaseService/userService'; // For unlinking scheduleId from group
import ScheduleMetadataForm from '@/components/admin/schedules/ScheduleMetadataForm';
import LessonForm from '@/components/admin/schedules/LessonForm';
import ScheduleView from '@/components/admin/schedules/ScheduleView';
import type { Schedule, Lesson, Group } from '@/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Toaster } from '@/components/ui/sonner';
import { Timestamp } from 'firebase/firestore'; // For creating temp schedule object
import { writeBatch, doc } from 'firebase/firestore';

const ManageSchedulesPage: React.FC = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  
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

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedSchedules, fetchedGroups] = await Promise.all([
        getAllSchedules(db),
        getAllGroups(db),
      ]);
      setSchedules(fetchedSchedules);
      setGroups(fetchedGroups);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load schedules or groups.');
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
      const newSchedule = await getScheduleService(db, scheduleId);
      if (newSchedule) {
        // Update group's scheduleId
        const groupToUpdate = groups.find(g => g.id === newSchedule.groupId);
        if (groupToUpdate && !groupToUpdate.scheduleId) { // Only link if group doesn't have a schedule
            try {
                await updateDoc(doc(db, 'groups', newSchedule.groupId), { scheduleId: newSchedule.id });
                toast.info(`Schedule linked to group ${getGroupName(newSchedule.groupId)}.`);
                await fetchData(); // Refresh groups too
            } catch (groupError) {
                toast.error(`Failed to link schedule to group.`);
            }
        } else if (groupToUpdate && groupToUpdate.scheduleId) {
            toast.warn(`Group ${getGroupName(newSchedule.groupId)} already has a schedule. Not linked.`);
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
      // Delete schedule
      batch.delete(doc(db, 'schedules', scheduleToDelete.id));
      // Unlink from group
      const groupToUpdate = groups.find(g => g.scheduleId === scheduleToDelete.id);
      if (groupToUpdate) {
        batch.update(doc(db, 'groups', groupToUpdate.id), { scheduleId: "" });
      }
      await batch.commit();
      toast.success(`Schedule for ${getGroupName(scheduleToDelete.groupId)} deleted successfully.`);
      fetchData();
    } catch (error) {
      toast.error('Failed to delete schedule.');
    } finally {
      setScheduleToDelete(null);
      setIsSubmitting(false);
    }
  };

  const handleOpenManageLessons = async (schedule: Schedule) => {
    // Refetch the latest schedule data before opening, in case lessons changed
    setIsLoading(true);
    const freshSchedule = await getScheduleService(db, schedule.id);
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

  const handleOpenEditLessonDialog = (lesson: Lesson) => {
    if (!currentManagingSchedule) return;
    setSelectedLesson(lesson);
    setLessonFormMode('edit');
    setShowLessonFormDialog(true);
  };
  
  const handleLessonFormSuccess = async (lesson: Lesson) => {
    if (!currentManagingSchedule) return;
    setIsSubmitting(true);
    try {
      let updatedLessons: Lesson[];
      if (lessonFormMode === 'create') {
        updatedLessons = [...currentManagingSchedule.lessons, lesson];
      } else {
        updatedLessons = currentManagingSchedule.lessons.map(l => l.id === lesson.id ? lesson : l);
      }
      await updateSchedule(db, currentManagingSchedule.id, { lessons: updatedLessons });
      
      const updatedSchedule = { ...currentManagingSchedule, lessons: updatedLessons, updatedAt: Timestamp.now() };
      setCurrentManagingSchedule(updatedSchedule);
      setSchedules(prevSchedules => prevSchedules.map(s => s.id === updatedSchedule.id ? updatedSchedule : s));
      toast.success(`Lesson ${lessonFormMode === 'create' ? 'added' : 'updated'} successfully.`);
      setShowLessonFormDialog(false);
      setSelectedLesson(null);
    } catch (error) {
      toast.error(`Failed to ${lessonFormMode} lesson.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveLessonInitiate = (lessonId: string) => {
    if (!currentManagingSchedule) return;
    setLessonToRemove({ lessonId });
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
    } catch (error) {
      toast.error("Failed to remove lesson.");
    } finally {
      setLessonToRemove(null);
      setIsSubmitting(false);
    }
  };

  if (isLoading && schedules.length === 0 && groups.length === 0) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /> <span className="ml-2">Loading schedules...</span></div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <Toaster richColors position="top-right" />

      <Dialog open={showMetadataDialog} onOpenChange={(open) => { if (!open) setSelectedScheduleForMetadata(null); setShowMetadataDialog(open); }}>
        <DialogContent className="sm:max-w-md"><DialogHeader>
            <DialogTitle>{metadataFormMode === 'create' ? 'Create New Schedule' : 'Edit Schedule Details'}</DialogTitle>
            <DialogDescription>{metadataFormMode === 'create' ? 'Select group, semester, and year.' : `Editing: ${getGroupName(selectedScheduleForMetadata?.groupId || '')}`}</DialogDescription>
          </DialogHeader>{showMetadataDialog && <ScheduleMetadataForm mode={metadataFormMode} scheduleId={selectedScheduleForMetadata?.id} onFormSubmitSuccess={handleMetadataFormSuccess} onCancel={() => setShowMetadataDialog(false)} />}</DialogContent></Dialog>

      <Dialog open={showManageLessonsDialog} onOpenChange={(open) => { if (!open) setCurrentManagingSchedule(null); setShowManageLessonsDialog(open); }}>
        <DialogContent className="max-w-3xl lg:max-w-4xl xl:max-w-6xl h-[90vh] flex flex-col"><DialogHeader>
            <DialogTitle>Manage Schedule: {getGroupName(currentManagingSchedule?.groupId || '')} ({currentManagingSchedule?.year} Sem {currentManagingSchedule?.semester})</DialogTitle>
            <DialogDescription>Add, edit, or remove lessons from this schedule.</DialogDescription>
          </DialogHeader>{currentManagingSchedule && (<><div className="py-2 border-b mb-2">
                <Button onClick={handleOpenAddLessonDialog} size="sm" disabled={isSubmitting}><CalendarPlus className="mr-2 h-4 w-4" /> Add Lesson</Button>
              </div><div className="flex-grow overflow-y-auto pr-1"><ScheduleView schedule={currentManagingSchedule} onEditLesson={handleOpenEditLessonDialog} onRemoveLesson={handleRemoveLessonInitiate} isLoading={isSubmitting} />
              </div><DialogFooter className="mt-auto pt-4 border-t"><DialogClose asChild><Button type="button" variant="outline">Close</Button></DialogClose></DialogFooter></>)}</DialogContent></Dialog>

      <Dialog open={showLessonFormDialog} onOpenChange={(open) => { if (!open) setSelectedLesson(null); setShowLessonFormDialog(open); }}>
        <DialogContent className="sm:max-w-lg"><DialogHeader>
            <DialogTitle>{lessonFormMode === 'create' ? 'Add New Lesson' : 'Edit Lesson'}</DialogTitle>
            <DialogDescription>For schedule: {getGroupName(currentManagingSchedule?.groupId || '')} ({currentManagingSchedule?.year} Sem {currentManagingSchedule?.semester})</DialogDescription>
          </DialogHeader>{showLessonFormDialog && currentManagingSchedule && <LessonForm mode={lessonFormMode} lesson={selectedLesson || undefined} onFormSubmitSuccess={handleLessonFormSuccess} onCancel={() => setShowLessonFormDialog(false)} />}</DialogContent></Dialog>
      
      {scheduleToDelete && (<AlertDialog open={!!scheduleToDelete} onOpenChange={() => setScheduleToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>Delete schedule for {getGroupName(scheduleToDelete.groupId)} ({scheduleToDelete.year}, Sem {scheduleToDelete.semester})? This is irreversible.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteSchedule} className="bg-red-600 hover:bg-red-700" disabled={isSubmitting}>{isSubmitting ? "Deleting..." : "Delete"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>)}
      
      {lessonToRemove && (<AlertDialog open={!!lessonToRemove} onOpenChange={() => setLessonToRemove(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remove Lesson?</AlertDialogTitle>
              <AlertDialogDescription>Are you sure you want to remove this lesson?</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmRemoveLesson} className="bg-red-600 hover:bg-red-700" disabled={isSubmitting}>{isSubmitting ? "Removing..." : "Remove"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>)}

      <header className="mb-8"><div className="flex items-center justify-between"><div>
            <h1 className="text-3xl font-bold tracking-tight">Schedule Management</h1>
            <p className="mt-1 text-sm text-muted-foreground">Create, view, and manage academic schedules.</p>
          </div><Button onClick={handleOpenCreateScheduleDialog} disabled={isLoading}><PlusCircle className="mr-2 h-4 w-4" /> Create Schedule</Button></div></header>

      <section><div className="bg-card shadow sm:rounded-lg">{schedules.length === 0 && !isLoading ? (<div className="p-10 text-center text-muted-foreground">
              <ListChecks className="mx-auto h-12 w-12 text-gray-400 mb-4" /><h3 className="text-lg font-medium">No schedules found</h3>
              <p className="mt-1 text-sm">Get started by creating a new schedule.</p></div>) : (
          <Table><TableHeader><TableRow><TableHead>Group</TableHead><TableHead className="text-center">Year</TableHead><TableHead className="text-center">Semester</TableHead>
                <TableHead className="text-center">Lessons</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>{schedules.map(schedule => (<TableRow key={schedule.id}><TableCell className="font-medium">{getGroupName(schedule.groupId)}</TableCell>
                  <TableCell className="text-center">{schedule.year}</TableCell><TableCell className="text-center">{schedule.semester}</TableCell>
                  <TableCell className="text-center">{schedule.lessons?.length || 0}</TableCell><TableCell className="text-right">
                     <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Menu</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end"><DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleOpenManageLessons(schedule)}><Eye className="mr-2 h-4 w-4" /> View/Manage Lessons</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenEditScheduleMetadataDialog(schedule)}><Edit2 className="mr-2 h-4 w-4" /> Edit Details</DropdownMenuItem><DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDeleteScheduleInitiate(schedule)} className="text-red-600 focus:text-red-600"><Trash2 className="mr-2 h-4 w-4" /> Delete Schedule</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell></TableRow>))}
            </TableBody></Table>)}</div></section>
    </div>
  );
};
export default ManageSchedulesPage;
