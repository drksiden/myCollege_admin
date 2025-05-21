import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
} from '@mui/material';
import type { Group } from '../../types';
import { createGroup } from '../../services/firestore';

interface GroupFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  group?: Group;
}

const GroupFormDialog: React.FC<GroupFormDialogProps> = ({
  open,
  onClose,
  onSuccess,
  group,
}) => {
  const [formData, setFormData] = useState<Partial<Group>>({
    name: group?.name || '',
    year: group?.year || new Date().getFullYear(),
    specialization: group?.specialization || '',
    students: group?.students || [],
    scheduleId: group?.scheduleId || '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (group) {
        // TODO: Добавить функцию обновления группы
        // await updateGroup(group.id, formData);
      } else {
        await createGroup(formData as Omit<Group, 'id' | 'createdAt' | 'updatedAt'>);
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving group:', err);
      setError('Произошла ошибка при сохранении группы');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {group ? 'Редактировать группу' : 'Добавить группу'}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Название группы"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Год"
              type="number"
              value={formData.year}
              onChange={(e) =>
                setFormData({ ...formData, year: parseInt(e.target.value) })
              }
              required
              fullWidth
            />
            <TextField
              label="Специализация"
              value={formData.specialization}
              onChange={(e) =>
                setFormData({ ...formData, specialization: e.target.value })
              }
              required
              fullWidth
            />
            {error && (
              <Box color="error.main" mt={1}>
                {error}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Отмена</Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {loading ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default GroupFormDialog; 