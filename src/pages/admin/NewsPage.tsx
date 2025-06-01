import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';
import NewsEditor from '@/components/admin/news/NewsEditor';
import NewsList from '@/components/admin/news/NewsList';
import type { News } from '@/types';

const NewsPage = () => {
  const [selectedNews, setSelectedNews] = useState<News | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const handleCreateNews = () => {
    setSelectedNews(null);
    setIsEditorOpen(true);
  };

  const handleEditNews = (news: News) => {
    setSelectedNews(news);
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setSelectedNews(null);
    setIsEditorOpen(false);
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
            news={selectedNews}
            onClose={handleCloseEditor} 
          />
        )}
        {!isEditorOpen && (
          <NewsList 
            news={[]} 
            onEditNews={handleEditNews} 
            onNewsUpdate={() => {}} 
          />
        )}
      </Card>
    </div>
  );
};

export default NewsPage; 