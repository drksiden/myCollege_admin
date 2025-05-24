import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Trash2, Search, Edit2, ArrowUpDown } from 'lucide-react';
import type { ScheduleTemplate } from '@/lib/firebaseService/scheduleTemplateService';

interface ScheduleTemplatesListProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: ScheduleTemplate[];
  onDeleteTemplate: (templateId: string) => void;
  onApplyTemplate: (template: ScheduleTemplate) => void;
  onEditTemplate: (template: ScheduleTemplate) => void;
}

type SortField = 'name' | 'createdAt' | 'lessons';
type SortOrder = 'asc' | 'desc';

const ScheduleTemplatesList: React.FC<ScheduleTemplatesListProps> = ({
  open,
  onOpenChange,
  templates,
  onDeleteTemplate,
  onApplyTemplate,
  onEditTemplate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [templateToDelete, setTemplateToDelete] = useState<ScheduleTemplate | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredAndSortedTemplates = useMemo(() => {
    const filtered = templates.filter(template => 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'createdAt':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'lessons':
          comparison = a.schedule.lessons.length - b.schedule.lessons.length;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [templates, searchQuery, sortField, sortOrder]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Шаблоны расписаний</DialogTitle>
            <DialogDescription>
              Выберите шаблон для применения к текущему расписанию
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по названию или описанию..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select
                value={`${sortField}-${sortOrder}`}
                onValueChange={(value) => {
                  const [field, order] = value.split('-') as [SortField, SortOrder];
                  setSortField(field);
                  setSortOrder(order);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Сортировка" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name-asc">Название (А-Я)</SelectItem>
                  <SelectItem value="name-desc">Название (Я-А)</SelectItem>
                  <SelectItem value="createdAt-desc">Сначала новые</SelectItem>
                  <SelectItem value="createdAt-asc">Сначала старые</SelectItem>
                  <SelectItem value="lessons-desc">Больше уроков</SelectItem>
                  <SelectItem value="lessons-asc">Меньше уроков</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('name')}
                        className="flex items-center gap-1"
                      >
                        Название
                        <ArrowUpDown className="h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>Описание</TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('lessons')}
                        className="flex items-center gap-1"
                      >
                        Уроки
                        <ArrowUpDown className="h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedTemplates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        {searchQuery ? 'Нет шаблонов по вашему запросу' : 'Шаблоны не найдены'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAndSortedTemplates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {template.description || '-'}
                        </TableCell>
                        <TableCell>{template.schedule.lessons.length}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onApplyTemplate(template)}
                            >
                              <FileText className="h-4 w-4" />
                              <span className="sr-only">Применить шаблон</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEditTemplate(template)}
                            >
                              <Edit2 className="h-4 w-4" />
                              <span className="sr-only">Редактировать шаблон</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setTemplateToDelete(template)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Удалить шаблон</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Закрыть
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {templateToDelete && (
        <Dialog open={!!templateToDelete} onOpenChange={() => setTemplateToDelete(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Удалить шаблон?</DialogTitle>
              <DialogDescription>
                Вы уверены, что хотите удалить шаблон "{templateToDelete.name}"? Это действие нельзя отменить.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setTemplateToDelete(null)}
              >
                Отмена
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  onDeleteTemplate(templateToDelete.id);
                  setTemplateToDelete(null);
                }}
              >
                Удалить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default ScheduleTemplatesList; 