'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit2, Trash2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { getAllSubjects, createSubject, updateSubject, deleteSubject } from '@/lib/firebaseService/subjectService';
import type { Subject } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    code: ''
  });

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      const data = await getAllSubjects();
      setSubjects(data);
    } catch (error) {
      console.error('Ошибка при загрузке предметов:', error);
      toast.error('Не удалось загрузить список предметов');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSubject) {
        await updateSubject(editingSubject.id, formData);
        toast.success('Предмет успешно обновлен');
      } else {
        await createSubject(formData);
        toast.success('Предмет успешно создан');
      }
      setIsDialogOpen(false);
      loadSubjects();
      resetForm();
    } catch (error) {
      console.error('Ошибка при сохранении предмета:', error);
      toast.error('Не удалось сохранить предмет');
    }
  };

  const handleDelete = async (subject: Subject) => {
    if (window.confirm(`Вы уверены, что хотите удалить предмет "${subject.name}"?`)) {
      try {
        await deleteSubject(subject.id);
        toast.success('Предмет успешно удален');
        loadSubjects();
      } catch (error) {
        console.error('Ошибка при удалении предмета:', error);
        toast.error('Не удалось удалить предмет');
      }
    }
  };

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setFormData({
      name: subject.name,
      description: subject.description || '',
      code: subject.code || ''
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingSubject(null);
    setFormData({
      name: '',
      description: '',
      code: ''
    });
  };

  const filteredSubjects = subjects.filter(subject =>
    subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    subject.code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Предметы</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              resetForm();
              setIsDialogOpen(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Добавить предмет
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSubject ? 'Редактировать предмет' : 'Новый предмет'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Название предмета</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Введите название предмета"
                  required
                />
              </div>
              <div>
                <Label htmlFor="code">Код предмета</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Введите код предмета"
                />
              </div>
              <div>
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Введите описание предмета"
                  rows={4}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Отмена
                </Button>
                <Button type="submit">
                  {editingSubject ? 'Сохранить' : 'Создать'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск предметов..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredSubjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Предметы не найдены</h3>
            <p className="text-muted-foreground">Добавьте новый предмет или измените параметры поиска</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSubjects.map((subject) => (
            <Card key={subject.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{subject.name}</CardTitle>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(subject)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(subject)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {subject.code && (
                  <Badge variant="secondary">{subject.code}</Badge>
                )}
              </CardHeader>
              <CardContent>
                {subject.description && (
                  <p className="text-muted-foreground">{subject.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 