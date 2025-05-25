import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { MoreHorizontal, PlusCircle, Edit2, Trash2, ListChecks, Eye } from 'lucide-react';
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
import { getAllGroups } from '@/lib/firebaseService/groupService';
import GroupForm from '@/components/admin/groups/GroupForm';
import type { Group } from '@/types';
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
import { writeBatch, doc, setDoc } from 'firebase/firestore';

const ManageGroupsPage: React.FC = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupForEdit, setSelectedGroupForEdit] = useState<Group | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [showGroupFormDialog, setShowGroupFormDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);
  const [lastDeletedGroup, setLastDeletedGroup] = useState<Group | null>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedGroups = await getAllGroups();
      setGroups(fetchedGroups);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Failed to load groups.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenCreateGroupDialog = () => {
    setSelectedGroupForEdit(null);
    setFormMode('create');
    setShowGroupFormDialog(true);
  };

  const handleOpenEditGroupDialog = (group: Group) => {
    setSelectedGroupForEdit(group);
    setFormMode('edit');
    setShowGroupFormDialog(true);
  };

  const handleGroupFormSuccess = () => {
    setShowGroupFormDialog(false);
    setSelectedGroupForEdit(null);
    fetchData(); 
  };

  const handleDeleteInitiate = (group: Group) => {
    setGroupToDelete(group);
  };

  const confirmDeleteGroup = async () => {
    if (!groupToDelete) return;
    setIsLoading(true);
    try {
      const groupBackup = { ...groupToDelete };
      // Удаляем группу и отвязываем студентов
      const batch = writeBatch(db);
      if (groupToDelete.students && groupToDelete.students.length > 0) {
        groupToDelete.students.forEach(studentProfileId => {
          const studentProfileRef = doc(db, 'students', studentProfileId);
          batch.update(studentProfileRef, { groupId: "" });
        });
      }
      const groupRef = doc(db, 'groups', groupToDelete.id);
      batch.delete(groupRef);
      await batch.commit();
      setLastDeletedGroup(groupBackup);
      toast.success(`Группа "${groupToDelete.name}" удалена`, {
        action: {
          label: 'Отменить',
          onClick: async () => {
            if (!lastDeletedGroup) return;
            // Восстанавливаем группу и студентов
            const groupDocRef = doc(db, 'groups', lastDeletedGroup.id);
            await setDoc(groupDocRef, { ...lastDeletedGroup });
            if (lastDeletedGroup.students && lastDeletedGroup.students.length > 0) {
              const batchRestore = writeBatch(db);
              lastDeletedGroup.students.forEach(studentProfileId => {
                const studentProfileRef = doc(db, 'students', studentProfileId);
                batchRestore.update(studentProfileRef, { groupId: lastDeletedGroup.id });
              });
              await batchRestore.commit();
            }
            toast.success('Группа и студенты восстановлены');
            await fetchData();
            setLastDeletedGroup(null);
            if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
          },
        },
        duration: 8000,
      });
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = setTimeout(() => setLastDeletedGroup(null), 8000);
      await fetchData();
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Failed to delete group. Students might still be linked.');
    } finally {
      setGroupToDelete(null);
      setIsLoading(false);
    }
  };

  if (isLoading && groups.length === 0) {
    return <p className="text-center p-10">Loading groups...</p>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <Toaster richColors position="top-right" />

      {/* Dialog for Create/Edit Group */}
      <Dialog open={showGroupFormDialog} onOpenChange={(open) => {
        if (!open) setSelectedGroupForEdit(null);
        setShowGroupFormDialog(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {formMode === 'create' ? 'Создать новую группу' : 'Редактировать группу'}
            </DialogTitle>
            <DialogDescription>
              {formMode === 'create'
                ? 'Заполните данные для добавления новой группы.'
                : `Редактирование группы: ${selectedGroupForEdit?.name || ''}`}
            </DialogDescription>
          </DialogHeader>
          {showGroupFormDialog && ( 
            <GroupForm
              mode={formMode}
              groupId={selectedGroupForEdit?.id}
              onFormSubmitSuccess={handleGroupFormSuccess}
              onCancel={() => setShowGroupFormDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Alert Dialog for Delete Confirmation */}
      {groupToDelete && (
        <AlertDialog open={!!groupToDelete} onOpenChange={() => setGroupToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will permanently delete the group <span className="font-semibold">"{groupToDelete.name}"</span>.
                Students in this group will be unassigned. This operation cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteGroup} className="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 dark:text-slate-50" disabled={isLoading}>
                {isLoading ? "Deleting..." : "Delete Group"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Управление группами</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Организуйте студентов по группам, управляйте специализациями и годами поступления.
            </p>
          </div>
          <Button onClick={handleOpenCreateGroupDialog}>
            <PlusCircle className="mr-2 h-4 w-4" /> Добавить новую группу
          </Button>
        </div>
      </header>

      <section>
        <div className="bg-card shadow sm:rounded-lg">
          {groups.length === 0 && !isLoading ? (
            <div className="p-10 text-center text-muted-foreground">
              <ListChecks className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium">Группы не найдены</h3>
              <p className="mt-1 text-sm">Начните с добавления новой группы.</p>
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30%]">Название</TableHead>
                <TableHead className="w-[25%]">Специализация</TableHead>
                <TableHead className="w-[10%] text-center">Год</TableHead>
                <TableHead className="w-[15%] text-center">Количество студентов</TableHead>
                <TableHead className="text-right w-[20%]">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map(group => (
                <TableRow key={group.id}>
                  <TableCell className="font-medium">{group.name}</TableCell>
                  <TableCell>{group.specialization}</TableCell>
                  <TableCell className="text-center">{group.year}</TableCell>
                  <TableCell className="text-center">{group.students?.length || 0}</TableCell>
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
                        <DropdownMenuItem onClick={() => navigate(`/admin/groups/${group.id}`)}>
                          <Eye className="mr-2 h-4 w-4" /> Подробнее
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenEditGroupDialog(group)}>
                          <Edit2 className="mr-2 h-4 w-4" /> Редактировать
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDeleteInitiate(group)} 
                          className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-800"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </div>
      </section>
    </div>
  );
};

export default ManageGroupsPage;
