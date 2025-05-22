import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Calendar } from "@/components/ui/calendar";

const formSchema = z.object({
  groupId: z.string().min(1, "Выберите группу"),
  subjectId: z.string().min(1, "Выберите предмет"),
  teacherId: z.string().min(1, "Выберите преподавателя"),
  date: z.date({
    required_error: "Выберите дату",
  }),
  startTime: z.string().min(1, "Укажите время начала"),
  endTime: z.string().min(1, "Укажите время окончания"),
  room: z.string().min(1, "Укажите аудиторию"),
  type: z.enum(["lecture", "practice", "lab"], {
    required_error: "Выберите тип занятия",
  }),
});

type ScheduleFormValues = z.infer<typeof formSchema>;

interface ScheduleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScheduleSubmitSuccess: (data: ScheduleFormValues) => void;
  initialData?: ScheduleFormValues;
}

export function ScheduleFormDialog({
  open,
  onOpenChange,
  onScheduleSubmitSuccess,
  initialData,
}: ScheduleFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const defaultValues = useMemo(() => ({
    groupId: initialData?.groupId || "",
    subjectId: initialData?.subjectId || "",
    teacherId: initialData?.teacherId || "",
    date: initialData?.date || new Date(),
    startTime: initialData?.startTime || "",
    endTime: initialData?.endTime || "",
    room: initialData?.room || "",
    type: initialData?.type || "lecture",
  }), [initialData]);

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const onSubmit = async (data: ScheduleFormValues) => {
    try {
      setIsLoading(true);
      onScheduleSubmitSuccess(data);
      onOpenChange(false);
      form.reset();
    } catch (error: unknown) {
      console.error("Error submitting form:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Произошла ошибка при сохранении занятия"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Редактировать занятие" : "Добавить занятие"}
          </DialogTitle>
          <DialogDescription>
            Заполните форму для {initialData ? "изменения" : "создания"} занятия
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="groupId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Группа</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите группу" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="group1">Группа 1</SelectItem>
                      <SelectItem value="group2">Группа 2</SelectItem>
                      <SelectItem value="group3">Группа 3</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subjectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Предмет</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите предмет" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="subject1">Предмет 1</SelectItem>
                      <SelectItem value="subject2">Предмет 2</SelectItem>
                      <SelectItem value="subject3">Предмет 3</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="teacherId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Преподаватель</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите преподавателя" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="teacher1">Преподаватель 1</SelectItem>
                      <SelectItem value="teacher2">Преподаватель 2</SelectItem>
                      <SelectItem value="teacher3">Преподаватель 3</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Дата</FormLabel>
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date < new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Время начала</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Время окончания</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="room"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Аудитория</FormLabel>
                  <FormControl>
                    <Input placeholder="Номер аудитории" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Тип занятия</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите тип занятия" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="lecture">Лекция</SelectItem>
                      <SelectItem value="practice">Практика</SelectItem>
                      <SelectItem value="lab">Лабораторная</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Сохранение..." : "Сохранить"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 