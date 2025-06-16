import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { MessageSquare, Trash2, Edit2, Check, X } from 'lucide-react';
import { createComment, getComments, deleteComment, updateComment } from '@/lib/firebaseService/commentService';
import type { Comment } from '@/types';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

interface GradeCommentsProps {
  gradeId: string;
}

export default function GradeComments({ gradeId }: GradeCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const { user } = useAuth();

  const loadComments = useCallback(async () => {
    try {
      const data = await getComments(gradeId);
      setComments(data);
    } catch (error) {
      console.error('Error loading comments:', error);
      toast.error('Не удалось загрузить комментарии');
    }
  }, [gradeId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleAddComment = async () => {
    if (!user || !newComment.trim()) return;

    try {
      setLoading(true);
      await createComment({
        parentId: gradeId,
        parentType: 'grade',
        authorId: user.uid,
        text: newComment.trim(),
      });
      setNewComment('');
      await loadComments();
      toast.success('Комментарий успешно добавлен');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Не удалось добавить комментарий');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(commentId);
      await loadComments();
      toast.success('Комментарий успешно удален');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Не удалось удалить комментарий');
    }
  };

  const handleEditComment = async (commentId: string) => {
    const comment = comments.find(c => c.id === commentId);
    if (comment) {
      setEditingCommentId(commentId);
      setEditingContent(comment.text);
    }
  };

  const handleSaveEdit = async (commentId: string) => {
    try {
      await updateComment(commentId, { 
        text: editingContent.trim()
      });
      await loadComments();
      setEditingCommentId(null);
      setEditingContent('');
      toast.success('Комментарий успешно обновлен');
    } catch (error) {
      console.error('Error updating comment:', error);
      toast.error('Не удалось обновить комментарий');
    }
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingContent('');
  };

  if (!user) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <MessageSquare className="h-5 w-5" />
        <h3 className="font-medium">Комментарии</h3>
      </div>

      <div className="space-y-2">
        <Textarea
          placeholder="Добавить комментарий..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          disabled={loading}
        />
        <Button
          onClick={handleAddComment}
          disabled={!newComment.trim() || loading}
        >
          Добавить комментарий
        </Button>
      </div>

      <ScrollArea className="h-[200px]">
        {comments.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">
            Пока нет комментариев
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="bg-muted/50 rounded-lg p-4 space-y-2"
              >
                <div className="flex items-start justify-between">
                  {editingCommentId === comment.id ? (
                    <div className="flex-1 space-y-2">
                      <Textarea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        className="min-h-[100px]"
                      />
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => handleSaveEdit(comment.id)}
                          disabled={!editingContent.trim()}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Сохранить
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelEdit}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Отмена
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm">{comment.text}</p>
                      {user?.uid === comment.authorId && (
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditComment(comment.id)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteComment(comment.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(comment.createdAt.toDate(), 'dd.MM.yyyy HH:mm')}
                  {comment.updatedAt && comment.updatedAt.toDate() > comment.createdAt.toDate() && (
                    <span className="ml-2">(изменено)</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
} 