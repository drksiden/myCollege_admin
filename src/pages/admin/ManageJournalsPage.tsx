import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MoreHorizontal, PlusCircle, Edit2, Trash2, BookOpen, Loader2 } from 'lucide-react';
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
// Services
import { getAllJournals, deleteJournal as deleteJournalService, getJournal } from '@/lib/firebaseService/journalService';
import { getAllGroups } from '@/lib/firebaseService/groupService';
import { getAllSubjects } from '@/lib/firebaseService/subjectService';
import { getAllTeachers as getAllTeacherProfiles } from '@/lib/firebaseService/teacherService';
import { getUsersFromFirestore } from '@/lib/firebaseService/userService';
// Components
import JournalMetadataForm from '@/components/admin/journals/JournalMetadataForm';
import ManageJournalEntriesView from '@/components/admin/journals/ManageJournalEntriesView';
// Types
import type { Journal, Group, Subject, Teacher, User } from '@/types';
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

const ManageJournalsPage: React.FC = () => {
  const [journals, setJournals] = useState<Journal[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]); 
  const [users, setUsers] = useState<User[]>([]); 

  const [showMetadataDialog, setShowMetadataDialog] = useState(false);
  const [metadataFormMode, setMetadataFormMode] = useState<'create' | 'edit'>('create');
  const [selectedJournalForMetadata, setSelectedJournalForMetadata] = useState<Journal | null>(null);

  const [showManageEntriesDialog, setShowManageEntriesDialog] = useState(false);
  const [currentManagingJournal, setCurrentManagingJournal] = useState<Journal | null>(null);
  
  const [journalToDelete, setJournalToDelete] = useState<Journal | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedJournals, fetchedGroups, fetchedSubjects, fetchedTeacherProfiles, fetchedUsers] = await Promise.all([
        getAllJournals(db),
        getAllGroups(),
        getAllSubjects(),
        getAllTeacherProfiles(),
        getUsersFromFirestore(db),
      ]);
      setJournals(fetchedJournals);
      setGroups(fetchedGroups);
      setSubjects(fetchedSubjects);
      setTeachers(fetchedTeacherProfiles);
      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      toast.error('Failed to load necessary data for journals page.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getGroupName = (groupId: string) => groups.find(g => g.id === groupId)?.name || 'N/A';
  const getSubjectName = (subjectId: string) => subjects.find(s => s.id === subjectId)?.name || 'N/A';
  const getTeacherName = (teacherProfileId: string) => {
    const teacherProfile = teachers.find(t => t.id === teacherProfileId);
    if (!teacherProfile) return 'N/A';
    const user = users.find(u => u.uid === teacherProfile.userId);
    return user ? `${user.firstName} ${user.lastName}`.trim() : 'N/A';
  };

  const handleOpenCreateJournalDialog = () => {
    setSelectedJournalForMetadata(null);
    setMetadataFormMode('create');
    setShowMetadataDialog(true);
  };

  const handleOpenEditMetadataDialog = (journal: Journal) => {
    setSelectedJournalForMetadata(journal);
    setMetadataFormMode('edit');
    setShowMetadataDialog(true);
  };

  const handleMetadataFormSuccess = async (journalId: string) => {
    setShowMetadataDialog(false);
    await fetchData(); 
    if (metadataFormMode === 'create') {
      const newJournal = await getJournal(db, journalId); // Fetch the newly created journal
      if (newJournal) {
        setCurrentManagingJournal(newJournal);
        setShowManageEntriesDialog(true); 
      } else {
        toast.error("Could not load the new journal to manage entries.");
      }
    }
  };

  const handleOpenManageEntriesDialog = async (journal: Journal) => {
    // Fetch latest journal data before opening, especially the 'entries'
    setIsLoading(true);
    const freshJournal = await getJournal(db, journal.id);
    if (freshJournal) {
        setCurrentManagingJournal(freshJournal);
        setShowManageEntriesDialog(true);
    } else {
        toast.error("Could not load journal details.");
        setCurrentManagingJournal(journal); // Fallback to potentially stale data
        setShowManageEntriesDialog(true);
    }
    setIsLoading(false);
  };
  
  const handleEntriesUpdated = async () => {
    if (currentManagingJournal) {
      const updatedJournal = await getJournal(db, currentManagingJournal.id);
      if (updatedJournal) {
        setCurrentManagingJournal(updatedJournal); 
        setJournals(prev => prev.map(j => j.id === updatedJournal.id ? updatedJournal : j));
      } else {
        // Journal might have been deleted in another session, close dialog and refresh main list
        setShowManageEntriesDialog(false);
        fetchData();
      }
    }
  };

  const handleDeleteJournalInitiate = (journal: Journal) => setJournalToDelete(journal);

  const confirmDeleteJournal = async () => {
    if (!journalToDelete) return;
    setIsSubmitting(true);
    try {
      await deleteJournalService(db, journalToDelete.id);
      toast.success(`Journal deleted successfully.`);
      await fetchData();
    } catch (error) {
      toast.error('Failed to delete journal.');
      console.error("Error deleting journal:", error);
    } finally {
      setJournalToDelete(null);
      setIsSubmitting(false);
    }
  };

  if (isLoading && journals.length === 0) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /> <span className="ml-2">Loading journals...</span></div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <Toaster richColors position="top-right" />

      <Dialog open={showMetadataDialog} onOpenChange={(open) => { if (!open) setSelectedJournalForMetadata(null); setShowMetadataDialog(open); }}>
        <DialogContent className="sm:max-w-lg"><DialogHeader>
            <DialogTitle>{metadataFormMode === 'create' ? 'Создать новый журнал' : 'Редактировать детали журнала'}</DialogTitle>
            <DialogDescription>{metadataFormMode === 'create' ? 'Выберите группу, предмет, преподавателя, семестр и год.' : `Редактирование деталей журнала.`}</DialogDescription>
          </DialogHeader>{showMetadataDialog && <JournalMetadataForm mode={metadataFormMode} journalId={selectedJournalForMetadata?.id} onFormSubmitSuccess={handleMetadataFormSuccess} onCancel={() => setShowMetadataDialog(false)} />}</DialogContent></Dialog>

      <Dialog open={showManageEntriesDialog} onOpenChange={(open) => { if (!open) setCurrentManagingJournal(null); setShowManageEntriesDialog(open); }}>
        <DialogContent className="max-w-4xl lg:max-w-5xl xl:max-w-7xl h-[90vh] flex flex-col"><DialogHeader>
            <DialogTitle>Управление записями журнала</DialogTitle>
            {currentManagingJournal && (<DialogDescription>
                Группа: {getGroupName(currentManagingJournal.groupId)} | Предмет: {getSubjectName(currentManagingJournal.subjectId)} | Преподаватель: {getTeacherName(currentManagingJournal.teacherId)} <br/>
                Семестр: {currentManagingJournal.semester} | Год: {currentManagingJournal.year}
              </DialogDescription>)}
          </DialogHeader>
          {currentManagingJournal && (
            <ManageJournalEntriesView
              journal={currentManagingJournal}
              group={groups.find(g => g.id === currentManagingJournal.groupId) || null}
              onEntriesUpdated={handleEntriesUpdated}
              className="h-full"
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!journalToDelete} onOpenChange={(open) => !open && setJournalToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить журнал?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Это навсегда удалит журнал и все его записи.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteJournal} disabled={isSubmitting}>
              {isSubmitting ? 'Удаление...' : 'Удалить'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Журналы</h1>
        <Button onClick={handleOpenCreateJournalDialog}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Создать журнал
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Группа</TableHead>
              <TableHead>Предмет</TableHead>
              <TableHead>Преподаватель</TableHead>
              <TableHead>Семестр</TableHead>
              <TableHead>Год</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {journals.map((journal) => (
              <TableRow key={journal.id}>
                <TableCell>{getGroupName(journal.groupId)}</TableCell>
                <TableCell>{getSubjectName(journal.subjectId)}</TableCell>
                <TableCell>{getTeacherName(journal.teacherId)}</TableCell>
                <TableCell>{journal.semester}</TableCell>
                <TableCell>{journal.year}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Открыть меню</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Действия</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleOpenManageEntriesDialog(journal)}>
                        <BookOpen className="mr-2 h-4 w-4" />
                        Управление записями
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenEditMetadataDialog(journal)}>
                        <Edit2 className="mr-2 h-4 w-4" />
                        Редактировать
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => handleDeleteJournalInitiate(journal)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Удалить
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ManageJournalsPage;
