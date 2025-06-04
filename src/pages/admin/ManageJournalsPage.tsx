// src/pages/admin/ManageJournalsPage.tsx
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { 
  MoreHorizontal, 
  PlusCircle, 
  Edit2, 
  Trash2, 
  Loader2, 
  BookOpen,
  Users,
  Calendar,
  User,
  GraduationCap,
  Settings,
  Search,
  Filter,
  X,
  SortAsc,
  SortDesc,
  Download,
  RefreshCw
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { getAllGroups } from '@/lib/firebaseService/groupService';
import { getAllSubjects } from '@/lib/firebaseService/subjectService';
import { getUsers } from '@/lib/firebaseService/userService';
import { getSemesters } from '@/lib/firebaseService/semesterService';
import { getAllJournals, deleteJournal as deleteJournalService, getJournal } from '@/lib/firebaseService/journalService';
import { JournalMetadataForm } from '@/components/admin/journals/JournalMetadataForm';
import ManageJournalEntriesView from '@/components/admin/journals/ManageJournalEntriesView';
import type { Journal, Group, Subject, TeacherUser, Semester } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

type SortField = 'createdAt' | 'groupName' | 'subjectName' | 'teacherName';
type SortDirection = 'asc' | 'desc';

interface FilterState {
  search: string;
  groupId: string;
  subjectId: string;
  teacherId: string;
  semesterId: string;
}

const ManageJournalsPage: React.FC = () => {
  const [journals, setJournals] = useState<Journal[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<TeacherUser[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showMetadataDialog, setShowMetadataDialog] = useState(false);
  const [metadataFormMode, setMetadataFormMode] = useState<'create' | 'edit'>('create');
  const [selectedJournalForMetadata, setSelectedJournalForMetadata] = useState<Journal | null>(null);

  const [showManageEntriesDialog, setShowManageEntriesDialog] = useState(false);
  const [currentManagingJournal, setCurrentManagingJournal] = useState<Journal | null>(null);
  
  const [journalToDelete, setJournalToDelete] = useState<Journal | null>(null);

  // Состояние фильтров
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    groupId: '',
    subjectId: '',
    teacherId: '',
    semesterId: ''
  });

  // Состояние сортировки
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const fetchData = async () => {
    setIsLoading(true);
    toast.loading('Загрузка данных...', { id: 'fetch-data' });
    
    try {
      const [allGroups, allSubjects, { users: teachers }, allSemesters, allJournals] = await Promise.all([
        getAllGroups(),
        getAllSubjects(),
        getUsers({ role: 'teacher' }),
        getSemesters(),
        getAllJournals(),
      ]);
      setGroups(allGroups);
      setSubjects(allSubjects);
      setTeachers(teachers as TeacherUser[]);
      setSemesters(allSemesters);
      setJournals(allJournals);
      
      toast.success('Данные загружены', { id: 'fetch-data' });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Не удалось загрузить данные', { id: 'fetch-data' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Функции получения названий
  const getGroupName = (groupId: string) => groups.find(g => g.id === groupId)?.name || 'Неизвестная группа';
  const getSubjectName = (subjectId: string) => subjects.find(s => s.id === subjectId)?.name || 'Неизвестный предмет';
  const getTeacherName = (teacherId: string) => {
    const teacher = teachers.find(t => t.uid === teacherId);
    return teacher ? `${teacher.lastName} ${teacher.firstName}` : 'Неизвестный преподаватель';
  };
  const getSemesterName = (semesterId: string) => semesters.find(s => s.id === semesterId)?.name || 'Неизвестный семестр';

  // Фильтрованные и отсортированные журналы
  const filteredAndSortedJournals = useMemo(() => {
    const filtered = journals.filter(journal => {
      // Поиск по тексту
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const groupName = getGroupName(journal.groupId).toLowerCase();
        const subjectName = getSubjectName(journal.subjectId).toLowerCase();
        const teacherName = getTeacherName(journal.teacherId).toLowerCase();
        
        if (!groupName.includes(searchLower) && 
            !subjectName.includes(searchLower) && 
            !teacherName.includes(searchLower)) {
          return false;
        }
      }

      // Фильтр по группе
      if (filters.groupId && journal.groupId !== filters.groupId) {
        return false;
      }

      // Фильтр по предмету
      if (filters.subjectId && journal.subjectId !== filters.subjectId) {
        return false;
      }

      // Фильтр по преподавателю
      if (filters.teacherId && journal.teacherId !== filters.teacherId) {
        return false;
      }

      // Фильтр по семестру
      if (filters.semesterId && journal.semesterId !== filters.semesterId) {
        return false;
      }

      return true;
    });

    // Сортировка
    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'groupName':
          aValue = getGroupName(a.groupId);
          bValue = getGroupName(b.groupId);
          break;
        case 'subjectName':
          aValue = getSubjectName(a.subjectId);
          bValue = getSubjectName(b.subjectId);
          break;
        case 'teacherName':
          aValue = getTeacherName(a.teacherId);
          bValue = getTeacherName(b.teacherId);
          break;
        case 'createdAt':
        default:
          aValue = a.createdAt.toMillis();
          bValue = b.createdAt.toMillis();
          break;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortDirection === 'asc' 
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      }
    });

    return filtered;
  }, [journals, filters, sortField, sortDirection, groups, subjects, teachers]);

  // Обработчики фильтров
  const updateFilter = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      groupId: '',
      subjectId: '',
      teacherId: '',
      semesterId: ''
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  // Обработчики сортировки
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />;
  };

  // Остальные обработчики (без изменений)
  const handleOpenCreateJournalDialog = () => {
    setMetadataFormMode('create');
    setSelectedJournalForMetadata(null);
    setShowMetadataDialog(true);
  };

  const handleOpenEditJournalDialog = async (journalId: string) => {
    const loadToastId = toast.loading('Загрузка данных журнала...', { duration: Infinity });
    
    try {
      const journal = await getJournal(journalId);
      if (journal) {
        setMetadataFormMode('edit');
        setSelectedJournalForMetadata(journal);
        setShowMetadataDialog(true);
        toast.success('Данные журнала загружены', { id: loadToastId });
      }
    } catch (error) {
      console.error('Error fetching journal:', error);
      toast.error('Не удалось загрузить данные журнала', { id: loadToastId });
    }
  };

  const handleOpenManageEntriesDialog = async (journalId: string) => {
    const loadToastId = toast.loading('Загрузка журнала...', { duration: Infinity });
    
    try {
      const journal = await getJournal(journalId);
      if (journal) {
        setCurrentManagingJournal(journal);
        setShowManageEntriesDialog(true);
        toast.success('Журнал загружен', { id: loadToastId });
      }
    } catch (error) {
      console.error('Error fetching journal:', error);
      toast.error('Не удалось загрузить журнал', { id: loadToastId });
    }
  };

  const handleDeleteJournal = async (journalId: string) => {
    const deleteToastId = toast.loading('Удаление журнала...', { duration: Infinity });
    
    try {
      await deleteJournalService(journalId);
      setJournals(journals.filter(j => j.id !== journalId));
      toast.success('Журнал успешно удален', { id: deleteToastId });
    } catch (error) {
      console.error('Error deleting journal:', error);
      toast.error('Не удалось удалить журнал', { id: deleteToastId });
    }
  };

  const handleMetadataFormSuccess = () => {
    setShowMetadataDialog(false);
    toast.success(metadataFormMode === 'create' ? 'Журнал успешно создан' : 'Журнал успешно обновлен');
    fetchData();
  };

  const handleEntriesUpdated = async () => {
    toast.success('Записи журнала обновлены');
    await fetchData();
  };

  // Статистика с учетом фильтров
  const stats = {
    totalJournals: journals.length,
    filteredJournals: filteredAndSortedJournals.length,
    uniqueGroups: new Set(filteredAndSortedJournals.map(j => j.groupId)).size,
    uniqueSubjects: new Set(filteredAndSortedJournals.map(j => j.subjectId)).size,
    uniqueTeachers: new Set(filteredAndSortedJournals.map(j => j.teacherId)).size,
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
      className="container mx-auto py-6 space-y-6"
    >
      <Toaster richColors position="top-right" />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Управление журналами</h1>
          <p className="text-muted-foreground">
            Создавайте и управляйте учебными журналами групп
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} disabled={isLoading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Экспорт
          </Button>
          <Button onClick={handleOpenCreateJournalDialog} className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Создать журнал
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { 
            title: 'Всего журналов', 
            value: stats.totalJournals, 
            icon: BookOpen, 
            color: 'text-blue-600',
            bgColor: 'bg-blue-100 dark:bg-blue-900',
            description: hasActiveFilters ? `Показано: ${stats.filteredJournals}` : 'Активных журналов'
          },
          { 
            title: 'Групп', 
            value: stats.uniqueGroups, 
            icon: Users, 
            color: 'text-green-600',
            bgColor: 'bg-green-100 dark:bg-green-900',
            description: hasActiveFilters ? 'В выборке' : 'С журналами'
          },
          { 
            title: 'Предметов', 
            value: stats.uniqueSubjects, 
            icon: GraduationCap, 
            color: 'text-purple-600',
            bgColor: 'bg-purple-100 dark:bg-purple-900',
            description: hasActiveFilters ? 'В выборке' : 'В журналах'
          },
          { 
            title: 'Преподавателей', 
            value: stats.uniqueTeachers, 
            icon: User, 
            color: 'text-orange-600',
            bgColor: 'bg-orange-100 dark:bg-orange-900',
            description: hasActiveFilters ? 'В выборке' : 'Ведут журналы'
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.title}
            variants={cardVariants}
            initial="initial"
            animate="animate"
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover:shadow-md transition-all duration-200 hover:-translate-y-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`h-8 w-8 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Фильтры */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Фильтры и поиск
            </CardTitle>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters} className="gap-2">
                <X className="h-4 w-4" />
                Очистить фильтры
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Поиск */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по названию группы, предмета или преподавателя..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Фильтры по категориям */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Семестр</label>
              <Select value={filters.semesterId} onValueChange={(value) => updateFilter('semesterId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Все семестры" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Все семестры</SelectItem>
                  {semesters.map(semester => (
                    <SelectItem key={semester.id} value={semester.id}>
                      {semester.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Группа</label>
              <Select value={filters.groupId} onValueChange={(value) => updateFilter('groupId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Все группы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Все группы</SelectItem>
                  {groups.map(group => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Предмет</label>
              <Select value={filters.subjectId} onValueChange={(value) => updateFilter('subjectId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Все предметы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Все предметы</SelectItem>
                  {subjects.map(subject => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Преподаватель</label>
              <Select value={filters.teacherId} onValueChange={(value) => updateFilter('teacherId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Все преподаватели" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Все преподаватели</SelectItem>
                  {teachers.map(teacher => (
                    <SelectItem key={teacher.uid} value={teacher.uid}>
                      {teacher.lastName} {teacher.firstName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Активные фильтры */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <span className="text-sm text-muted-foreground">Активные фильтры:</span>
              {filters.search && (
                <Badge variant="secondary" className="gap-1">
                  Поиск: {filters.search}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter('search', '')} />
                </Badge>
              )}
              {filters.semesterId && (
                <Badge variant="secondary" className="gap-1">
                  Семестр: {getSemesterName(filters.semesterId)}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter('semesterId', '')} />
                </Badge>
              )}
              {filters.groupId && (
                <Badge variant="secondary" className="gap-1">
                  Группа: {getGroupName(filters.groupId)}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter('groupId', '')} />
                </Badge>
              )}
              {filters.subjectId && (
                <Badge variant="secondary" className="gap-1">
                  Предмет: {getSubjectName(filters.subjectId)}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter('subjectId', '')} />
                </Badge>
              )}
              {filters.teacherId && (
                <Badge variant="secondary" className="gap-1">
                  Преподаватель: {getTeacherName(filters.teacherId)}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter('teacherId', '')} />
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Journals Table */}
      <Card>
        <CardHeader>
          <CardTitle>Список журналов</CardTitle>
          <CardDescription>
            {hasActiveFilters 
              ? `Найдено ${filteredAndSortedJournals.length} из ${journals.length} журналов`
              : `Всего ${journals.length} журналов`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredAndSortedJournals.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {hasActiveFilters ? 'Журналы не найдены' : 'Нет журналов'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {hasActiveFilters 
                  ? 'Попробуйте изменить параметры фильтрации'
                  : 'Создайте первый журнал для начала работы'
                }
              </p>
              {hasActiveFilters ? (
                <Button onClick={clearFilters} variant="outline" className="gap-2">
                  <X className="h-4 w-4" />
                  Очистить фильтры
                </Button>
              ) : (
                <Button onClick={handleOpenCreateJournalDialog} className="gap-2">
                  <PlusCircle className="h-4 w-4" />
                  Создать первый журнал
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Журнал</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('groupName')}
                    >
                      <div className="flex items-center gap-1">
                        Группа
                        {getSortIcon('groupName')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('subjectName')}
                    >
                      <div className="flex items-center gap-1">
                        Предмет
                        {getSortIcon('subjectName')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('teacherName')}
                    >
                      <div className="flex items-center gap-1">
                        Преподаватель
                        {getSortIcon('teacherName')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none"
                      onClick={() => handleSort('createdAt')}
                    >
                      <div className="flex items-center gap-1">
                        Создан
                        {getSortIcon('createdAt')}
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filteredAndSortedJournals.map((journal, index) => (
                      <motion.tr
                        key={journal.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-muted/50"
                      >
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white">
                              <BookOpen className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="font-medium">
                                {getSubjectName(journal.subjectId)} - {getGroupName(journal.groupId)}
                              </div>
                              <Badge variant="secondary" className="mt-1">
                                ID: {journal.id.slice(0, 8)}...
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            {getGroupName(journal.groupId)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <GraduationCap className="h-4 w-4 text-muted-foreground" />
                            {getSubjectName(journal.subjectId)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {getTeacherName(journal.teacherId)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {journal.createdAt && format(journal.createdAt.toDate(), 'dd MMM yyyy', { locale: ru })}
                          </div>
                        </TableCell>
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
                                <Settings className="mr-2 h-4 w-4" />
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
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metadata Dialog */}
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
            journalId={selectedJournalForMetadata?.id}
            onSuccess={handleMetadataFormSuccess}
            onCancel={() => setShowMetadataDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Manage Entries Dialog */}
      <Dialog open={showManageEntriesDialog} onOpenChange={setShowManageEntriesDialog}>
        <DialogContent className="w-[900px] max-w-[95vw] overflow-x-auto">
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!journalToDelete} onOpenChange={() => setJournalToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Подтверждение удаления</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить этот журнал? 
              Все записи в журнале также будут удалены. Это действие нельзя отменить.
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
              Удалить журнал
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default ManageJournalsPage;