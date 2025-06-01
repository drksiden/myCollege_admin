import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { createNews, updateNews, uploadNewsImage, deleteNewsImage } from '@/lib/firebaseService/newsService';
import type { News } from '@/types';
import { X, ImagePlus, Tag } from 'lucide-react';
import { useAuth } from '@/lib/auth';

interface NewsEditorProps {
  mode: 'create' | 'edit';
  newsId?: string;
  initialData?: News | null;
  onSuccess: () => void;
}

export default function NewsEditor({ mode, newsId, initialData, onSuccess }: NewsEditorProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [images, setImages] = useState<{ url: string; alt?: string }[]>(initialData?.images || []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      setError(null);
      const imageData = await uploadNewsImage(file, newsId || 'new', images.length);
      setImages([...images, { url: imageData.url, alt: imageData.alt }]);
      toast.success('Изображение успешно загружено');
    } catch (error) {
      console.error('Error uploading image:', error);
      setError('Ошибка при загрузке изображения');
      toast.error('Ошибка при загрузке изображения');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveImage = async (imageUrl: string) => {
    try {
      setIsLoading(true);
      setError(null);
      await deleteNewsImage(imageUrl);
      setImages(images.filter(img => img.url !== imageUrl));
      toast.success('Изображение успешно удалено');
    } catch (error) {
      console.error('Error deleting image:', error);
      setError('Ошибка при удалении изображения');
      toast.error('Ошибка при удалении изображения');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Пожалуйста, заполните все обязательные поля');
      return;
    }

    if (!user?.uid) {
      setError('Пользователь не авторизован');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const newsData = {
        title: title.trim(),
        content: content.trim(),
        tags: tags,
        images: images,
        isPublished: false,
        authorId: user.uid,
      };

      if (mode === 'create') {
        await createNews(newsData);
        toast.success('Новость успешно создана');
      } else if (mode === 'edit' && newsId) {
        await updateNews(newsId, newsData);
        toast.success('Новость успешно обновлена');
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving news:', error);
      setError('Ошибка при сохранении новости');
      toast.error('Ошибка при сохранении новости');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-destructive/10 text-destructive rounded-md">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">Заголовок</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Введите заголовок новости"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Содержание</Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Введите содержание новости"
          className="min-h-[200px]"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Теги</Label>
        <div className="flex gap-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Добавить тег"
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
          />
          <Button type="button" onClick={handleAddTag} disabled={isLoading}>
            <Tag className="h-4 w-4 mr-2" />
            Добавить
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {tags.map((tag) => (
            <div
              key={tag}
              className="flex items-center gap-1 bg-secondary px-2 py-1 rounded-md"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Изображения</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((image, index) => (
            <div key={index} className="relative group">
              <img
                src={image.url}
                alt={image.alt || `Изображение ${index + 1}`}
                className="w-full h-32 object-cover rounded-md"
              />
              <button
                type="button"
                onClick={() => handleRemoveImage(image.url)}
                className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={isLoading}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <label className="flex items-center justify-center h-32 border-2 border-dashed rounded-md cursor-pointer hover:bg-accent/50 transition-colors">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={isLoading}
            />
            <ImagePlus className="h-8 w-8 text-muted-foreground" />
          </label>
        </div>
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Сохранение...' : mode === 'create' ? 'Создать новость' : 'Сохранить изменения'}
      </Button>
    </form>
  );
} 