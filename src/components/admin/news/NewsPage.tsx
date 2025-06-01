import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { getNews } from '@/lib/firebaseService/newsService';
import type { News } from '@/types';
import { toast } from 'sonner';
import NewsList from '@/components/admin/news/NewsList';
import NewsEditor from '@/components/admin/news/NewsEditor';

export default function NewsPage() {
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNews, setEditingNews] = useState<News | null>(null);

  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    try {
      setLoading(true);
      await getNews({});
    } catch (error) {
      console.error('Error loading news:', error);
      toast.error('Не удалось загрузить новости');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setIsDialogOpen(false);
    setEditingNews(null);
    loadNews();
  };

  const handleEdit = (news: News) => {
    setEditingNews(news);
    setIsDialogOpen(true);
  };

  if (loading) {
    return <div>Загрузка...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Управление новостями</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>Добавить новость</Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                {editingNews ? 'Редактирование новости' : 'Создание новости'}
              </DialogTitle>
            </DialogHeader>

            <NewsEditor
              news={editingNews}
              onClose={handleSubmit}
            />
          </DialogContent>
        </Dialog>
      </div>

      <NewsList onEditNews={handleEdit} />
    </div>
  );
} 