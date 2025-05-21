import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
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
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Group } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import GroupFormDialog from '../../components/admin/GroupFormDialog';

const GroupsPage: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGroupFormOpen, setIsGroupFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);
  const { isAdmin } = useAuth();

  const fetchGroups = async () => {
    try {
      const groupsCollection = collection(db, 'groups');
      const groupsSnapshot = await getDocs(groupsCollection);
      const groupsList = groupsSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      })) as Group[];
      setGroups(groupsList);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleGroupCreatedOrUpdated = () => {
    fetchGroups();
  };

  const handleDeleteGroup = async () => {
    if (!groupToDelete) return;

    try {
      await deleteDoc(doc(db, 'groups', groupToDelete.id));
      await fetchGroups();
    } catch (error) {
      console.error('Error deleting group:', error);
    } finally {
      setGroupToDelete(null);
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
        <Typography variant="h4">Управление группами</Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => {
            setEditingGroup(null);
            setIsGroupFormOpen(true);
          }}
        >
          Добавить группу
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Название</TableCell>
              <TableCell>Год</TableCell>
              <TableCell>Специализация</TableCell>
              <TableCell>Количество студентов</TableCell>
              <TableCell>Дата создания</TableCell>
              <TableCell>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groups.map((group) => (
              <TableRow key={group.id}>
                <TableCell>{group.name}</TableCell>
                <TableCell>{group.year}</TableCell>
                <TableCell>{group.specialization}</TableCell>
                <TableCell>{group.students.length}</TableCell>
                <TableCell>
                  {group.createdAt.toDate().toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => {
                      setEditingGroup(group);
                      setIsGroupFormOpen(true);
                    }}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => setGroupToDelete(group)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <GroupFormDialog
        open={isGroupFormOpen}
        onClose={() => {
          setIsGroupFormOpen(false);
          setEditingGroup(null);
        }}
        onSuccess={handleGroupCreatedOrUpdated}
        group={editingGroup || undefined}
      />

      <Dialog
        open={!!groupToDelete}
        onClose={() => setGroupToDelete(null)}
      >
        <DialogTitle>Удалить группу?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Вы уверены, что хотите удалить группу {groupToDelete?.name}?
            Это действие нельзя отменить.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGroupToDelete(null)}>Отмена</Button>
          <Button onClick={handleDeleteGroup} color="error" variant="contained">
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GroupsPage;