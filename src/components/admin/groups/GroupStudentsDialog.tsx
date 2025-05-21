import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import type { Group } from "@/pages/admin/GroupsPage";
import type { User } from "@/pages/admin/UsersPage";
import { getGroupStudents, removeStudentFromGroup } from "@/lib/firebase/functions";

interface GroupStudentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group?: Group;
}

export function GroupStudentsDialog({ open, onOpenChange, group }: GroupStudentsDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { data: students = [], refetch } = useQuery({
    queryKey: ["group-students", group?.id],
    queryFn: () => group ? getGroupStudents(group.id) : Promise.resolve([]),
    enabled: !!group,
  });

  const filteredStudents = students.filter((student: User) => {
    const fullName = `${student.lastName} ${student.firstName} ${student.patronymic || ""}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  const handleAddStudent = async () => {
    // TODO: Implement add student functionality
    toast.info("Функция добавления студента будет реализована в следующем этапе");
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!group) return;
    
    try {
      setIsLoading(true);
      await removeStudentFromGroup(group.id, studentId);
      toast.success("Студент успешно удален из группы");
      refetch();
    } catch (error) {
      console.error("Error removing student:", error);
      toast.error(
        error instanceof Error ? error.message : "Произошла ошибка при удалении студента"
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!group) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Студенты группы {group.name}</DialogTitle>
          <DialogDescription>
            Управление списком студентов в группе. Вы можете добавлять новых студентов и удалять существующих.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-between items-center mb-4">
          <Input
            placeholder="Поиск студентов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
          <Button onClick={handleAddStudent}>Добавить студента</Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Фамилия</TableHead>
                <TableHead>Имя</TableHead>
                <TableHead>Отчество</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student: User) => (
                <TableRow key={student.id}>
                  <TableCell>{student.lastName}</TableCell>
                  <TableCell>{student.firstName}</TableCell>
                  <TableCell>{student.patronymic || "-"}</TableCell>
                  <TableCell>{student.email}</TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveStudent(student.id)}
                      disabled={isLoading}
                    >
                      Удалить
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredStudents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    {searchQuery ? "Студенты не найдены" : "В группе пока нет студентов"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
} 