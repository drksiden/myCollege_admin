import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, MessageSquare, Users, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { collection, getDocs, addDoc, Timestamp, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ChatMessages from '@/components/chat/ChatMessages';
import { useAuth } from '@/hooks/useAuth';

interface User {
  uid: string;
  name: string;
  role: 'student' | 'teacher' | 'admin';
}

interface Chat {
  id: string;
  type: 'private' | 'group';
  name?: string;
  participantIds: string[];
  lastMessage?: string;
  lastMessageAt?: Timestamp;
  lastMessageSenderId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  unreadCount: number;
}

const ChatsPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<Chat[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [chatType, setChatType] = useState<'private' | 'group'>('private');
  const [chatName, setChatName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Получаем список чатов
        const chatsSnapshot = await getDocs(collection(db, 'chats'));
        const chatsData = chatsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Chat[];
        setChats(chatsData);

        // Получаем список пользователей
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersData = usersSnapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        })) as User[];
        setUsers(usersData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Не удалось загрузить данные');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleCreateChat = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Выберите участников чата');
      return;
    }

    if (chatType === 'group' && !chatName) {
      toast.error('Введите название группы');
      return;
    }

    setIsCreating(true);

    try {
      const now = Timestamp.now();
      const chatData = {
        type: chatType,
        participantIds: selectedUsers,
        createdAt: now,
        updatedAt: now,
        unreadCount: 0,
        ...(chatType === 'group' && { name: chatName })
      };

      const docRef = await addDoc(collection(db, 'chats'), chatData);
      toast.success('Чат успешно создан');
      
      // Обновляем список чатов
      setChats(prev => [...prev, { id: docRef.id, ...chatData } as Chat]);
      
      // Сбрасываем форму
      setSelectedUsers([]);
      setChatType('private');
      setChatName('');
    } catch (error) {
      console.error('Error creating chat:', error);
      toast.error('Не удалось создать чат');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      // Удаляем чат
      await deleteDoc(doc(db, 'chats', chatId));
      
      // Обновляем список чатов
      setChats(prev => prev.filter(chat => chat.id !== chatId));
      
      // Если удаляемый чат был выбран, сбрасываем выбор
      if (selectedChat?.id === chatId) {
        setSelectedChat(null);
      }
      
      toast.success('Чат успешно удален');
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast.error('Не удалось удалить чат');
    }
  };

  const pageVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0, transition: { duration: 0.3 } },
  };

  if (loading) {
    return (
      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="flex flex-col gap-6"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Управление чатами
          </h1>
        </div>

        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="h-6 w-6 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-7 w-2/5 mb-2" />
                <Skeleton className="h-3 w-4/5" />
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          Управление чатами
        </h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Создать чат
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Создание нового чата</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="chatType">Тип чата</Label>
                <Select
                  value={chatType}
                  onValueChange={(value: 'private' | 'group') => setChatType(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите тип чата" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Приватный чат</SelectItem>
                    <SelectItem value="group">Групповой чат</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {chatType === 'group' && (
                <div className="grid gap-2">
                  <Label htmlFor="chatName">Название группы</Label>
                  <Input
                    id="chatName"
                    value={chatName}
                    onChange={(e) => setChatName(e.target.value)}
                    placeholder="Введите название группы"
                  />
                </div>
              )}

              <div className="grid gap-2">
                <Label>Участники</Label>
                <Select
                  value=""
                  onValueChange={(value) => {
                    if (!selectedUsers.includes(value)) {
                      setSelectedUsers([...selectedUsers, value]);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите участников" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.uid} value={user.uid}>
                        {user.name} ({user.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedUsers.length > 0 && (
                <div className="grid gap-2">
                  <Label>Выбранные участники</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map((uid) => {
                      const user = users.find((u) => u.uid === uid);
                      return (
                        <div
                          key={uid}
                          className="flex items-center gap-2 bg-secondary px-2 py-1 rounded-md"
                        >
                          <span>{user?.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedUsers(selectedUsers.filter(id => id !== uid))}
                          >
                            ×
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <Button
                onClick={handleCreateChat}
                disabled={isCreating || selectedUsers.length === 0 || (chatType === 'group' && !chatName)}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Создание...
                  </>
                ) : (
                  'Создать чат'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          {chats.map((chat) => (
            <Card
              key={chat.id}
              className={`cursor-pointer transition-colors ${
                selectedChat?.id === chat.id ? 'border-primary' : ''
              }`}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle 
                  className="text-sm font-medium cursor-pointer"
                  onClick={() => setSelectedChat(chat)}
                >
                  {chat.type === 'group' ? chat.name : 'Приватный чат'}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {chat.type === 'group' ? (
                    <Users className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Удаление чата</DialogTitle>
                        <DialogDescription>
                          Вы уверены, что хотите удалить этот чат? Это действие нельзя отменить.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button
                          variant="destructive"
                          onClick={() => handleDeleteChat(chat.id)}
                        >
                          Удалить
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent onClick={() => setSelectedChat(chat)}>
                <div className="text-sm text-muted-foreground">
                  Участники: {chat.participantIds.length}
                </div>
                {chat.lastMessage && (
                  <div className="text-sm text-muted-foreground mt-2">
                    Последнее сообщение: {chat.lastMessage}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="border rounded-lg">
          {selectedChat ? (
            <ChatMessages
              chatId={selectedChat.id}
              currentUserId={user?.uid || ''}
            />
          ) : (
            <div className="flex items-center justify-center h-[600px] text-muted-foreground">
              Выберите чат для просмотра сообщений
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ChatsPage; 