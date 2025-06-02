import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
import { getAllGroups, deleteGroup } from '@/lib/firebaseService/groupService';
import { getUsers } from '@/lib/firebaseService/userService';
import { GroupFormDialog } from '@/components/admin/groups/GroupFormDialog';
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
import { Checkbox as CheckboxComponent } from '@/components/ui/checkbox';

const ManageGroupsPage: React.FC = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupForEdit, setSelectedGroupForEdit] = useState<Group | undefined>();
  const [showGroupFormDialog, setShowGroupFormDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedGroups = await getAllGroups();
      setGroups(fetchedGroups);

      // Fetch student counts for each group
      const counts: Record<string, number> = {};
      for (const group of fetchedGroups) {
        const { users } = await getUsers({ 
          role: 'student',
          groupId: group.id 
        });
        counts[group.id] = users.length;
      }
      setStudentCounts(counts);
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
    setSelectedGroupForEdit(undefined);
    setShowGroupFormDialog(true);
  };

  const handleOpenEditGroupDialog = (group: Group) => {
    setSelectedGroupForEdit(group);
    setShowGroupFormDialog(true);
  };

  const handleGroupFormSuccess = () => {
    setShowGroupFormDialog(false);
    setSelectedGroupForEdit(undefined);
    fetchData(); 
  };

  const handleDeleteInitiate = (group: Group) => {
    setGroupToDelete(group);
  };

  const handleDeleteSelectedGroups = async () => {
    if (!selectedGroups.length) return;
    
    if (!confirm(`Вы уверены, что хотите удалить ${selectedGroups.length} групп?`)) return;
    
    try {
      setIsLoading(true);
      await Promise.all(selectedGroups.map(groupId => deleteGroup(groupId)));
      toast.success(`Успешно удалено ${selectedGroups.length} групп`);
      setSelectedGroups([]);
      fetchData();
    } catch (error) {
      console.error('Error deleting groups:', error);
      toast.error('Не удалось удалить группы');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectGroup = (groupId: string) => {
    setSelectedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleSelectAllGroups = () => {
    setSelectedGroups(prev => 
      prev.length === groups.length 
        ? [] 
        : groups.map(group => group.id)
    );
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <Toaster richColors position="top-right" />
      
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Управление группами</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Организуйте студентов по группам, управляйте специализациями и годами поступления.
            </p>
          </div>
          <div className="flex gap-2">
            {selectedGroups.length > 0 && (
              <Button 
                variant="destructive" 
                onClick={handleDeleteSelectedGroups}
                disabled={isLoading}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Удалить выбранные ({selectedGroups.length})
              </Button>
            )}
          <Button onClick={handleOpenCreateGroupDialog}>
            <PlusCircle className="mr-2 h-4 w-4" /> Добавить новую группу
          </Button>
          </div>
        </div>
      </header>

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
                <TableHead className="w-[50px]">
                  <CheckboxComponent
                    checked={selectedGroups.length === groups.length}
                    onCheckedChange={handleSelectAllGroups}
                    aria-label="Select all groups"
                  />
                </TableHead>
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
                  <TableCell>
                    <CheckboxComponent
                      checked={selectedGroups.includes(group.id)}
                      onCheckedChange={() => handleSelectGroup(group.id)}
                      aria-label={`Select ${group.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{group.name}</TableCell>
                  <TableCell>{group.specialization}</TableCell>
                  <TableCell className="text-center">{group.year}</TableCell>
                  <TableCell className="text-center">
                    {studentCounts[group.id] || 0} студентов
                  </TableCell>
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
                          <Eye className="mr-2 h-4 w-4" />
                          Просмотр
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenEditGroupDialog(group)}>
                          <Edit2 className="mr-2 h-4 w-4" />
                          Редактировать
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => handleDeleteInitiate(group)} 
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
        </div>

      {groupToDelete && (
        <AlertDialog open={!!groupToDelete} onOpenChange={() => setGroupToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
              <AlertDialogDescription>
                Это действие навсегда удалит группу <span className="font-semibold">"{groupToDelete.name}"</span>.
                Студенты в этой группе будут откреплены. Это действие нельзя отменить.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => {
                  deleteGroup(groupToDelete.id);
                  setGroupToDelete(null);
                  fetchData();
                }} 
                className="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 dark:text-slate-50"
              >
                Удалить группу
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <GroupFormDialog
        open={showGroupFormDialog}
        onOpenChange={setShowGroupFormDialog}
        group={selectedGroupForEdit}
        onSuccess={handleGroupFormSuccess}
      />
    </div>
  );
};

export default ManageGroupsPage;
