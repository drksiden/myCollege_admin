// src/components/admin/news/NewsList.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Search,
  Calendar,
  Tag,
  Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { deleteNews, publishNews, unpublishNews } from '@/lib/firebaseService/newsService';
import type { News } from '@/types';

interface NewsListProps {
  news: News[];
  onEditNews: (newsItem: News) => void;
  onNewsUpdate: () => void;
  loading?: boolean;
}

const NewsList: React.FC<NewsListProps> = ({ 
  news = [], 
  onEditNews, 
  onNewsUpdate,
  loading = false 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; newsItem: News | null }>({ 
    open: false, 
    newsItem: null 
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Получаем все уникальные теги
  const allTags = [...new Set(news.flatMap(item => item.tags || []))];

  // Фильтрация новостей
  const filteredNews = news.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'published' && item.isPublished) ||
                         (statusFilter === 'draft' && !item.isPublished);
    
    const matchesTag = tagFilter === 'all' || (item.tags && item.tags.includes(tagFilter));
    
    return matchesSearch && matchesStatus && matchesTag;
  });

  const handleDelete = async (newsItem: News) => {
    if (!newsItem.id) return;
    
    setActionLoading(newsItem.id);
    try {
      await deleteNews(newsItem.id);
      toast.success('Новость успешно удалена');
      onNewsUpdate();
    } catch (error) {
      console.error('Error deleting news:', error);
      toast.error('Не удалось удалить новость');
    } finally {
      setActionLoading(null);
      setDeleteDialog({ open: false, newsItem: null });
    }
  };

  const handlePublishToggle = async (newsItem: News) => {
    if (!newsItem.id) return;
    
    setActionLoading(newsItem.id);
    try {
      if (newsItem.isPublished) {
        await unpublishNews(newsItem.id);
        toast.success('Новость снята с публикации');
      } else {
        await publishNews(newsItem.id);
        toast.success('Новость опубликована');
      }
      onNewsUpdate();
    } catch (error) {
      console.error('Error toggling publish status:', error);
      toast.error('Не удалось изменить статус публикации');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (timestamp: unknown) => {
    if (!timestamp) return 'Неизвестно';
    
    // Обработка разных форматов timestamp
    let date: Date;
    
    // Проверяем, является ли timestamp объектом Firestore Timestamp
    if (typeof timestamp === 'object' && timestamp !== null) {
      if ('toDate' in timestamp && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      } else if ('seconds' in timestamp && typeof timestamp.seconds === 'number') {
        date = new Date(timestamp.seconds * 1000);
      } else {
        return 'Неверный формат даты';
      }
    } else {
      try {
        date = new Date(timestamp as string | number);
      } catch {
        return 'Неверный формат даты';
      }
    }
    
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Загрузка новостей...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Фильтры */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск новостей..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Статус публикации" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="published">Опубликованные</SelectItem>
            <SelectItem value="draft">Черновики</SelectItem>
          </SelectContent>
        </Select>

        <Select value={tagFilter} onValueChange={setTagFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Фильтр по тегам" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все теги</SelectItem>
            {allTags.map(tag => (
              <SelectItem key={tag} value={tag}>{tag}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Список новостей */}
      {filteredNews.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              {news.length === 0 ? 'Новостей пока нет' : 'Новости не найдены по заданным фильтрам'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredNews.map((newsItem) => (
            <Card key={newsItem.id} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{newsItem.title}</CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(newsItem.createdAt)}
                      </div>
                      <Badge variant={newsItem.isPublished ? "default" : "secondary"}>
                        {newsItem.isPublished ? "Опубликовано" : "Черновик"}
                      </Badge>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        className="h-8 w-8 p-0"
                        disabled={actionLoading === newsItem.id}
                      >
                        {actionLoading === newsItem.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MoreHorizontal className="h-4 w-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEditNews(newsItem)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Редактировать
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handlePublishToggle(newsItem)}>
                        {newsItem.isPublished ? (
                          <>
                            <EyeOff className="mr-2 h-4 w-4" />
                            Снять с публикации
                          </>
                        ) : (
                          <>
                            <Eye className="mr-2 h-4 w-4" />
                            Опубликовать
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => setDeleteDialog({ open: true, newsItem })}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Удалить
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent>
                {/* Изображения */}
                {newsItem.images && newsItem.images.length > 0 && (
                  <div className="mb-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {newsItem.images.slice(0, 3).map((image, index) => (
                        <img
                          key={index}
                          src={image.url}
                          alt={image.alt}
                          className="w-full h-20 object-cover rounded"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ))}
                      {newsItem.images.length > 3 && (
                        <div className="w-full h-20 bg-muted rounded flex items-center justify-center text-sm text-muted-foreground">
                          +{newsItem.images.length - 3} еще
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Контент */}
                <p className="text-muted-foreground line-clamp-3 mb-4">
                  {newsItem.content}
                </p>

                {/* Теги */}
                {newsItem.tags && newsItem.tags.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    {newsItem.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Диалог удаления */}
      <AlertDialog 
        open={deleteDialog.open} 
        onOpenChange={(open) => setDeleteDialog({ open, newsItem: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Подтвердите удаление</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить новость "{deleteDialog.newsItem?.title}"?
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteDialog.newsItem && handleDelete(deleteDialog.newsItem)}
              className="bg-red-600 hover:bg-red-700"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default NewsList;