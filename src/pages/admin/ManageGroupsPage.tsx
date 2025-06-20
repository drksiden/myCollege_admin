// src/pages/admin/ManageGroupsPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  MoreHorizontal, 
  PlusCircle, 
  Edit2, 
  Trash2, 
  Eye, 
  Users, 
  GraduationCap,
  BookOpen,
  User,
  Search,
  Download,
  Calendar,
  UserCheck,
  Loader2,
  Plus,
  RefreshCw,
  X as XIcon
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DeleteDialog } from '@/components/ui/delete-dialog';
import { GroupFormDialog } from '@/components/admin/groups/GroupFormDialog';
import { toast } from 'sonner';
import { getAllGroups, deleteGroup } from '@/lib/firebaseService/groupService';
import { getUsers } from '@/lib/firebaseService/userService';
import type { Group } from '@/types';
import { Toaster } from '@/components/ui/sonner';
import { Checkbox as CheckboxComponent } from '@/components/ui/checkbox';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const ManageGroupsPage: React.FC = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);
  const [selectedGroupForEdit, setSelectedGroupForEdit] = useState<Group | undefined>();
  const [showGroupFormDialog, setShowGroupFormDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedSpecialization, setSelectedSpecialization] = useState<string>('all');

  // Уникальные годы и специализации для фильтров
  const uniqueYears = [...new Set(groups.map(g => g.year?.toString()).filter(Boolean))].sort();
  const uniqueSpecializations = [...new Set(groups.map(g => g.specialization).filter(Boolean))].sort();

  const fetchData = useCallback(async (showToast = false) => {
    const isRefresh = showToast;
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    if (showToast) {
      toast.loading('Обновление списка групп...', { id: 'refresh-groups' });
    }

    try {
      const [fetchedGroups, { users }] = await Promise.all([
        getAllGroups(),
        getUsers({ role: 'student' })
      ]);
      
      setGroups(fetchedGroups);

      // Считаем количество студентов для каждой группы
      const counts: Record<string, number> = {};
      users.forEach(user => {
        if (user.role === 'student' && user.groupId) {
          counts[user.groupId] = (counts[user.groupId] || 0) + 1;
        }
      });
      
      setStudentCounts(counts);

      if (showToast) {
        toast.success(`Загружено ${fetchedGroups.length} групп`, { id: 'refresh-groups' });
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
      const errorMessage = 'Не удалось загрузить группы';
      if (showToast) {
        toast.error(errorMessage, { id: 'refresh-groups' });
      } else {
        toast.error(errorMessage);
      }
    } finally {
      if (isRefresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Фильтрация групп
  useEffect(() => {
    const filtered = groups.filter(group => {
      const matchesSearch = searchQuery.trim() === '' || 
        group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.specialization?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesYear = selectedYear === 'all' || group.year?.toString() === selectedYear;
      const matchesSpecialization = selectedSpecialization === 'all' || group.specialization === selectedSpecialization;
      
      return matchesSearch && matchesYear && matchesSpecialization;
    });

    setFilteredGroups(filtered);
  }, [groups, searchQuery, selectedYear, selectedSpecialization]);

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
    fetchData(true);
    toast.success(selectedGroupForEdit ? 'Группа успешно обновлена' : 'Группа успешно создана');
  };

  const handleDeleteGroup = async (group: Group) => {
    const deleteToastId = toast.loading('Удаление группы...', { duration: Infinity });
    
    try {
      await deleteGroup(group.id);
      await fetchData(true);
      toast.success(`Группа "${group.name}" успешно удалена`, { id: deleteToastId });
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Не удалось удалить группу', { id: deleteToastId });
      throw error;
    }
  };

  const handleDeleteSelectedGroups = async () => {
    if (!selectedGroups.length) return;
    
    const deleteToastId = toast.loading(`Удаление ${selectedGroups.length} групп...`, { duration: Infinity });
    
    try {
      await Promise.all(selectedGroups.map(groupId => deleteGroup(groupId)));
      setSelectedGroups([]);
      await fetchData(true);
      toast.success(`Успешно удалено ${selectedGroups.length} групп`, { id: deleteToastId });
    } catch (error) {
      console.error('Error deleting groups:', error);
      toast.error('Не удалось удалить группы', { id: deleteToastId });
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
      prev.length === filteredGroups.length 
        ? [] 
        : filteredGroups.map(group => group.id)
    );
  };

  const handleRefresh = () => {
    fetchData(true);
  };

  // Функция для сброса фильтров
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedYear('all');
    setSelectedSpecialization('all');
  };

  // Проверяем, активны ли фильтры
  const hasActiveFilters = searchQuery !== '' || selectedYear !== 'all' || selectedSpecialization !== 'all';

  const createDeleteDescription = (group: Group) => {
    const studentCount = studentCounts[group.id] || 0;
    let description = `Вы уверены, что хотите удалить группу "${group.name}"?`;
    
    if (studentCount > 0) {
      description += `\n\nВ группе ${studentCount} студент(ов). Все студенты будут откреплены от группы.`;
    }
    
    description += '\n\nЭто действие нельзя отменить.';
    
    return description;
  };

  const createBulkDeleteDescription = () => {
    const totalStudents = selectedGroups.reduce((sum, groupId) => sum + (studentCounts[groupId] || 0), 0);
    let description = `Вы уверены, что хотите удалить ${selectedGroups.length} групп?`;
    
    if (totalStudents > 0) {
      description += `\n\nВ выбранных группах ${totalStudents} студент(ов). Все студенты будут откреплены от групп.`;
    }
    
    description += '\n\nЭто действие нельзя отменить.';
    
    return description;
  };

  const getYearColor = (year?: number) => {
    if (!year) return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    const colors = [
      'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    ];
    return colors[(year - 1) % colors.length] || colors[0];
  };

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const cardVariants = {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6"
    >
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Управление группами</h1>
          <p className="text-muted-foreground">
            Организуйте студентов по группам, управляйте специализациями и курсами
          </p>
        </div>
        <div className="flex gap-2">
          {selectedGroups.length > 0 && (
            <DeleteDialog
              title="Массовое удаление групп"
              description={createBulkDeleteDescription()}
              onConfirm={handleDeleteSelectedGroups}
            >
              <Button variant="destructive" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Удалить ({selectedGroups.length})
              </Button>
            </DeleteDialog>
          )}
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Экспорт
          </Button>
          <Button onClick={handleOpenCreateGroupDialog} className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Создать группу
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { 
            title: 'Всего групп', 
            value: groups.length, 
            icon: Users, 
            color: 'text-blue-600',
            description: 'Активных учебных групп'
          },
          { 
            title: 'Студентов', 
            value: Object.values(studentCounts).reduce((a, b) => a + b, 0), 
            icon: UserCheck, 
            color: 'text-green-600',
            description: 'Обучающихся студентов'
          },
          { 
            title: 'Специализаций', 
            value: uniqueSpecializations.length, 
            icon: GraduationCap, 
            color: 'text-purple-600',
            description: 'Направлений подготовки'
          },
          { 
            title: 'Курсов', 
            value: uniqueYears.length, 
            icon: BookOpen, 
            color: 'text-orange-600',
            description: 'Года обучения'
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.title}
            variants={cardVariants}
            initial="initial"
            animate="animate"
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Фильтры и поиск</CardTitle>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={resetFilters} className="gap-2">
                <XIcon className="h-4 w-4" />
                Сбросить фильтры
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по названию группы или специализации..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Год" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все годы</SelectItem>
                  {uniqueYears.map(year => (
                    <SelectItem value={year?.toString() || ''} key={year}>{year} год</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedSpecialization} onValueChange={setSelectedSpecialization}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Специализация" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все специализации</SelectItem>
                  {uniqueSpecializations.map(spec => (
                    <SelectItem value={spec || ''} key={spec}>{spec}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Groups Table */}
      <Card>
        <CardHeader>
          <CardTitle>Список групп</CardTitle>
          <CardDescription>
            {hasActiveFilters 
              ? `Найдено ${filteredGroups.length} из ${groups.length} групп`
              : `Всего ${groups.length} групп`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">Группы не найдены</h3>
              <p className="text-muted-foreground mb-4">
                {groups.length === 0 
                  ? 'Начните с создания новой группы' 
                  : 'Попробуйте изменить параметры поиска'
                }
              </p>
              {groups.length === 0 ? (
                <Button onClick={handleOpenCreateGroupDialog} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Создать первую группу
                </Button>
              ) : (
                <Button onClick={resetFilters} variant="outline" className="gap-2">
                  <XIcon className="h-4 w-4" />
                  Сбросить фильтры
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <CheckboxComponent
                        checked={selectedGroups.length === filteredGroups.length}
                        onCheckedChange={handleSelectAllGroups}
                        aria-label="Выбрать все группы"
                      />
                    </TableHead>
                    <TableHead>Группа</TableHead>
                    <TableHead>Специализация</TableHead>
                    <TableHead>Год/Курс</TableHead>
                    <TableHead>Куратор</TableHead>
                    <TableHead>Студенты</TableHead>
                    <TableHead>Создана</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filteredGroups.map((group, index) => (
                      <motion.tr
                        key={group.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-muted/50"
                      >
                        <TableCell>
                          <CheckboxComponent
                            checked={selectedGroups.includes(group.id)}
                            onCheckedChange={() => handleSelectGroup(group.id)}
                            aria-label={`Выбрать ${group.name}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar>
                              <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white">
                                {group.name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{group.name}</div>
                              {group.description && (
                                <div className="text-sm text-muted-foreground">
                                  {group.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <GraduationCap className="h-4 w-4 text-muted-foreground" />
                            <span>{group.specialization || 'Не указана'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {group.year && (
                            <Badge className={getYearColor(group.year)}>
                              {group.year} год
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {group.curatorId ? (
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">Назначен</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Не назначен</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{studentCounts[group.id] || 0}</span>
                            <span className="text-sm text-muted-foreground">студентов</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {group.createdAt && format(group.createdAt.toDate(), 'dd MMM yyyy', { locale: ru })}
                          </div>
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
                              
                              {/* Диалог удаления */}
                              <DeleteDialog
                                title="Удаление группы"
                                description={createDeleteDescription(group)}
                                onConfirm={() => handleDeleteGroup(group)}
                              >
                                <div className="flex items-center px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950 cursor-pointer rounded w-full">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Удалить
                                </div>
                              </DeleteDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Group Form Dialog */}
      <GroupFormDialog
        open={showGroupFormDialog}
        onOpenChange={setShowGroupFormDialog}
        group={selectedGroupForEdit}
        onSuccess={handleGroupFormSuccess}
      />
    </motion.div>
  );
};

export default ManageGroupsPage;