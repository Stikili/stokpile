import { useEffect, useState, useRef } from 'react';
import type { ChatMessage } from '@/domain/types';
import { Button } from '@/presentation/ui/button';
import { Input } from '@/presentation/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/ui/card';
import { ScrollArea } from '@/presentation/ui/scroll-area';
import { Send } from 'lucide-react';
import { api } from '@/infrastructure/api';
import { toast } from 'sonner';

interface ChatViewProps {
  groupId: string;
  meetingId?: string;
  userEmail: string;
}

export function ChatView({ groupId, meetingId, userEmail }: ChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();

    // Poll for new messages every 5 seconds
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [groupId]);

  useEffect(() => {
    // Scroll to bottom when messages change
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    try {
      const data = await api.getMessages(groupId);
      setMessages(data.messages || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load messages:', error);
      if (loading) {
        toast.error('Failed to load messages');
        setLoading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = message.trim();
    if (!text) return;

    setSending(true);
    setMessage('');

    // Optimistic update
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: optimisticId,
      groupId,
      meetingId,
      userEmail,
      message: text,
      createdAt: new Date().toISOString(),
      user: undefined,
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      await api.sendMessage({ groupId, message: text, meetingId });
      loadMessages();
    } catch (error) {
      // Remove the optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
      setMessage(text);
      toast.error(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    
    return date.toLocaleDateString('en-ZA', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader>
        <CardTitle>Group Chat</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4 min-h-0">
        <ScrollArea className="flex-1 pr-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No messages yet. Start the conversation!
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => {
                const isOwnMessage = msg.userEmail === userEmail;
                
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2 ${
                        isOwnMessage
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {!isOwnMessage && (
                        <p className="text-xs opacity-70 mb-1">
                          {msg.user && msg.user.fullName !== 'Unknown'
                            ? `${msg.user.fullName} ${msg.user.surname}`
                            : msg.userEmail}
                        </p>
                      )}
                      <p className="break-words">{msg.message}</p>
                      <p className={`text-xs mt-1 ${isOwnMessage ? 'opacity-70' : 'text-muted-foreground'}`}>
                        {formatTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </ScrollArea>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={sending}
          />
          <Button type="submit" size="icon" disabled={sending || !message.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
