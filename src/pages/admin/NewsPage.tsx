import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createNews, updateNews } from '@/lib/firebaseService/newsService';
import type { News } from '@/types/index';
import { Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import NewsList from '@/components/admin/news/NewsList';
import NewsEditor from '@/components/admin/news/NewsEditor';

interface NewsFormProps {
  news?: News | null;
  onClose: () => void;
}

function NewsForm({ news, onClose }: NewsFormProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (news) {
      setTitle(news.title);
      setContent(news.content);
      setImageUrl(news.imageUrl || '');
      setIsPublished(news.isPublished);
    }
  }, [news]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) {
      setError('Заполните все обязательные поля');
      return;
    }

    if (!user?.uid) {
      setError('Пользователь не авторизован');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const newsData = {
        title,
        content,
        imageUrl,
        isPublished,
        authorId: user.uid,
        createdAt: news?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (news) {
        await updateNews(news.id, newsData);
      } else {
        await createNews(newsData);
      }

      onClose();
    } catch (error) {
      console.error('Error saving news:', error);
      setError('Ошибка при сохранении новости');
    } finally {
      setLoading(false);
    }
  };
}

export default function NewsPage() {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedNews, setSelectedNews] = useState<News | null>(null);

  const handleCreateNews = () => {
    setSelectedNews(null);
    setIsEditorOpen(true);
  };

  const handleEditNews = (news: News) => {
    setSelectedNews(news);
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setSelectedNews(null);
  };

  return (
    <div className="container py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-2xl font-bold">Управление новостями</CardTitle>
          <Button
            onClick={handleCreateNews}
            disabled={isEditorOpen}
          >
            Создать новость
          </Button>
        </CardHeader>
        <CardContent>
          {isEditorOpen ? (
            <NewsEditor
              news={selectedNews}
              onClose={handleCloseEditor}
            />
          ) : (
            <NewsList onEditNews={handleEditNews} />
          )}
        </CardContent>
      </Card>
    </div>
  );
} 