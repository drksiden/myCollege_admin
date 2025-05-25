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
import { MoreHorizontal, PlusCircle, Edit2, Trash2, BookOpen, Users, ListChecks, Loader2 } from 'lucide-react';
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
        getAllGroups(db),
        getAllSubjects(db),
        getAllTeacherProfiles(db),
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
            <DialogTitle>{metadataFormMode === 'create' ? 'Create New Journal' : 'Edit Journal Details'}</DialogTitle>
            <DialogDescription>{metadataFormMode === 'create' ? 'Select group, subject, teacher, semester and year.' : `Editing details for journal.`}</DialogDescription>
          </DialogHeader>{showMetadataDialog && <JournalMetadataForm mode={metadataFormMode} journalId={selectedJournalForMetadata?.id} onFormSubmitSuccess={handleMetadataFormSuccess} onCancel={() => setShowMetadataDialog(false)} />}</DialogContent></Dialog>

      <Dialog open={showManageEntriesDialog} onOpenChange={(open) => { if (!open) setCurrentManagingJournal(null); setShowManageEntriesDialog(open); }}>
        <DialogContent className="max-w-4xl lg:max-w-5xl xl:max-w-7xl h-[90vh] flex flex-col"><DialogHeader>
            <DialogTitle>Manage Journal Entries</DialogTitle>
            {currentManagingJournal && (<DialogDescription>
                Group: {getGroupName(currentManagingJournal.groupId)} | Subject: {getSubjectName(currentManagingJournal.subjectId)} | Teacher: {getTeacherName(currentManagingJournal.teacherId)} <br/>
                Year: {currentManagingJournal.year}, Semester: {currentManagingJournal.semester}
            </DialogDescription>)}
          </DialogHeader>{currentManagingJournal && (<div className="flex-grow overflow-hidden">
              <ManageJournalEntriesView journal={currentManagingJournal} group={groups.find(g => g.id === currentManagingJournal.groupId) || null} onEntriesUpdated={handleEntriesUpdated} className="h-full"/>
              </div>)}
            <DialogFooter className="mt-auto pt-4 border-t"><DialogClose asChild><Button type="button" variant="outline">Close</Button></DialogClose></DialogFooter>
        </DialogContent></Dialog>
      
      {journalToDelete && (<AlertDialog open={!!journalToDelete} onOpenChange={() => setJournalToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>Delete journal for {getGroupName(journalToDelete.groupId)}, Subject: {getSubjectName(journalToDelete.subjectId)} ({journalToDelete.year}, Sem {journalToDelete.semester})? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteJournal} className="bg-red-600 hover:bg-red-700" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{isSubmitting ? "Deleting..." : "Delete"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>)}

      <header className="mb-8"><div className="flex items-center justify-between"><div>
            <h1 className="text-3xl font-bold tracking-tight">Academic Journals</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage attendance and grades for groups and subjects.</p>
          </div><Button onClick={handleOpenCreateJournalDialog} disabled={isLoading}><PlusCircle className="mr-2 h-4 w-4" /> Create Journal</Button></div></header>

      <section><div className="bg-card shadow sm:rounded-lg">{journals.length === 0 && !isLoading ? (<div className="p-10 text-center text-muted-foreground">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" /><h3 className="text-lg font-medium">No journals found</h3>
              <p className="mt-1 text-sm">Get started by creating a new journal.</p></div>) : (
          <Table><TableHeader><TableRow><TableHead>Group</TableHead><TableHead>Subject</TableHead><TableHead>Teacher</TableHead>
                <TableHead className="text-center">Year</TableHead><TableHead className="text-center">Semester</TableHead>
                <TableHead className="text-center">Entries (Days)</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>{journals.map(journal => {
                // Calculate unique days with entries
                const uniqueEntryDays = new Set(journal.entries.map(e => startOfDay(e.date.toDate()).toISOString())).size;
                return (
                <TableRow key={journal.id}><TableCell className="font-medium">{getGroupName(journal.groupId)}</TableCell>
                  <TableCell>{getSubjectName(journal.subjectId)}</TableCell><TableCell>{getTeacherName(journal.teacherId)}</TableCell>
                  <TableCell className="text-center">{journal.year}</TableCell><TableCell className="text-center">{journal.semester}</TableCell>
                  <TableCell className="text-center">{uniqueEntryDays}</TableCell><TableCell className="text-right">
                     <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Menu</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end"><DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleOpenManageEntriesDialog(journal)}><Users className="mr-2 h-4 w-4" /> View/Manage Entries</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenEditMetadataDialog(journal)}><Edit2 className="mr-2 h-4 w-4" /> Edit Details</DropdownMenuItem><DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDeleteJournalInitiate(journal)} className="text-red-600 focus:text-red-600"><Trash2 className="mr-2 h-4 w-4" /> Delete Journal</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell></TableRow>
                );
            })}
            </TableBody></Table>)}</div></section>
    </div>
  );
};
export default ManageJournalsPage;
