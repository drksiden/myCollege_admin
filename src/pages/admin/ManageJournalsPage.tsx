import { useState, useEffect } from 'react';
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
import { MoreHorizontal, PlusCircle, Edit2, Trash2, Loader2, BookOpen } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { getAllGroups } from '@/lib/firebaseService/groupService';
import { getAllSubjects } from '@/lib/firebaseService/subjectService';
import { getUsers } from '@/lib/firebaseService/userService';
import { getAllJournals, deleteJournal as deleteJournalService, getJournal } from '@/lib/firebaseService/journalService';
import JournalMetadataForm from '@/components/admin/journals/JournalMetadataForm';
import ManageJournalEntriesView from '@/components/admin/journals/ManageJournalEntriesView';
import type { Journal, Group, Subject, TeacherUser } from '@/types';
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
  const [teachers, setTeachers] = useState<TeacherUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showMetadataDialog, setShowMetadataDialog] = useState(false);
  const [metadataFormMode, setMetadataFormMode] = useState<'create' | 'edit'>('create');
  const [selectedJournalForMetadata, setSelectedJournalForMetadata] = useState<Journal | null>(null);

  const [showManageEntriesDialog, setShowManageEntriesDialog] = useState(false);
  const [currentManagingJournal, setCurrentManagingJournal] = useState<Journal | null>(null);
  
  const [journalToDelete, setJournalToDelete] = useState<Journal | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [allGroups, allSubjects, { users: teachers }, allJournals] = await Promise.all([
        getAllGroups(),
        getAllSubjects(),
        getUsers({ role: 'teacher' }),
        getAllJournals(),
      ]);
      setGroups(allGroups);
      setSubjects(allSubjects);
      setTeachers(teachers as TeacherUser[]);
      setJournals(allJournals);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getGroupName = (groupId: string) => groups.find(g => g.id === groupId)?.name || 'N/A';
  const getSubjectName = (subjectId: string) => subjects.find(s => s.id === subjectId)?.name || 'N/A';
  const getTeacherName = (teacherId: string) => {
    const teacher = teachers.find(t => t.uid === teacherId);
    return teacher ? `${teacher.lastName} ${teacher.firstName}` : 'N/A';
  };

  const handleOpenCreateJournalDialog = () => {
    setMetadataFormMode('create');
    setSelectedJournalForMetadata(null);
    setShowMetadataDialog(true);
  };

  const handleOpenEditJournalDialog = async (journalId: string) => {
    try {
      const journal = await getJournal(journalId);
      if (journal) {
        setMetadataFormMode('edit');
        setSelectedJournalForMetadata(journal);
        setShowMetadataDialog(true);
      }
    } catch (error) {
      console.error('Error fetching journal:', error);
      toast.error('Failed to load journal data');
    }
  };

  const handleOpenManageEntriesDialog = async (journalId: string) => {
    try {
      const journal = await getJournal(journalId);
      if (journal) {
        setCurrentManagingJournal(journal);
        setShowManageEntriesDialog(true);
      }
    } catch (error) {
      console.error('Error fetching journal:', error);
      toast.error('Failed to load journal data');
    }
  };

  const handleDeleteJournal = async (journalId: string) => {
    try {
      await deleteJournalService(journalId);
      setJournals(journals.filter(j => j.id !== journalId));
      toast.success('Journal deleted successfully');
    } catch (error) {
      console.error('Error deleting journal:', error);
      toast.error('Failed to delete journal');
    }
  };

  const handleMetadataFormSuccess = (journalId: string) => {
    setShowMetadataDialog(false);
    fetchData();
  };

  const handleEntriesUpdated = async () => {
    await fetchData();
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Управление журналами</h1>
        <Button onClick={handleOpenCreateJournalDialog}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Создать журнал
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Группа</TableHead>
              <TableHead>Предмет</TableHead>
              <TableHead>Преподаватель</TableHead>
              <TableHead>Дата</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {journals.map((journal) => (
              <TableRow key={journal.id}>
                <TableCell>{getGroupName(journal.groupId)}</TableCell>
                <TableCell>{getSubjectName(journal.subjectId)}</TableCell>
                <TableCell>{getTeacherName(journal.teacherId)}</TableCell>
                <TableCell>{journal.date.toDate().toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Действия</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleOpenManageEntriesDialog(journal.id)}>
                        <BookOpen className="mr-2 h-4 w-4" />
                        Управление записями
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenEditJournalDialog(journal.id)}>
                        <Edit2 className="mr-2 h-4 w-4" />
                        Редактировать
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => setJournalToDelete(journal)}
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
      )}

      <Dialog open={showMetadataDialog} onOpenChange={setShowMetadataDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {metadataFormMode === 'create' ? 'Создание журнала' : 'Редактирование журнала'}
            </DialogTitle>
            <DialogDescription>
              {metadataFormMode === 'create'
                ? 'Заполните информацию о новом журнале'
                : 'Измените информацию о журнале'}
            </DialogDescription>
          </DialogHeader>
          <JournalMetadataForm
            mode={metadataFormMode}
            journalId={selectedJournalForMetadata?.id}
            onFormSubmitSuccess={handleMetadataFormSuccess}
            onCancel={() => setShowMetadataDialog(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showManageEntriesDialog} onOpenChange={setShowManageEntriesDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Управление записями журнала</DialogTitle>
            <DialogDescription>
              Добавляйте и редактируйте записи в журнале
            </DialogDescription>
          </DialogHeader>
          {currentManagingJournal && (
            <ManageJournalEntriesView
              journal={currentManagingJournal}
              group={groups.find(g => g.id === currentManagingJournal.groupId) || null}
              onEntriesUpdated={handleEntriesUpdated}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!journalToDelete} onOpenChange={() => setJournalToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Подтверждение удаления</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить этот журнал? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (journalToDelete) {
                  handleDeleteJournal(journalToDelete.id);
                  setJournalToDelete(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster />
    </div>
  );
};

export default ManageJournalsPage;
