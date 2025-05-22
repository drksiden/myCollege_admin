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
import { createChat, deleteChat, sendMessage, deleteMessage, subscribeToChatMessages, subscribeToUserChats } from '@/lib/firebaseService/chatService';
import { getUsers } from '@/lib/firebaseService/userService';
import type { Chat, Message, User } from '@/types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth';
import { Trash2, Send } from 'lucide-react';

export default function ChatPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isNewChatDialogOpen, setIsNewChatDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('');
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

  const handleCreateChat = async () => {
    if (!user || !selectedUser) return;

    try {
      await createChat([user.uid, selectedUser]);
      setIsNewChatDialogOpen(false);
      setSelectedUser('');
      toast.success('Chat created successfully');
    } catch (error) {
      console.error('Error creating chat:', error);
      toast.error('Failed to create chat');
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    if (window.confirm('Are you sure you want to delete this chat?')) {
      try {
        await deleteChat(chatId);
        if (selectedChat?.id === chatId) {
          setSelectedChat(null);
          setMessages([]);
        }
        toast.success('Chat deleted successfully');
      } catch (error) {
        console.error('Error deleting chat:', error);
        toast.error('Failed to delete chat');
      }
    }
  };

  const handleSendMessage = async () => {
    if (!user || !selectedChat || !newMessage.trim()) return;

    try {
      await sendMessage(selectedChat.id, user.uid, newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage(messageId);
      toast.success('Message deleted successfully');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  const getChatParticipant = (chat: Chat) => {
    if (!user) return null;
    const participantId = chat.participants.find(id => id !== user.uid);
    return users.find(u => u.uid === participantId);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Chats</h1>
        <Dialog open={isNewChatDialogOpen} onOpenChange={setIsNewChatDialogOpen}>
          <DialogTrigger asChild>
            <Button>New Chat</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start New Chat</DialogTitle>
              <DialogDescription>
                Select a user to start a chat with.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">Select a user</option>
                {users.map((u) => (
                  <option key={u.uid} value={u.uid}>
                    {u.firstName} {u.lastName} ({u.role})
                  </option>
                ))}
              </select>

              <Button onClick={handleCreateChat}>
                Start Chat
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
                        {participant ? `${participant.firstName} ${participant.lastName}` : 'Unknown User'}
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
                  {getChatParticipant(selectedChat)?.firstName}{' '}
                  {getChatParticipant(selectedChat)?.lastName}
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
                    placeholder="Type a message..."
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
              Select a chat to start messaging
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 