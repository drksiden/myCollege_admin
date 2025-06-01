import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { createNews, getNews, updateNews, deleteNews } from '@/lib/firebaseService/newsService';
import type { News } from '@/types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth';
import { Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import NewsList from '@/components/admin/news/NewsList';
import NewsEditor from '@/components/admin/news/NewsEditor';

interface NewsFormProps {
  mode: 'create' | 'edit';
  newsId?: string;
  onFormSubmitSuccess: (newsId: string) => void;
  onCancel: () => void;
}

const NewsForm: React.FC<NewsFormProps> = ({
  mode,
  newsId,
  onFormSubmitSuccess,
  onCancel,
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [isPublished, setIsPublished] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (newsId) {
      loadNews(newsId);
    }
  }, [newsId]);

  const loadNews = async (id: string) => {
    try {
      setIsLoading(true);
      const news = await getNews(id);
      if (news) {
        setTitle(news.title);
        setContent(news.content);
        setImageUrl(news.imageUrl);
        setIsPublished(news.isPublished);
      }
    } catch (error) {
      console.error('Error loading news:', error);
      toast.error('Failed to load news');
    } finally {
      setIsLoading(false);
    }
  };

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
      setIsLoading(true);
      setError('');

      const newsData = {
        title,
        content,
        images: imageUrl ? [{ url: imageUrl, alt: title, order: 0 }] : [],
        tags: [],
        authorId: user.uid,
        isPublished,
        createdAt: newsId ? news?.createdAt || new Date().toISOString() : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (mode === 'create') {
        const newNews = await createNews(newsData);
        onFormSubmitSuccess(newNews.id);
      } else if (mode === 'edit' && newsId) {
        await updateNews(newsId, newsData);
        onFormSubmitSuccess(newsId);
      }

      toast.success(`News ${mode === 'create' ? 'created' : 'updated'} successfully`);
    } catch (error) {
      console.error('Error saving news:', error);
      setError('Ошибка при сохранении новости');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isLoading}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Content</Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={isLoading}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="imageUrl">Image URL</Label>
        <Input
          id="imageUrl"
          value={imageUrl || ''}
          onChange={(e) => setImageUrl(e.target.value)}
          disabled={isLoading}
        />
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="isPublished"
          checked={isPublished}
          onChange={(e) => setIsPublished(e.target.checked)}
          disabled={isLoading}
        />
        <Label htmlFor="isPublished">Published</Label>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : mode === 'create' ? 'Create' : 'Update'}
        </Button>
      </div>
    </form>
  );
};

export default function NewsPage() {
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNews, setEditingNews] = useState<News | null>(null);

  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    try {
      setLoading(true);
      const data = await getNews();
      setNews(data);
    } catch (error) {
      console.error('Error loading news:', error);
      toast.error('Failed to load news');
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

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this news?')) {
      try {
        await deleteNews(id);
        toast.success('News deleted successfully');
        loadNews();
      } catch (error) {
        console.error('Error deleting news:', error);
        toast.error('Failed to delete news');
      }
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">News Management</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>Add News</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingNews ? 'Edit News' : 'Add New News'}
              </DialogTitle>
              <DialogDescription>
                Fill in the news information below.
              </DialogDescription>
            </DialogHeader>

            <NewsForm
              mode={editingNews ? 'edit' : 'create'}
              newsId={editingNews?.id}
              onFormSubmitSuccess={handleSubmit}
              onCancel={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Content</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {news.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.title}</TableCell>
              <TableCell className="max-w-md truncate">{item.content}</TableCell>
              <TableCell>
                {item.isPublished ? (
                  <span className="text-green-600">Published</span>
                ) : (
                  <span className="text-yellow-600">Draft</span>
                )}
              </TableCell>
              <TableCell>
                {format(item.createdAt.toDate(), 'MMM dd, yyyy')}
              </TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(item)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(item.id)}
                  >
                    Delete
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 