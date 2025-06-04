// src/pages/admin/ManageUsersPage.tsx
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Plus, 
  Search, 
  Loader2, 
  UserPlus, 
  UserCheck, 
  MoreHorizontal,
  Bell,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Mail,
  Phone,
  Calendar
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import CreateUserForm from '@/components/admin/users/CreateUserForm';
import EditUserDialog from '@/components/admin/users/EditUserDialog';
import ApproveUserDialog from '@/components/admin/users/ApproveUserDialog';
import { toast } from 'sonner';
import { getUsers, deleteUser } from '@/lib/firebaseService/userService';
import type { AppUser, UserRole, UserStatus } from '@/types/index';
import { Toaster } from '@/components/ui/sonner';
import type { DocumentSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function ManageUsersPage() {
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AppUser[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<UserStatus | 'all'>('all');
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | undefined>(undefined);

  // Пользователи, ожидающие подтверждения
  const pendingUsers = allUsers.filter(user => user.status === 'pending_approval');

  const loadUsers = useCallback(async (reset = false) => {
    let loadedUsers: AppUser[] = [];
    try {
      setIsLoading(true);
      if (reset) {
        setHasMore(true);
        setLastDoc(undefined);
      }

      if (!hasMore && !reset) {
        setIsLoading(false);
        return;
      }

      const result = await getUsers({
        role: selectedRole === 'all' ? undefined : selectedRole,
        status: selectedStatus === 'all' ? undefined : selectedStatus,
        limit: 20,
        startAfterDoc: reset ? undefined : lastDoc,
      });
      loadedUsers = result.users;
      setAllUsers(prev => reset ? loadedUsers : [...prev, ...loadedUsers]);
      setLastDoc(result.lastDoc || undefined);
      setHasMore(loadedUsers.length === 20);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Не удалось загрузить список пользователей');
    } finally {
      setIsLoading(false);
    }
  }, [selectedRole, selectedStatus, lastDoc, hasMore]);

  useEffect(() => {
    loadUsers(true);
  }, [loadUsers]);

  // Фильтрация пользователей при изменении поискового запроса или фильтров
  useEffect(() => {
    const filtered = allUsers.filter(user => {
      const matchesSearch = searchQuery.trim() === '' || 
        `${user.lastName} ${user.firstName} ${user.middleName || ''} ${user.email}`.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesRole = selectedRole === 'all' || user.role === selectedRole;
      const matchesStatus = selectedStatus === 'all' || user.status === selectedStatus;
      
      return matchesSearch && matchesRole && matchesStatus;
    });

    setFilteredUsers(filtered);
  }, [allUsers, searchQuery, selectedRole, selectedStatus]);

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false);
    loadUsers(true);
    toast.success('Пользователь успешно создан');
  };

  const handleEdit = (user: AppUser) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    setSelectedUser(null);
    loadUsers(true);
    toast.success('Пользователь успешно обновлен');
  };

  const handleApprove = (user: AppUser) => {
    setSelectedUser(user);
    setIsApproveDialogOpen(true);
  };

  const handleApproveSuccess = () => {
    setIsApproveDialogOpen(false);
    setSelectedUser(null);
    loadUsers(true);
    toast.success('Пользователь успешно одобрен');
  };

  const handleDelete = async (user: AppUser) => {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) {
      return;
    }

    try {
      await deleteUser(user.uid);
      loadUsers(true);
      toast.success('Пользователь успешно удален');
    } catch {
      toast.error('Не удалось удалить пользователя');
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'teacher': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'student': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: UserStatus) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'suspended': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending_approval': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return null;
    }
  };

  const getRoleName = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'Администратор';
      case 'teacher': return 'Преподаватель';
      case 'student': return 'Студент';
      case 'pending_approval': return 'Ожидает подтверждения';
      default: return role;
    }
  };

  const getStatusName = (status: UserStatus) => {
    switch (status) {
      case 'active': return 'Активен';
      case 'suspended': return 'Заблокирован';
      case 'pending_approval': return 'Ожидает подтверждения';
      default: return status;
    }
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
          <h1 className="text-3xl font-bold tracking-tight">Управление пользователями</h1>
          <p className="text-muted-foreground">
            Управляйте учетными записями студентов, преподавателей и администраторов
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Экспорт
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Создать пользователя
          </Button>
        </div>
      </div>

      {/* Pending Users Alert */}
      <AnimatePresence>
        {pendingUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/50">
              <Bell className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800 dark:text-amber-200">
                Пользователи ожидают подтверждения
              </AlertTitle>
              <AlertDescription className="text-amber-700 dark:text-amber-300">
                {pendingUsers.length} пользователь(ей) ожидают одобрения их учетных записей.
                <div className="mt-2 flex flex-wrap gap-2">
                  {pendingUsers.slice(0, 3).map(user => (
                    <Button
                      key={user.uid}
                      variant="outline"
                      size="sm"
                      onClick={() => handleApprove(user)}
                      className="h-8 text-xs"
                    >
                      <UserCheck className="h-3 w-3 mr-1" />
                      {user.firstName} {user.lastName}
                    </Button>
                  ))}
                  {pendingUsers.length > 3 && (
                    <span className="text-xs text-amber-600 self-center">
                      и еще {pendingUsers.length - 3}...
                    </span>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { title: 'Всего пользователей', value: allUsers.length, icon: UserPlus, color: 'text-blue-600' },
          { title: 'Активных', value: allUsers.filter(u => u.status === 'active').length, icon: CheckCircle, color: 'text-green-600' },
          { title: 'Ожидают подтверждения', value: pendingUsers.length, icon: Clock, color: 'text-yellow-600' },
          { title: 'Заблокированных', value: allUsers.filter(u => u.status === 'suspended').length, icon: XCircle, color: 'text-red-600' },
        ].map((stat, index) => (
          <motion.div
            key={stat.title}
            variants={cardVariants}
            initial="initial"
            animate="animate"
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Фильтры и поиск</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по имени, email или ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as UserRole | 'all')}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Роль" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все роли</SelectItem>
                  <SelectItem value="admin">Администратор</SelectItem>
                  <SelectItem value="teacher">Преподаватель</SelectItem>
                  <SelectItem value="student">Студент</SelectItem>
                  <SelectItem value="pending_approval">На одобрении</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as UserStatus | 'all')}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="active">Активен</SelectItem>
                  <SelectItem value="suspended">Заблокирован</SelectItem>
                  <SelectItem value="pending_approval">Ожидает одобрения</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Список пользователей</CardTitle>
          <CardDescription>
            Найдено {filteredUsers.length} пользователей
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && allUsers.length === 0 ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Пользователь</TableHead>
                    <TableHead>Роль</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Контакты</TableHead>
                    <TableHead>Дата создания</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filteredUsers.map((user, index) => (
                      <motion.tr
                        key={user.uid}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-muted/50"
                      >
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar>
                              <AvatarImage src={user.photoURL || undefined} />
                              <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white">
                                {user.lastName?.charAt(0)}{user.firstName?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                {user.lastName} {user.firstName} {user.middleName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getRoleColor(user.role)}>
                            {getRoleName(user.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(user.status)}
                            <span className="text-sm">{getStatusName(user.status)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {user.email && (
                              <div className="flex items-center text-sm text-muted-foreground">
                                <Mail className="h-3 w-3 mr-1" />
                                {user.email}
                              </div>
                            )}
                            {user.phone && (
                              <div className="flex items-center text-sm text-muted-foreground">
                                <Phone className="h-3 w-3 mr-1" />
                                {user.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3 mr-1" />
                            {user.createdAt && format(user.createdAt.toDate(), 'dd MMM yyyy', { locale: ru })}
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
                              <DropdownMenuItem onClick={() => handleEdit(user)}>
                                Редактировать
                              </DropdownMenuItem>
                              {user.status === 'pending_approval' && (
                                <DropdownMenuItem onClick={() => handleApprove(user)}>
                                  Одобрить
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDelete(user)}
                                className="text-red-600"
                              >
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

      {/* Dialogs */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создание пользователя</DialogTitle>
          </DialogHeader>
          <CreateUserForm
            onSuccess={handleCreateSuccess}
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {selectedUser && (
        <>
          <EditUserDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            user={selectedUser}
            onUserUpdated={handleEditSuccess}
          />

          <ApproveUserDialog
            open={isApproveDialogOpen}
            onOpenChange={setIsApproveDialogOpen}
            user={selectedUser}
            onApproved={handleApproveSuccess}
          />
        </>
      )}
    </motion.div>
  );
}