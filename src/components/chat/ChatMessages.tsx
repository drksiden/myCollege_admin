import React, { useEffect, useState } from 'react';
import { collection, addDoc, Timestamp, query, orderBy, limit, doc, updateDoc, onSnapshot, arrayUnion, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, Check, CheckCheck, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  sentAt: Timestamp;
  readBy: string[];
}

interface ChatMessagesProps {
  chatId: string;
  currentUserId: string;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({ chatId, currentUserId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);

  useEffect(() => {
    const messagesQuery = query(
      collection(db, `chats/${chatId}/messages`),
      orderBy('sentAt', 'desc'),
      limit(50)
    );

    // Подписываемся на обновления сообщений
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      
      setMessages(messagesData.reverse());
      setLoading(false);

      // Отмечаем сообщения как прочитанные
      const unreadMessages = messagesData.filter(
        message => !message.readBy.includes(currentUserId)
      );

      if (unreadMessages.length > 0) {
        const batch = unreadMessages.map(message => {
          const messageRef = doc(db, `chats/${chatId}/messages`, message.id);
          return updateDoc(messageRef, {
            readBy: arrayUnion(currentUserId)
          });
        });

        Promise.all(batch).catch(error => {
          console.error('Error marking messages as read:', error);
        });
      }
    }, (error) => {
      console.error('Error in messages subscription:', error);
      toast.error('Ошибка при получении сообщений');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [chatId, currentUserId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setSending(true);

    try {
      const messageData = {
        chatId,
        senderId: currentUserId,
        text: newMessage.trim(),
        sentAt: Timestamp.now(),
        readBy: [currentUserId]
      };

      // Добавляем сообщение
      await addDoc(collection(db, `chats/${chatId}/messages`), messageData);
      
      // Обновляем информацию о чате
      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        lastMessage: messageData.text,
        lastMessageAt: messageData.sentAt,
        lastMessageSenderId: currentUserId,
        unreadCount: 0 // Сбрасываем счетчик непрочитанных, так как отправитель уже прочитал
      });
      
      // Очищаем поле ввода
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Не удалось отправить сообщение');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (message: Message) => {
    try {
      await deleteDoc(doc(db, `chats/${chatId}/messages`, message.id));
      
      // Если это было последнее сообщение, обновляем информацию о чате
      if (messages[messages.length - 1].id === message.id) {
        const chatRef = doc(db, 'chats', chatId);
        const previousMessage = messages[messages.length - 2];
        
        if (previousMessage) {
          await updateDoc(chatRef, {
            lastMessage: previousMessage.text,
            lastMessageAt: previousMessage.sentAt,
            lastMessageSenderId: previousMessage.senderId,
          });
        } else {
          await updateDoc(chatRef, {
            lastMessage: null,
            lastMessageAt: null,
            lastMessageSenderId: null,
          });
        }
      }
      
      toast.success('Сообщение удалено');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Не удалось удалить сообщение');
    } finally {
      setMessageToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px]">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.senderId === currentUserId ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[70%] rounded-lg px-4 py-2 ${
                  message.senderId === currentUserId
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm">{message.text}</div>
                  {message.senderId === currentUserId && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 -mt-1 -mr-2"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setMessageToDelete(message)}
                        >
                          Удалить сообщение
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs opacity-70 mt-1">
                  <span>{format(message.sentAt.toDate(), 'HH:mm', { locale: ru })}</span>
                  {message.senderId === currentUserId && (
                    <span className="ml-1">
                      {message.readBy.length > 1 ? (
                        <CheckCheck className="h-3 w-3" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Введите сообщение..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <Button
            onClick={handleSendMessage}
            disabled={sending || !newMessage.trim()}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <Dialog open={!!messageToDelete} onOpenChange={() => setMessageToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удаление сообщения</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить это сообщение? Это действие нельзя отменить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={() => messageToDelete && handleDeleteMessage(messageToDelete)}
            >
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatMessages; 