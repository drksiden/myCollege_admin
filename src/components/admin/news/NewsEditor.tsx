// src/components/admin/news/NewsEditor.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Save, 
  Eye, 
  Plus, 
  X, 
  Image, 
  ArrowLeft,
  Loader2 
} from 'lucide-react';
import { toast } from 'sonner';
import * as newsService from '@/lib/firebaseService/newsService';
import { useAuth } from '@/contexts/AuthContext';
import type { News } from '@/types';

interface NewsEditorProps {
  mode?: 'create' | 'edit';
  newsId?: string | null;
  initialData?: News | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const NewsEditor: React.FC<NewsEditorProps> = ({ 
  mode = 'create', 
  newsId = null, 
  initialData = null, 
  onSuccess = () => {},
  onCancel = () => {}
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    isPublished: false,
    tags: [] as string[],
    images: [] as { url: string; alt?: string; order?: number }[]
  });
  const [newTag, setNewTag] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageAlt, setNewImageAlt] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [imageValidating, setImageValidating] = useState(false);

  const loadNewsData = useCallback(async () => {
    if (!newsId) return;
    
    setLoading(true);
    try {
      const news = await newsService.getNewsById(newsId);
      if (news) {
        setFormData({
          title: news.title || '',
          content: news.content || '',
          isPublished: news.isPublished || false,
          tags: news.tags || [],
          images: news.images || []
        });
      }
    } catch (error) {
      console.error('Error loading news:', error);
      toast.error('Не удалось загрузить данные новости');
    } finally {
      setLoading(false);
    }
  }, [newsId]);

  // Загрузка данных при редактировании
  useEffect(() => {
    if (mode === 'edit' && newsId && !initialData) {
      loadNewsData();
    } else if (initialData) {
      setFormData({
        title: initialData.title || '',
        content: initialData.content || '',
        isPublished: initialData.isPublished || false,
        tags: initialData.tags || [],
        images: initialData.images || []
      });
    }
  }, [mode, newsId, initialData, loadNewsData]);

  const handleInputChange = (field: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      handleInputChange('tags', [...formData.tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    handleInputChange('tags', formData.tags.filter(tag => tag !== tagToRemove));
  };

  const addImage = async () => {
    if (!newImageUrl.trim()) {
      toast.error('Введите URL изображения');
      return;
    }

    if (!newsService.validateImageUrl(newImageUrl.trim())) {
      toast.error('Введите корректный URL изображения');
      return;
    }

    setImageValidating(true);
    try {
      const isValidImage = await newsService.getImagePreview(newImageUrl.trim());
      if (!isValidImage) {
        toast.error('Не удалось загрузить изображение по указанному URL');
        return;
      }

      const newImage = {
        url: newImageUrl.trim(),
        alt: newImageAlt.trim() || undefined,
        order: formData.images.length
      };
      
      handleInputChange('images', [...formData.images, newImage]);
      setNewImageUrl('');
      setNewImageAlt('');
      toast.success('Изображение добавлено');
    } catch {
      toast.error('Ошибка при проверке изображения');
    } finally {
      setImageValidating(false);
    }
  };

  const removeImage = (indexToRemove: number) => {
    handleInputChange('images', formData.images.filter((_, index) => index !== indexToRemove));
  };

  const handleSave = async (publish = false) => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Заполните название и содержание новости');
      return;
    }

    if (!user) {
      toast.error('Необходимо войти в систему');
      return;
    }

    setSaving(true);
    try {
      const dataToSave: Omit<News, 'id' | 'createdAt' | 'updatedAt'> = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        isPublished: publish,
        tags: formData.tags,
        images: formData.images.map(img => ({
          url: img.url,
          alt: img.alt || undefined,
          order: img.order || 0
        })),
        authorId: user.uid
      };

      // Очищаем undefined значения
      const cleanData = Object.fromEntries(
        Object.entries(dataToSave).map(([key, value]) => [
          key,
          value === undefined ? null : value
        ])
      ) as Omit<News, 'id' | 'createdAt' | 'updatedAt'>;

      if (mode === 'create') {
        await newsService.createNews(cleanData);
        toast.success(publish ? 'Новость создана и опубликована' : 'Новость создана как черновик');
      } else if (newsId) {
        await newsService.updateNews(newsId, cleanData);
        toast.success(publish ? 'Новость обновлена и опубликована' : 'Новость обновлена');
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving news:', error);
      toast.error('Не удалось сохранить новость');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Загрузка...</span>
      </div>
    );
  }

  if (previewMode) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setPreviewMode(false)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Вернуться к редактированию
          </Button>
          <div className="flex items-center gap-2">
            <Badge variant={formData.isPublished ? "default" : "secondary"}>
              {formData.isPublished ? "Опубликовано" : "Черновик"}
            </Badge>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <h1 className="text-3xl font-bold mb-4">{formData.title}</h1>
            
            {formData.images.length > 0 && (
              <div className="mb-6">
                <div className="grid gap-4">
                  {formData.images.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={image.url}
                        alt={image.alt || 'Изображение'}
                        className="w-full h-64 object-cover rounded-lg"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="prose max-w-none">
              {formData.content.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-4">{paragraph}</p>
              ))}
            </div>

            {formData.tags.length > 0 && (
              <div className="mt-6 pt-4 border-t">
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          {mode === 'create' ? 'Создание новости' : 'Редактирование новости'}
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPreviewMode(true)}
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            Предпросмотр
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Основная информация */}
        <Card>
          <CardHeader>
            <CardTitle>Основная информация</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Заголовок новости</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Введите заголовок новости"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="content">Содержание</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => handleInputChange('content', e.target.value)}
                placeholder="Введите содержание новости"
                rows={8}
                className="mt-1"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="published"
                checked={formData.isPublished}
                onCheckedChange={(checked) => handleInputChange('isPublished', checked)}
              />
              <Label htmlFor="published">Опубликовать новость</Label>
            </div>
          </CardContent>
        </Card>

        {/* Изображения */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Изображения
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="imageUrl">URL изображения</Label>
                <Input
                  id="imageUrl"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="imageAlt">Описание изображения</Label>
                <Input
                  id="imageAlt"
                  value={newImageAlt}
                  onChange={(e) => setNewImageAlt(e.target.value)}
                  placeholder="Альтернативный текст"
                  className="mt-1"
                />
              </div>
            </div>
            <Button
              type="button"
              onClick={addImage}
              disabled={!newImageUrl.trim() || imageValidating}
              className="flex items-center gap-2"
            >
              {imageValidating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Добавить изображение
            </Button>

            {formData.images.length > 0 && (
              <div className="space-y-2">
                <Label>Добавленные изображения:</Label>
                {formData.images.map((image, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                    <img
                      src={image.url}
                      alt={image.alt || 'Изображение'}
                      className="w-16 h-16 object-cover rounded"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAyMEg0NEE0NEgyMFYyMFoiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+';
                      }}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium truncate">{image.alt || 'Изображение'}</p>
                      <p className="text-xs text-muted-foreground truncate">{image.url}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeImage(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Теги */}
        <Card>
          <CardHeader>
            <CardTitle>Теги</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Введите тег"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                className="flex-1"
              />
              <Button
                type="button"
                onClick={addTag}
                disabled={!newTag.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {tag}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Кнопки действий */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={saving}
        >
          Отмена
        </Button>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleSave(false)}
            disabled={saving}
            className="flex items-center gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Сохранить как черновик
          </Button>
          <Button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="flex items-center gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Опубликовать
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NewsEditor;