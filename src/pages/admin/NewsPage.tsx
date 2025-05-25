import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import NewsList from '@/components/admin/news/NewsList';
import NewsEditor from '@/components/admin/news/NewsEditor';
import type { News } from '@/types/index';

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