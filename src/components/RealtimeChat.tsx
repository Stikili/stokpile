import { useEffect, useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { UserAvatar } from './UserAvatar';
import { Send, Loader2, RefreshCw } from 'lucide-react';
import { api } from '../utils/api';
import { toast } from 'sonner';

const POLL_INTERVAL = 5000; // 5 seconds

const formatDistanceToNow = (date: Date) => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
};

interface Message {
  id: string;
  userEmail: string;
  user?: {
    fullName: string;
    surname: string;
    profilePictureUrl?: string;
  };
  message: string;
  createdAt: string;
  _optimistic?: boolean;
}

interface RealtimeChatProps {
  groupId: string;
  userEmail: string;
}

export function RealtimeChat({ groupId, userEmail }: RealtimeChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout>();
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const isFirstLoad = useRef(true);

  const loadMessages = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      const data = await api.getMessages(groupId);
      const serverMessages = data.messages || [];
      setMessages(prev => {
        // Keep optimistic messages that haven't been confirmed yet
        const optimistic = prev.filter(m => m._optimistic);
        const serverIds = new Set(serverMessages.map((m: Message) => m.id));
        const stillPending = optimistic.filter(m => !serverIds.has(m.id));
        return [...serverMessages, ...stillPending];
      });
    } catch (error) {
      if (showLoader) {
        console.error('Failed to load messages:', error);
        toast.error('Failed to load messages');
      }
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    // Initial load with spinner
    loadMessages(true).then(() => {
      isFirstLoad.current = false;
    });

    // Poll every 5 seconds for new messages
    pollIntervalRef.current = setInterval(() => loadMessages(false), POLL_INTERVAL);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [groupId, loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newMessage.trim();
    if (!text || sending) return;

    // Optimistic update — show the message immediately
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMsg: Message = {
      id: optimisticId,
      userEmail,
      message: text,
      createdAt: new Date().toISOString(),
      _optimistic: true,
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setNewMessage('');
    setSending(true);

    try {
      await api.sendMessage({ groupId, message: text });
      // Refresh to replace optimistic message with the confirmed server version
      await loadMessages(false);
    } catch (error) {
      // Roll back optimistic message and restore input text
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
      setNewMessage(text);
      toast.error(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Group Chat</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => loadMessages(false)}
            title="Refresh messages"
          >
            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 px-6">
          {loading ? (
            <div className="flex items-center justify-center h-full py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center text-muted-foreground py-8">
              <div>
                <p className="mb-2">No messages yet</p>
                <p className="text-sm">Start the conversation!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {messages.map((msg) => {
                const isOwn = msg.userEmail === userEmail;
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'} ${msg._optimistic ? 'opacity-60' : ''}`}
                  >
                    {!isOwn && (
                      <UserAvatar
                        name={`${msg.user?.fullName} ${msg.user?.surname}`}
                        email={msg.userEmail}
                        profilePictureUrl={msg.user?.profilePictureUrl}
                      />
                    )}
                    <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[70%]`}>
                      {!isOwn && (
                        <span className="text-xs text-muted-foreground mb-1">
                          {msg.user?.fullName} {msg.user?.surname}
                        </span>
                      )}
                      <div
                        className={`rounded-lg px-4 py-2 ${
                          isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                      </div>
                      <span className="text-xs text-muted-foreground mt-1">
                        {msg._optimistic ? 'Sending...' : formatDistanceToNow(new Date(msg.createdAt))}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t">
          <form onSubmit={handleSend} className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              disabled={sending}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
            />
            <Button type="submit" disabled={!newMessage.trim() || sending}>
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-2">
            Press Enter to send • Updates every {POLL_INTERVAL / 1000}s
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
