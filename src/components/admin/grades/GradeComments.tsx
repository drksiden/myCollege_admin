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
      toast.error('Failed to load comments');
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
        gradeId,
        userId: user.uid,
        content: newComment.trim(),
      });
      setNewComment('');
      await loadComments();
      toast.success('Comment added successfully');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(commentId);
      await loadComments();
      toast.success('Comment deleted successfully');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  const handleEditComment = async (commentId: string) => {
    const comment = comments.find(c => c.id === commentId);
    if (comment) {
      setEditingCommentId(commentId);
      setEditingContent(comment.content);
    }
  };

  const handleSaveEdit = async (commentId: string) => {
    try {
      await updateComment(commentId, { content: editingContent.trim() });
      await loadComments();
      setEditingCommentId(null);
      setEditingContent('');
      toast.success('Comment updated successfully');
    } catch (error) {
      console.error('Error updating comment:', error);
      toast.error('Failed to update comment');
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
        <h3 className="font-medium">Comments</h3>
      </div>

      <div className="space-y-2">
        <Textarea
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          disabled={loading}
        />
        <Button
          onClick={handleAddComment}
          disabled={!newComment.trim() || loading}
        >
          Add Comment
        </Button>
      </div>

      <ScrollArea className="h-[200px]">
        {comments.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">
            No comments yet
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
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelEdit}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm">{comment.content}</p>
                      {user?.uid === comment.userId && (
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
                  {format(comment.createdAt.toDate(), 'MMM dd, yyyy HH:mm')}
                  {comment.updatedAt && comment.updatedAt.toDate() > comment.createdAt.toDate() && (
                    <span className="ml-2">(edited)</span>
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