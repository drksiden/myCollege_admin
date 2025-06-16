// src/components/admin/subjects/SubjectDetailModal.tsx
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 

  Clock, 
  Calendar, 
  Edit2, 

  Info
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { Subject } from '@/types';
import { motion } from 'framer-motion';

interface SubjectDetailModalProps {
  subject: Subject | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (subject: Subject) => void;
}

const SubjectDetailModal: React.FC<SubjectDetailModalProps> = ({
  subject,
  open,
  onOpenChange,
  onEdit,
}) => {
  if (!subject) return null;

  const getSubjectIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('математика') || lowerName.includes('алгебра') || lowerName.includes('геометрия')) {
      return '📐';
    }
    if (lowerName.includes('физика')) {
      return '⚛️';
    }
    if (lowerName.includes('информатика') || lowerName.includes('программирование')) {
      return '💻';
    }
    if (lowerName.includes('язык') || lowerName.includes('английский') || lowerName.includes('русский')) {
      return '🗣️';
    }
    if (lowerName.includes('история')) {
      return '📚';
    }
    if (lowerName.includes('химия')) {
      return '🧪';
    }
    if (lowerName.includes('биология')) {
      return '🧬';
    }
    return '📖';
  };

  const formatDate = (timestamp: { toDate: () => Date } | null | undefined) => {
    if (!timestamp || !timestamp.toDate) return 'Не указано';
    try {
      return format(timestamp.toDate(), 'dd MMMM yyyy, HH:mm', { locale: ru });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Ошибка формата даты';
    }
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
        >
          <DialogHeader className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-2xl">
                  {getSubjectIcon(subject.name)}
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold">{subject.name}</DialogTitle>
                  <DialogDescription className="mt-1">
                    Подробная информация о предмете
                  </DialogDescription>
                </div>
              </div>
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(subject)}
                  className="gap-2"
                >
                  <Edit2 className="h-4 w-4" />
                  Редактировать
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-6 mt-6">
            {/* Основная информация */}
            <motion.div variants={itemVariants} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Часы в неделю */}
                {subject.hoursPerWeek && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-500" />
                        Часов в неделю
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{subject.hoursPerWeek}</div>
                      <p className="text-xs text-muted-foreground">академических часов</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </motion.div>

            {/* Описание */}
            {subject.description && (
              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-blue-500" />
                      Описание предмета
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {subject.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Цели обучения */}
            {/* Этот блок удален, так как поля objectives нет в Firebase */}

            {/* Ожидаемые результаты */}
            {/* Этот блок удален, так как поля outcomes нет в Firebase */}

            {/* Метаинформация */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    Информация о создании
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Создан:</span>
                    <span>{formatDate(subject.createdAt)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Обновлен:</span>
                    <span>{formatDate(subject.updatedAt)}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default SubjectDetailModal;