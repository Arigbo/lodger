
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { getConversationsByStudent, getMessagesByConversationId, getUserById } from '@/lib/data';
import type { User, Conversation, Message } from '@/lib/definitions';
import { Send, Phone, Video, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';

// Mock current user
const useUser = () => {
    // To test tenant view: 'user-3'
    const user = getUserById('user-3');
    return { user };
};

export default function MessagesPage() {
  const { user: student } = useUser();
  const searchParams = useSearchParams();
  
  const conversations: Conversation[] = useMemo(() => {
    return student ? getConversationsByStudent(student.id) : [];
  }, [student]);

  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const conversationIdFromUrl = searchParams.get('conversationId');
    if (conversationIdFromUrl) {
      const conversationToSelect = conversations.find(c => c.id === conversationIdFromUrl);
      setSelectedConversation(conversationToSelect || null);
    } else if (conversations.length > 0) {
        const firstConvo = conversations[0];
        if (!selectedConversation) {
            setSelectedConversation(firstConvo);
        }
    }
  }, [searchParams, conversations, selectedConversation]);

  const messages = selectedConversation ? getMessagesByConversationId(selectedConversation.id) : [];

  return (
    <div>
        <div className="mb-8">
            <h1 className="font-headline text-3xl font-bold">Messages</h1>
            <p className="text-muted-foreground">Communicate with your landlords.</p>
        </div>
        <Card className="h-[calc(80vh)]">
            <div className="grid h-full grid-cols-1 md:grid-cols-3">
                {/* Conversation List */}
                <div className="flex flex-col border-r">
                    <CardHeader>
                        <CardTitle>Conversations</CardTitle>
                    </CardHeader>
                    <Separator />
                    <ScrollArea className="flex-grow">
                        <CardContent className="p-0">
                            {conversations.map(convo => (
                                <Link
                                    key={convo.id}
                                    href={`/student/messages?conversationId=${convo.id}`}
                                    className={cn(
                                        "flex w-full items-center gap-4 p-4 text-left hover:bg-accent",
                                        selectedConversation?.id === convo.id && 'bg-secondary'
                                    )}
                                    scroll={false}
                                >
                                    <Avatar>
                                        <AvatarImage src={convo.participant.avatarUrl} />
                                        <AvatarFallback>
                                            <UserIcon className="h-4 w-4" />
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-grow overflow-hidden">
                                        <div className="flex justify-between items-center">
                                            <p className="font-semibold truncate">{convo.participant.name}</p>
                                            <p className="text-xs text-muted-foreground whitespace-nowrap">{isClient && convo.lastMessageTimestamp ? format(new Date(convo.lastMessageTimestamp), "p") : ''}</p>
                                        </div>
                                        <div className="flex justify-between items-start">
                                            <p className="text-sm text-muted-foreground truncate">{convo.lastMessage}</p>
                                             {convo.unreadCount > 0 && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">{convo.unreadCount}</span>}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </CardContent>
                    </ScrollArea>
                </div>

                {/* Chat Window */}
                <div className="col-span-2 flex flex-col h-full">
                    {selectedConversation && student ? (
                        <>
                        {/* Chat Header */}
                         <div className="flex items-center justify-between border-b p-4">
                            <div className="flex items-center gap-4 group">
                                <Avatar>
                                    <AvatarImage src={selectedConversation.participant.avatarUrl} />
                                    <AvatarFallback>
                                        <UserIcon className="h-4 w-4" />
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold">{selectedConversation.participant.name}</p>
                                    <p className="text-xs text-muted-foreground">Online</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon"><Phone /></Button>
                                <Button variant="ghost" size="icon"><Video /></Button>
                            </div>
                        </div>
                        {/* Messages Area */}
                        <ScrollArea className="flex-grow p-6">
                            <div className="space-y-6">
                                {messages.map(msg => (
                                    <div key={msg.id} className={cn("flex flex-col gap-1", msg.senderId === student.id ? "items-end" : "items-start")}>
                                        <div className={cn("flex items-end gap-3", msg.senderId === student.id ? "justify-end" : "justify-start")}>
                                            {msg.senderId !== student.id && (
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={selectedConversation.participant.avatarUrl} />
                                                    <AvatarFallback>
                                                        <UserIcon className="h-4 w-4" />
                                                    </AvatarFallback>
                                                </Avatar>
                                            )}
                                            <div className={cn("max-w-xs rounded-xl p-3 md:max-w-md", msg.senderId === student.id ? "bg-primary text-primary-foreground" : "bg-secondary")}>
                                                <p className="text-sm">{msg.text}</p>
                                            </div>
                                            {msg.senderId === student.id && (
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={student.avatarUrl} />
                                                    <AvatarFallback>
                                                        <UserIcon className="h-4 w-4" />
                                                    </AvatarFallback>
                                                </Avatar>
                                            )}
                                        </div>
                                         <p className="text-xs text-muted-foreground px-12">
                                            {isClient ? format(new Date(msg.timestamp), 'MMM d, yyyy, h:mm a') : '...'}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                        {/* Message Input */}
                        <div className="border-t p-4">
                            <div className="relative">
                                <Input placeholder="Type your message..." className="pr-12" />
                                <Button size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8">
                                    <Send />
                                </Button>
                            </div>
                        </div>
                        </>
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center text-center">
                            <div className="rounded-full bg-secondary p-4">
                                <Send className="h-10 w-10 text-muted-foreground" />
                            </div>
                            <h3 className="mt-4 text-lg font-semibold">Select a conversation</h3>
                            <p className="text-muted-foreground">Choose a landlord from the list to start chatting.</p>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    </div>
  );
}
