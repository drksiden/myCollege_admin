import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { getGroups, deleteGroup } from "@/lib/firebase/functions";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GroupFormDialog } from "@/components/admin/groups/GroupForm";
import { GroupStudentsDialog } from "@/components/admin/groups/GroupStudentsDialog";
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

export interface Group {
  id: string;
  name: string;
  course: number;
  specialty: string;
  qualification: string;
  curatorId?: string | null;
  curatorName?: string;
  subjects: Array<{
    subjectName: string;
    teacherId: string;
    teacherName: string;
  }>;
  studentCount: number;
  createdAt: {
    seconds: number;
    nanoseconds: number;
  };
  updatedAt: {
    seconds: number;
    nanoseconds: number;
  };
}

const TableRowSkeleton: React.FC<{ columnsCount: number }> = ({
  columnsCount,
}) => (
  <TableRow>
    {Array.from({ length: columnsCount }).map((_, index) => (
      <TableCell key={index}>
        <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
      </TableCell>
    ))}
  </TableRow>
);

export default function GroupsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | undefined>();
  const [groupToDelete, setGroupToDelete] = useState<Group | undefined>();
  const [selectedGroup, setSelectedGroup] = useState<Group | undefined>();

  const { data: groups, isLoading, refetch } = useQuery({
    queryKey: ["groups"],
    queryFn: getGroups,
  });

  const handleDeleteGroup = async () => {
    if (!groupToDelete) return;

    try {
      await deleteGroup(groupToDelete.id);
      toast.success("Группа успешно удалена");
      refetch();
    } catch (error: unknown) {
      console.error("Error deleting group:", error);
      toast.error(
        error instanceof Error ? error.message : "Произошла ошибка при удалении группы"
      );
    } finally {
      setGroupToDelete(undefined);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="container mx-auto py-10"
    >
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Группы</h1>
        <Button onClick={() => setIsFormOpen(true)}>Создать группу</Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Название</TableHead>
              <TableHead>Курс</TableHead>
              <TableHead>Специальность</TableHead>
              <TableHead>Квалификация</TableHead>
              <TableHead>Куратор</TableHead>
              <TableHead>Количество студентов</TableHead>
              <TableHead>Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <>
                <TableRowSkeleton columnsCount={7} />
                <TableRowSkeleton columnsCount={7} />
                <TableRowSkeleton columnsCount={7} />
              </>
            ) : (
              groups?.map((group) => (
                <TableRow key={group.id}>
                  <TableCell>{group.name}</TableCell>
                  <TableCell>{group.course} курс</TableCell>
                  <TableCell>{group.specialty}</TableCell>
                  <TableCell>{group.qualification}</TableCell>
                  <TableCell>{group.curatorName || "Не назначен"}</TableCell>
                  <TableCell>{group.studentCount}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedGroup(group);
                        }}
                      >
                        Студенты
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingGroup(group);
                          setIsFormOpen(true);
                        }}
                      >
                        Редактировать
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setGroupToDelete(group)}
                      >
                        Удалить
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <GroupFormDialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) {
            setEditingGroup(undefined);
          }
        }}
        initialData={editingGroup}
      />

      <GroupStudentsDialog
        open={!!selectedGroup}
        onOpenChange={(open) => {
          if (!open) setSelectedGroup(undefined);
        }}
        group={selectedGroup}
      />

      <AlertDialog
        open={!!groupToDelete}
        onOpenChange={(open) => {
          if (!open) setGroupToDelete(undefined);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Подтверждение удаления</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить группу {groupToDelete?.name}? Это действие
              нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGroup}>
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}