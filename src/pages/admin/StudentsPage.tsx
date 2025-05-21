import React, { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import type { Student, User } from '@/types';

interface StudentWithUser extends Student {
  user: User;
  group?: {
    id: string;
    name: string;
  };
}

const StudentsPage: React.FC = () => {
  const [students, setStudents] = useState<StudentWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentWithUser | null>(null);
  const { isAdmin } = useAuth();

  const fetchStudents = async () => {
    try {
      const getStudents = httpsCallable(functions, 'getStudents');
      const result = await getStudents();
      const data = result.data as { students: StudentWithUser[] };
      setStudents(data.students);
    } catch (error) {
      console.error('Ошибка при загрузке студентов:', error);
      toast.error('Не удалось загрузить список студентов');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  if (!isAdmin) {
    return (
      <div className="p-4">
        <h2 className="text-2xl font-bold text-red-500">
          Доступ запрещен. Требуются права администратора.
        </h2>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Студенты</h1>
        <Button onClick={() => setIsDialogOpen(true)}>
          Добавить студента
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ФИО</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Группа</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  </TableRow>
                ))
              ) : (
                students.map((student) => (
                  <motion.tr
                    key={student.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="border-b"
                  >
                    <TableCell>{`${student.user.lastName} ${student.user.firstName}`}</TableCell>
                    <TableCell>{student.user.email}</TableCell>
                    <TableCell>{student.group?.name || 'Не назначена'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        student.status === 'active' ? 'bg-green-100 text-green-800' :
                        student.status === 'inactive' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {student.status === 'active' ? 'Активен' :
                         student.status === 'inactive' ? 'Неактивен' :
                         'Выпускник'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedStudent(student);
                            setIsDialogOpen(true);
                          }}
                        >
                          Редактировать
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            // TODO: Implement delete
                          }}
                        >
                          Удалить
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedStudent ? 'Редактировать студента' : 'Добавить студента'}
            </DialogTitle>
            <DialogDescription>
              {selectedStudent
                ? 'Внесите изменения в информацию о студенте'
                : 'Заполните данные для нового студента'}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lastName">Фамилия</Label>
                <Input id="lastName" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstName">Имя</Label>
                <Input id="firstName" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="group">Группа</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите группу" />
                </SelectTrigger>
                <SelectContent>
                  {/* TODO: Add groups */}
                </SelectContent>
              </Select>
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Отмена
            </Button>
            <Button type="submit">
              {selectedStudent ? 'Сохранить' : 'Добавить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentsPage; 