import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { ScheduleTemplate } from '@/types';

interface ScheduleTemplatesListProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: ScheduleTemplate[];
  onApplyTemplate: (template: ScheduleTemplate) => void;
  onEditTemplate: (template: ScheduleTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
}

export function ScheduleTemplatesList({
  open,
  onOpenChange,
  templates,
  onApplyTemplate,
  onEditTemplate,
  onDeleteTemplate,
}: ScheduleTemplatesListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<keyof ScheduleTemplate>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [templateToDelete, setTemplateToDelete] = useState<ScheduleTemplate | null>(null);

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (template.description && template.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const sortedTemplates = [...filteredTemplates].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'createdAt') {
      comparison = a.createdAt.toMillis() - b.createdAt.toMillis();
    } else if (sortField === 'name') {
      comparison = a.name.localeCompare(b.name);
    } else if (sortField === 'lessons') {
      comparison = a.lessons.length - b.lessons.length;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const handleSort = (field: keyof ScheduleTemplate) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Шаблоны расписаний</DialogTitle>
          <DialogDescription>
            Выберите шаблон для применения или создайте новый
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Input
              placeholder="Поиск шаблонов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Сортировка:</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSort('name')}
              className={sortField === 'name' ? 'font-bold' : ''}
            >
              По названию {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSort('createdAt')}
              className={sortField === 'createdAt' ? 'font-bold' : ''}
            >
              По дате {sortField === 'createdAt' && (sortDirection === 'asc' ? '↑' : '↓')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSort('lessons')}
              className={sortField === 'lessons' ? 'font-bold' : ''}
            >
              По количеству занятий {sortField === 'lessons' && (sortDirection === 'asc' ? '↑' : '↓')}
            </Button>
          </div>

          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {sortedTemplates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-start justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{template.name}</h3>
                      <Badge variant="secondary">
                        {template.lessons.length} занятий
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {template.description || 'Без описания'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Создан: {format(template.createdAt.toDate(), 'd MMMM yyyy', { locale: ru })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onApplyTemplate(template)}
                    >
                      Применить
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEditTemplate(template)}
                    >
                      Изменить
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setTemplateToDelete(template)}
                    >
                      Удалить
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>

      <Dialog open={!!templateToDelete} onOpenChange={() => setTemplateToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удаление шаблона</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить шаблон "{templateToDelete?.name}"?
              Это действие нельзя отменить.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setTemplateToDelete(null)}
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (templateToDelete) {
                  onDeleteTemplate(templateToDelete.id);
                  setTemplateToDelete(null);
                }
              }}
            >
              Удалить
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
} 