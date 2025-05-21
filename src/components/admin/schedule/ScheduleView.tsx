import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { MapPin, User, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

export interface ScheduleItem {
  id: string;
  subject: string;
  teacher: string;
  startTime: string;
  endTime: string;
  room: string;
  type: 'lecture' | 'practice' | 'lab';
  date: Date;
  groupId: string;
  subjectId: string;
  teacherId: string;
}

interface ScheduleViewProps {
  items: ScheduleItem[];
  date: Date;
  onEdit?: (item: ScheduleItem) => void;
  onDelete?: (itemId: string) => void;
}

const typeLabels = {
  lecture: 'Лекция',
  practice: 'Практика',
  lab: 'Лабораторная',
};

const typeColors = {
  lecture: 'bg-blue-100 text-blue-800',
  practice: 'bg-green-100 text-green-800',
  lab: 'bg-purple-100 text-purple-800',
};

export const ScheduleView: React.FC<ScheduleViewProps> = ({ 
  items, 
  date, 
  onEdit, 
  onDelete 
}) => {
  const [itemToDelete, setItemToDelete] = React.useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        На выбранную дату занятий нет
      </div>
    );
  }

  // Сортируем занятия по времени начала
  const sortedItems = [...items].sort((a, b) => {
    return a.startTime.localeCompare(b.startTime);
  });

  return (
    <div className="space-y-4">
      <div className="text-lg font-medium">
        {format(date, 'd MMMM yyyy', { locale: ru })}
      </div>
      <div className="grid gap-2">
        {sortedItems.map((item) => (
          <Card key={item.id} className="hover:bg-accent/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center min-w-[80px]">
                    <div className="text-sm font-medium">{item.startTime}</div>
                    <div className="text-xs text-muted-foreground">{item.endTime}</div>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{item.subject}</div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-3 w-3" />
                      {item.teacher}
                      <span className="mx-1">•</span>
                      <MapPin className="h-3 w-3" />
                      {item.room}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={typeColors[item.type]}>
                    {typeLabels[item.type]}
                  </Badge>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit?.(item)}
                      className="h-8 w-8"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setItemToDelete(item.id)}
                      className="h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить занятие?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Это навсегда удалит занятие из расписания.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (itemToDelete) {
                  onDelete?.(itemToDelete);
                  setItemToDelete(null);
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