import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { getNews, deleteNews, publishNews, unpublishNews } from '@/lib/firebaseService/newsService';
import type { News } from '@/types/index';
import { Eye, EyeOff, Pencil, Trash2 } from 'lucide-react';

interface NewsListProps {
  onEditNews: (news: News) => void;
}

export default function NewsList({ onEditNews }: NewsListProps) {
  const [news, setNews] = useState<News[]>([]);
  const [filter, setFilter] = useState({
    search: '',
    status: 'all',
  });

  useEffect(() => {
    loadNews();
  }, [filter.status]);

  const loadNews = async () => {
    try {
      const newsData = await getNews({
        publishedOnly: filter.status === 'published',
      });
      setNews(newsData);
    } catch (error) {
      console.error('Error loading news:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Вы уверены, что хотите удалить эту новость?')) {
      try {
        await deleteNews(id);
        await loadNews();
      } catch (error) {
        console.error('Error deleting news:', error);
      }
    }
  };

  const handleTogglePublish = async (news: News) => {
    try {
      if (news.isPublished) {
        await unpublishNews(news.id);
      } else {
        await publishNews(news.id);
      }
      await loadNews();
    } catch (error) {
      console.error('Error toggling news status:', error);
    }
  };

  const filteredNews = news.filter(item =>
    item.title.toLowerCase().includes(filter.search.toLowerCase()) ||
    item.content.toLowerCase().includes(filter.search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Input
          placeholder="Поиск..."
          value={filter.search}
          onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          className="max-w-sm"
        />
        <Select
          value={filter.status}
          onValueChange={(value) => setFilter({ ...filter, status: value })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="published">Опубликованные</SelectItem>
            <SelectItem value="draft">Черновики</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNews.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              {item.images?.[0] && (
                <div className="relative h-48">
                  <img
                    src={item.images[0].url}
                    alt={item.images[0].alt || item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CardHeader>
                <CardTitle className="line-clamp-2">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {item.content}
                  </p>
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {item.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      {format(item.createdAt.toDate(), 'd MMMM yyyy', { locale: ru })}
                    </span>
                    <div className="flex gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleTogglePublish(item)}
                            >
                              {item.isPublished ? (
                                <Eye className="h-4 w-4" />
                              ) : (
                                <EyeOff className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {item.isPublished ? 'Снять с публикации' : 'Опубликовать'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onEditNews(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Редактировать</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(item.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Удалить</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
} 