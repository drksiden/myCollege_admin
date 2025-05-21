import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
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
import { Skeleton } from '@/components/ui/skeleton';

interface Subject {
  id: string;
  name: string;
  description: string;
  teacherId: string;
  teacherName: string;
  createdAt: Date;
  updatedAt: Date;
}

interface SubjectsListProps {
  subjects: Subject[];
  onEdit: (subject: Subject) => void;
  onDelete: (subjectId: string) => void;
  loading?: boolean;
}

export const SubjectsList: React.FC<SubjectsListProps> = ({
  subjects,
  onEdit,
  onDelete,
  loading = false,
}) => {
  const [subjectToDelete, setSubjectToDelete] = React.useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Нет доступных предметов
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Название</TableHead>
            <TableHead>Описание</TableHead>
            <TableHead>Преподаватель</TableHead>
            <TableHead className="w-[100px]">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subjects.map((subject) => (
            <TableRow key={subject.id}>
              <TableCell className="font-medium">{subject.name}</TableCell>
              <TableCell>{subject.description}</TableCell>
              <TableCell>{subject.teacherName}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(subject)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSubjectToDelete(subject.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={!!subjectToDelete} onOpenChange={() => setSubjectToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить предмет?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Это навсегда удалит предмет из системы.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (subjectToDelete) {
                  onDelete(subjectToDelete);
                  setSubjectToDelete(null);
                }
              }}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}; 