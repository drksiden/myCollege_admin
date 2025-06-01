import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';
import NewsEditor from '@/components/admin/news/NewsEditor'; // Assuming NewsEditor is in this path
import NewsList from '@/components/admin/news/NewsList';
import type { News } from '@/types';
import { getNews } from '@/lib/firebaseService/newsService'; // Import service to fetch news
import { toast } from 'sonner'; // For notifications

const NewsPage = () => {
  const [selectedNews, setSelectedNews] = useState<News | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [newsItems, setNewsItems] = useState<News[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadNews = async () => {
    setIsLoading(true);
    try {
      const fetchedNews = await getNews({}); // Fetch all news
      setNewsItems(fetchedNews);
    } catch (error) {
      console.error("Failed to load news:", error);
      toast.error("Не удалось загрузить новости");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isEditorOpen) { // Load news when editor is not open, or initially
        loadNews();
    }
  }, [isEditorOpen]);
  const handleCreateNews = () => {
    setSelectedNews(null);
    setIsEditorOpen(true);
  };

  const handleEditNews = (news: News) => {
    setSelectedNews(news);
    setIsEditorOpen(true);
  };

  const handleEditorSuccess = () => {
    setSelectedNews(null);
    setIsEditorOpen(false);
    loadNews(); // Reload news after editor closes
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Управление новостями</h1>
        <Button 
          onClick={handleCreateNews}
          className="flex items-center gap-2"
        >
          <PlusCircle className="h-4 w-4" />
          Создать новость
        </Button>
      </div>

      <Card>
        {isEditorOpen && (
          <NewsEditor 
            mode={selectedNews ? 'edit' : 'create'}
            newsId={selectedNews?.id}
            initialData={selectedNews}
            onSuccess={handleEditorSuccess}
          />
        )}
        {!isEditorOpen &&
          (isLoading ? (
            <div className="flex justify-center items-center p-10">
              <p>Загрузка новостей...</p> {/* Or a spinner component */}
            </div>
          ) : (
            <NewsList
              news={newsItems}
              onEditNews={handleEditNews}
              onNewsUpdate={loadNews}
            />
          ))}
      </Card>
    </div>
  );
};

export default NewsPage; 