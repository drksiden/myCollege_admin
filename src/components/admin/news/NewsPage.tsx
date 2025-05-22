import { useState, useEffect } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { createNews, getNews, updateNews, deleteNews } from '@/lib/firebaseService/newsService';
import type { News } from '@/types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth';

export default function NewsPage() {
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNews, setEditingNews] = useState<News | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const { user } = useAuth();

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
    if (!user) return;

    try {
      const newsData = {
        title,
        content,
        imageUrl: imageUrl || undefined,
        authorId: user.uid,
        isPublished,
      };

      if (editingNews) {
        await updateNews(editingNews.id, newsData);
        toast.success('News updated successfully');
        if (newsData.isPublished) {
          toast.info('Published news! Users will be notified shortly.');
        }
      } else {
        await createNews(newsData);
        toast.success('News created successfully');
        if (newsData.isPublished) {
          toast.info('Published news! Users will be notified shortly.');
        }
      }

      setIsDialogOpen(false);
      setEditingNews(null);
      resetForm();
      loadNews();
    } catch (error) {
      console.error('Error saving news:', error);
      toast.error('Failed to save news');
    }
  };

  const handleEdit = (news: News) => {
    setEditingNews(news);
    setTitle(news.title);
    setContent(news.content);
    setImageUrl(news.imageUrl || '');
    setIsPublished(news.isPublished);
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

  const resetForm = () => {
    setTitle('');
    setContent('');
    setImageUrl('');
    setIsPublished(false);
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

            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[200px]"
                />
              </div>

              <div>
                <Label htmlFor="imageUrl">Image URL (optional)</Label>
                <Input
                  id="imageUrl"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="published"
                  checked={isPublished}
                  onCheckedChange={setIsPublished}
                />
                <Label htmlFor="published">Published</Label>
              </div>

              <Button onClick={handleSubmit}>
                {editingNews ? 'Update' : 'Create'}
              </Button>
            </div>
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
          {!loading && news.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                <h3 className="text-xl font-semibold">No news articles yet</h3>
                <p className="text-muted-foreground">
                  Click the "Add News" button to create the first article.
                </p>
              </TableCell>
            </TableRow>
          ) : (
            news.map((item) => (
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