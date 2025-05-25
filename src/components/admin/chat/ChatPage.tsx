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
import { createChat, deleteChat, sendMessage, deleteMessage, subscribeToChatMessages, subscribeToUserChats, createGroupChat, sendMassMessage } from '@/lib/firebaseService/chatService';
import { getUsers } from '@/lib/firebaseService/userService';
import type { Chat, Message, User } from '@/types';
import { ChatType } from '@/types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth';
import { Trash2, Send, Users, MessageSquare, Megaphone } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';

export default function ChatPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isNewChatDialogOpen, setIsNewChatDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [activeTab, setActiveTab] = useState('direct');
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadUsers();
      const unsubscribe = subscribeToUserChats(user.uid, (updatedChats) => {
        setChats(updatedChats);
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

  const loadUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    }
  };

  const handleCreateDirectChat = async () => {
    if (!user || !selectedUser) return;

    try {
      await createChat([user.uid, selectedUser], ChatType.DIRECT);
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
    if (window.confirm('Вы уверены, что хотите удалить этот чат?')) {
      try {
        await deleteChat(chatId);
        if (selectedChat?.id === chatId) {
          setSelectedChat(null);
          setMessages([]);
        }
        toast.success('Чат успешно удален');
      } catch (error) {
        console.error('Ошибка при удалении чата:', error);
        toast.error('Не удалось удалить чат');
      }
    }
  };

  const handleSendMessage = async () => {
    if (!user || !selectedChat || !newMessage.trim()) return;

    try {
      await sendMessage(selectedChat.id, user.uid, newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Ошибка при отправке сообщения:', error);
      toast.error('Не удалось отправить сообщение');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage(messageId);
      toast.success('Сообщение успешно удалено');
    } catch (error) {
      console.error('Ошибка при удалении сообщения:', error);
      toast.error('Не удалось удалить сообщение');
    }
  };

  const getChatParticipant = (chat: Chat) => {
    if (!user) return null;
    if (chat.type === ChatType.GROUP) {
      return { firstName: chat.name, lastName: '' };
    }
    const participantId = chat.participants.find(id => id !== user.uid);
    return users.find(u => u.uid === participantId);
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
                  className={`p-4 border-b cursor-pointer hover:bg-accent ${
                    selectedChat?.id === chat.id ? 'bg-accent' : ''
                  }`}
                  onClick={() => setSelectedChat(chat)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">
                        {chat.type === ChatType.GROUP ? (
                          <span className="flex items-center">
                            <Users className="w-4 h-4 mr-2" />
                            {chat.name}
                          </span>
                        ) : chat.type === ChatType.BROADCAST ? (
                          <span className="flex items-center">
                            <Megaphone className="w-4 h-4 mr-2" />
                            Рассылка
                          </span>
                        ) : (
                          participant ? `${participant.firstName} ${participant.lastName}` : 'Неизвестный пользователь'
                        )}
                      </div>
                      {chat.lastMessage && (
                        <div className="text-sm text-muted-foreground truncate">
                          {chat.lastMessage.content}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChat(chat.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
                <div className="font-medium">
                  {selectedChat.type === ChatType.GROUP ? (
                    <span className="flex items-center">
                      <Users className="w-4 h-4 mr-2" />
                      {selectedChat.name}
                    </span>
                  ) : selectedChat.type === ChatType.BROADCAST ? (
                    <span className="flex items-center">
                      <Megaphone className="w-4 h-4 mr-2" />
                      Рассылка
                    </span>
                  ) : (
                    getChatParticipant(selectedChat)?.firstName + ' ' +
                    getChatParticipant(selectedChat)?.lastName
                  )}
                </div>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.senderId === user?.uid ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          message.senderId === user?.uid
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div>{message.content}</div>
                          {message.senderId === user?.uid && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleDeleteMessage(message.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <div className="text-xs mt-1 opacity-70">
                          {format(message.createdAt.toDate(), 'HH:mm')}
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
                  <Button onClick={handleSendMessage}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
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