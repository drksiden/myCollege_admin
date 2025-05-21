// src/pages/admin/UsersPage.tsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Chip,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { User } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { UserFormDialog } from '@/components/admin/users/UserForm';

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const { isAdmin } = useAuth();

  const fetchUsers = async () => {
    try {
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      const usersList = usersSnapshot.docs.map(doc => ({
        ...doc.data(),
        uid: doc.id,
      })) as User[];
      setUsers(usersList);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUserCreatedOrUpdated = () => {
    fetchUsers();
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await deleteDoc(doc(db, 'users', userToDelete.uid));
      await fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
    } finally {
      setUserToDelete(null);
    }
  };

  const getRoleColor = (role: User['role']) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'teacher':
        return 'primary';
      case 'student':
        return 'success';
      default:
        return 'default';
    }
  };

  if (!isAdmin) {
    return (
      <Box p={3}>
        <Typography variant="h5" color="error">
          Доступ запрещен. Требуются права администратора.
        </Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box p={3}>
        <Typography>Загрузка...</Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Управление пользователями</Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => {
            setEditingUser(null);
            setIsUserFormOpen(true);
          }}
        >
          Добавить пользователя
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Имя</TableCell>
              <TableCell>Фамилия</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Роль</TableCell>
              <TableCell>Дата создания</TableCell>
              <TableCell>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.uid}>
                <TableCell>{user.firstName}</TableCell>
                <TableCell>{user.lastName}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Chip
                    label={user.role}
                    color={getRoleColor(user.role)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {user.createdAt.toDate().toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => {
                      setEditingUser(user);
                      setIsUserFormOpen(true);
                    }}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => setUserToDelete(user)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <UserFormDialog
        open={isUserFormOpen}
        onOpenChange={(open) => {
          setIsUserFormOpen(open);
          setEditingUser(null);
        }}
        onUserSubmitSuccess={handleUserCreatedOrUpdated}
        initialData={editingUser || undefined}
      />

      <Dialog
        open={!!userToDelete}
        onClose={() => setUserToDelete(null)}
      >
        <DialogTitle>Удалить пользователя?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Вы уверены, что хотите удалить пользователя {userToDelete?.firstName} {userToDelete?.lastName}?
            Это действие нельзя отменить.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserToDelete(null)}>Отмена</Button>
          <Button onClick={handleDeleteUser} color="error" variant="contained">
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersPage;