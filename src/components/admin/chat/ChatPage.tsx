import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { createChat, deleteChat, sendMessage, subscribeToChatMessages, subscribeToUserChats, createGroupChat, sendMassMessage } from '@/lib/firebaseService/chatService';
import { getUsers, getUserById } from '@/lib/firebaseService/userService';
import type { Chat, Message, AppUser } from '@/types';
import { toast } from 'sonner';
import { format, isToday, isYesterday } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useAuth } from '@/lib/auth';
import { Trash2, Send, Users, MessageSquare, Megaphone, User, Circle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { notificationService } from '@/lib/firebaseService/notificationService';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getDocs, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function ChatPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isNewChatDialogOpen, setIsNewChatDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [activeTab, setActiveTab] = useState('direct');
  const [chatParticipants, setChatParticipants] = useState<Map<string, AppUser>>(new Map());
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadUsers();
      const unsubscribe = subscribeToUserChats(user.uid, (updatedChats) => {
        // Сортируем чаты по времени последнего сообщения
        const sortedChats = [...updatedChats].sort((a, b) => {
          if (!a.lastMessageTime || !b.lastMessageTime) return 0;
          return b.lastMessageTime.toDate().getTime() - a.lastMessageTime.toDate().getTime();
        });
        setChats(sortedChats);
      });
      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    if (selectedChat) {
      const unsubscribe = subscribeToChatMessages(selectedChat.id, (updatedMessages) => {
        setMessages(updatedMessages);
      });
      return () => unsubscribe();
    }
  }, [selectedChat]);

  // Загружаем информацию о пользователях для чатов
  useEffect(() => {
    const loadChatParticipants = async () => {
      const newParticipants = new Map<string, AppUser>();
      for (const chat of chats) {
        if (chat.type === 'private') {
          const participantId = chat.participantIds.find(id => id !== user?.uid);
          if (participantId && !newParticipants.has(participantId)) {
            try {
              const participant = await getUserById(participantId);
              if (participant) {
                newParticipants.set(participantId, participant);
              }
            } catch (error) {
              console.error('Error loading participant:', error);
            }
          }
        }
      }
      setChatParticipants(newParticipants);
    };

    loadChatParticipants();
  }, [chats, user?.uid]);

  useEffect(() => {
    // Initialize notifications
    const initializeNotifications = async () => {
      try {
        await notificationService.requestPermission();
        notificationService.onMessageListener().then((payload: unknown) => {
          console.log('Received foreground message:', payload);
          // Можно показать уведомление через toast или другое UI
          toast.info('Новое сообщение');
        });
      } catch (error) {
        console.error('Failed to initialize notifications:', error);
      }
    };

    initializeNotifications();
  }, []);

  const loadUsers = async () => {
    try {
      // Прямой запрос к коллекции users
      const snapshot = await getDocs(collection(db, 'users'));
      const allUsers = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data(),
      }));
      console.log('Все пользователи из Firestore:', allUsers);

      // Проверка структуры
      allUsers.forEach(u => {
        if (!u.firstName || !u.lastName || !u.uid) {
          console.warn('Пользователь с некорректной структурой:', u);
        }
      });

      // Исключаем текущего пользователя
      const filteredUsers = allUsers.filter(u => u.uid !== user?.uid);
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Ошибка при загрузке пользователей:', error);
      toast.error('Failed to load users');
    }
  };

  const handleCreateDirectChat = async () => {
    if (!user || !selectedUser) return;

    try {
      await createChat([user.uid, selectedUser], 'private');
      setIsNewChatDialogOpen(false);
      setSelectedUser('');
      toast.success('Чат успешно создан');
    } catch (error) {
      console.error('Ошибка при создании чата:', error);
      toast.error('Не удалось создать чат');
    }
  };

  const handleCreateGroupChat = async () => {
    if (!user || selectedUsers.length === 0 || !groupName) return;

    try {
      await createGroupChat(groupName, [user.uid, ...selectedUsers]);
      setIsNewChatDialogOpen(false);
      setSelectedUsers([]);
      setGroupName('');
      toast.success('Групповой чат успешно создан');
    } catch (error) {
      console.error('Ошибка при создании группового чата:', error);
      toast.error('Не удалось создать групповой чат');
    }
  };

  const handleSendMassMessage = async () => {
    if (!user || selectedUsers.length === 0 || !newMessage.trim()) return;

    try {
      await sendMassMessage(user.uid, newMessage.trim(), selectedUsers);
      setNewMessage('');
      toast.success('Массовое сообщение успешно отправлено');
    } catch (error) {
      console.error('Ошибка при отправке массового сообщения:', error);
      toast.error('Не удалось отправить массовое сообщение');
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      await deleteChat(chatId);
      setSelectedChat(null);
      setMessages([]);
    } catch {
      toast.error('Ошибка при удалении чата');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedChat || !newMessage.trim()) return;

    try {
      await sendMessage(selectedChat.id, user.uid, newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Ошибка при отправке сообщения:', error);
      toast.error('Не удалось отправить сообщение');
    }
  };

  const getChatParticipant = (chat: Chat) => {
    if (!user) return null;
    if (chat.type === 'group') {
      return { firstName: chat.name, lastName: '' };
    }
    const participantId = chat.participantIds.find(id => id !== user.uid);
    return participantId ? chatParticipants.get(participantId) : null;
  };

  const formatLastMessageTime = (date: Date | undefined) => {
    if (!date) return '';
    if (isToday(date)) {
      return format(date, 'HH:mm');
    }
    if (isYesterday(date)) {
      return 'Вчера';
    }
    return format(date, 'dd.MM.yyyy');
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  const renderNewChatDialog = () => (
    <Dialog open={isNewChatDialogOpen} onOpenChange={setIsNewChatDialogOpen}>
      <DialogTrigger asChild>
        <Button>Новый чат</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Создать новый чат</DialogTitle>
          <DialogDescription>
            Выберите тип чата, который хотите создать.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="direct">
              <MessageSquare className="w-4 h-4 mr-2" />
              Личный
            </TabsTrigger>
            <TabsTrigger value="group">
              <Users className="w-4 h-4 mr-2" />
              Групповой
            </TabsTrigger>
            <TabsTrigger value="broadcast">
              <Megaphone className="w-4 h-4 mr-2" />
              Рассылка
            </TabsTrigger>
          </TabsList>

          <TabsContent value="direct" className="space-y-4">
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">Выберите пользователя</option>
              {users.map((u) => (
                <option key={u.uid} value={u.uid}>
                  {u.firstName} {u.lastName} ({u.role === 'student' ? 'Студент' : u.role === 'teacher' ? 'Преподаватель' : 'Администратор'})
                </option>
              ))}
            </select>

            <Button onClick={handleCreateDirectChat}>
              Начать чат
            </Button>
          </TabsContent>

          <TabsContent value="group" className="space-y-4">
            <Input
              placeholder="Название группы"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.uid} className="flex items-center space-x-2">
                  <Checkbox
                    id={u.uid}
                    checked={selectedUsers.includes(u.uid)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedUsers([...selectedUsers, u.uid]);
                      } else {
                        setSelectedUsers(selectedUsers.filter(id => id !== u.uid));
                      }
                    }}
                  />
                  <label htmlFor={u.uid}>
                    {u.firstName} {u.lastName} ({u.role === 'student' ? 'Студент' : u.role === 'teacher' ? 'Преподаватель' : 'Администратор'})
                  </label>
                </div>
              ))}
            </div>
            <Button onClick={handleCreateGroupChat}>
              Создать групповой чат
            </Button>
          </TabsContent>

          <TabsContent value="broadcast" className="space-y-4">
            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.uid} className="flex items-center space-x-2">
                  <Checkbox
                    id={u.uid}
                    checked={selectedUsers.includes(u.uid)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedUsers([...selectedUsers, u.uid]);
                      } else {
                        setSelectedUsers(selectedUsers.filter(id => id !== u.uid));
                      }
                    }}
                  />
                  <label htmlFor={u.uid}>
                    {u.firstName} {u.lastName} ({u.role === 'student' ? 'Студент' : u.role === 'teacher' ? 'Преподаватель' : 'Администратор'})
                  </label>
                </div>
              ))}
            </div>
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Введите сообщение для рассылки..."
            />
            <Button onClick={handleSendMassMessage}>
              Отправить рассылку
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Чаты</h1>
        {renderNewChatDialog()}
      </div>

      <div className="grid grid-cols-12 gap-4 h-[600px]">
        <div className="col-span-4 border rounded-lg">
          <ScrollArea className="h-full">
            {chats.map((chat) => {
              const participant = getChatParticipant(chat);
              return (
                <div
                  key={chat.id}
                  className={cn(
                    "p-4 border-b cursor-pointer hover:bg-accent transition-colors",
                    selectedChat?.id === chat.id && "bg-accent"
                  )}
                  onClick={() => setSelectedChat(chat)}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex gap-3 flex-1 min-w-0">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={participant?.photoURL} />
                        <AvatarFallback>
                          {chat.type === 'group' ? (
                            <Users className="h-4 w-4" />
                          ) : (
                            getInitials(participant?.firstName || '', participant?.lastName || '')
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {chat.type === 'group' ? (
                            <span className="flex items-center">
                              <Users className="w-4 h-4 mr-2" />
                              {chat.name}
                            </span>
                          ) : (
                            <span className="flex items-center">
                              {participant?.firstName} {participant?.lastName}
                              {participant?.isOnline && (
                                <Circle className="w-2 h-2 ml-2 text-green-500 fill-current" />
                              )}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {chat.lastMessageText || 'Нет сообщений'}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="text-xs text-muted-foreground">
                        {formatLastMessageTime(chat.lastMessageTime?.toDate())}
                      </div>
                      {chat.unreadCount > 0 && (
                        <Badge variant="secondary" className="h-5">
                          {chat.unreadCount}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteChat(chat.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </ScrollArea>
        </div>

        <div className="col-span-8 border rounded-lg flex flex-col">
          {selectedChat ? (
            <>
              <div className="p-4 border-b">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={getChatParticipant(selectedChat)?.photoURL} />
                    <AvatarFallback>
                      {selectedChat.type === 'group' ? (
                        <Users className="h-4 w-4" />
                      ) : (
                        getInitials(
                          getChatParticipant(selectedChat)?.firstName || '',
                          getChatParticipant(selectedChat)?.lastName || ''
                        )
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">
                      {selectedChat.type === 'group' ? (
                        <span className="flex items-center">
                          <Users className="w-4 h-4 mr-2" />
                          {selectedChat.name}
                        </span>
                      ) : (
                        <span className="flex items-center">
                          {getChatParticipant(selectedChat)?.firstName} {getChatParticipant(selectedChat)?.lastName}
                          {getChatParticipant(selectedChat)?.isOnline && (
                            <Circle className="w-2 h-2 ml-2 text-green-500 fill-current" />
                          )}
                        </span>
                      )}
                    </div>
                    {selectedChat.type === 'private' && (
                      <div className="text-sm text-muted-foreground">
                        {getChatParticipant(selectedChat)?.role === 'student' ? 'Студент' : 
                         getChatParticipant(selectedChat)?.role === 'teacher' ? 'Преподаватель' : 'Администратор'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message, index) => {
                    const showAvatar = index === 0 || messages[index - 1]?.senderId !== message.senderId;
                    const isCurrentUser = message.senderId === user?.uid;
                    return (
                      <div
                        key={message.id}
                        className={cn(
                          "flex gap-2",
                          isCurrentUser ? "justify-end" : "justify-start"
                        )}
                      >
                        {!isCurrentUser && showAvatar && (
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={chatParticipants.get(message.senderId)?.photoURL} />
                            <AvatarFallback>
                              {getInitials(
                                chatParticipants.get(message.senderId)?.firstName || '',
                                chatParticipants.get(message.senderId)?.lastName || ''
                              )}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className={cn(
                          "flex flex-col gap-1",
                          isCurrentUser ? "items-end" : "items-start"
                        )}>
                          {!isCurrentUser && showAvatar && (
                            <div className="text-sm font-medium">
                              {chatParticipants.get(message.senderId)?.firstName} {chatParticipants.get(message.senderId)?.lastName}
                            </div>
                          )}
                          <div
                            className={cn(
                              "rounded-lg p-3 max-w-[70%]",
                              isCurrentUser
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            )}
                          >
                            <div className="text-sm whitespace-pre-wrap">{message.text}</div>
                            <div className="text-xs opacity-70 mt-1">
                              {format(message.createdAt.toDate(), 'HH:mm')}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              <div className="p-4 border-t">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Введите сообщение..."
                    className="flex-1"
                  />
                  <Button type="submit" disabled={!newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Выберите чат, чтобы начать общение
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 