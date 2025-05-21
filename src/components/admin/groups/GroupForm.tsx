import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { createGroup, updateGroup, getTeachers } from "@/lib/firebase/functions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import type { Group } from "@/pages/admin/GroupsPage";

const formSchema = z.object({
  name: z.string().min(1, "Название группы обязательно"),
  course: z.string().min(1, "Курс обязателен"),
  specialty: z.string().min(1, "Специальность обязательна"),
  qualification: z.string().min(1, "Квалификация обязательна"),
  curatorId: z.string().optional(),
  curatorName: z.string().optional(),
  subjects: z.array(z.string()),
});

type GroupFormValues = z.infer<typeof formSchema>;

interface GroupFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Group;
}

export function GroupFormDialog({ open, onOpenChange, initialData }: GroupFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const { data: teachers = [] } = useQuery({
    queryKey: ["teachers"],
    queryFn: getTeachers,
  });

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      course: initialData?.course?.toString() || "",
      specialty: initialData?.specialty || "",
      qualification: initialData?.qualification || "",
      curatorId: initialData?.curatorId || "",
      curatorName: initialData?.curatorName || "",
      subjects: initialData?.subjects?.map(s => s.subjectName) || [],
    },
  });

  const onSubmit = async (data: GroupFormValues) => {
    try {
      setIsLoading(true);
      if (initialData) {
        await updateGroup({
          id: initialData.id,
          ...data,
        });
        toast.success("Группа успешно обновлена");
      } else {
        await createGroup(data);
        toast.success("Группа успешно создана");
      }
      onOpenChange(false);
      form.reset();
    } catch (error: unknown) {
      console.error("Error submitting form:", error);
      toast.error(
        error instanceof Error ? error.message : "Произошла ошибка при сохранении группы"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Редактировать группу" : "Создать новую группу"}
          </DialogTitle>
          <DialogDescription>
            Заполните информацию о группе. После создания группы вы сможете добавить студентов и настроить расписание.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название группы</FormLabel>
                  <FormControl>
                    <Input placeholder="Введите название группы" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="course"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Курс</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите курс" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6].map((course) => (
                        <SelectItem key={course} value={course.toString()}>
                          {course} курс
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="specialty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Специальность</FormLabel>
                  <FormControl>
                    <Input placeholder="Введите специальность" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="qualification"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Квалификация</FormLabel>
                  <FormControl>
                    <Input placeholder="Введите квалификацию" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="curatorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Куратор</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      const teacher = teachers.find((t) => t.id === value);
                      field.onChange(value);
                      form.setValue("curatorName", teacher?.displayName || "");
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите куратора" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Сохранение..." : initialData ? "Сохранить" : "Создать"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 