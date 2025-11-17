
'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { getConversationsByLandlord, getMessagesByConversationId, getUserById } from '@/lib/data';
import type { User, Property, Conversation, Message } from '@/lib/definitions';
import { Send, Phone, Video } from 'lucide-react';
import Link from 'next/link';

// Mock current user
const useUser = () => {
  const user = getUserById('user-1');
  return { user };
};

export default function MessagesPage() {
  const { user: landlord } = useUser();
  
  const conversations: Conversation[] = landlord ? getConversationsByLandlord(landlord.id) : [];

  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(conversations[0] || null);

  const messages = selectedConversation ? getMessagesByConversationId(selectedConversation.id) : [];


  return (
    <div>
        <div className="mb-8">
            <h1 className="font-headline text-3xl font-bold">Messages</h1>
            <p className="text-muted-foreground">Communicate with your tenants.</p>
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
                                <button key={convo.id} onClick={() => setSelectedConversation(convo)} className={cn("flex w-full items-center gap-4 p-4 text-left hover:bg-accent", selectedConversation?.id === convo.id && 'bg-secondary')}>
                                    <Avatar>
                                        <AvatarImage src={convo.participant.avatarUrl} />
                                        <AvatarFallback>{convo.participant.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-grow overflow-hidden">
                                        <div className="flex justify-between items-center">
                                            <p className="font-semibold truncate">{convo.participant.name}</p>
                                            <p className="text-xs text-muted-foreground whitespace-nowrap">{convo.lastMessageTimestamp}</p>
                                        </div>
                                        <div className="flex justify-between items-start">
                                            <p className="text-sm text-muted-foreground truncate">{convo.lastMessage}</p>
                                             {convo.unreadCount > 0 && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">{convo.unreadCount}</span>}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </CardContent>
                    </ScrollArea>
                </div>

                {/* Chat Window */}
                <div className="col-span-2 flex flex-col h-full">
                    {selectedConversation && landlord ? (
                        <>
                        {/* Chat Header */}
                         <div className="flex items-center justify-between border-b p-4">
                            <Link href={`/landlord/tenants/${selectedConversation.participant.id}`} className="flex items-center gap-4 group">
                                <Avatar>
                                    <AvatarImage src={selectedConversation.participant.avatarUrl} />
                                    <AvatarFallback>{selectedConversation.participant.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold group-hover:underline">{selectedConversation.participant.name}</p>
                                    <p className="text-xs text-muted-foreground">Online</p>
                                </div>
                            </Link>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon"><Phone /></Button>
                                <Button variant="ghost" size="icon"><Video /></Button>
                            </div>
                        </div>
                        {/* Messages Area */}
                        <ScrollArea className="flex-grow p-6">
                            <div className="space-y-6">
                                {messages.map(msg => (
                                    <div key={msg.id} className={cn("flex items-end gap-3", msg.senderId === landlord.id ? "justify-end" : "justify-start")}>
                                         {msg.senderId !== landlord.id && (
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={selectedConversation.participant.avatarUrl} />
                                                <AvatarFallback>{selectedConversation.participant.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                         )}
                                        <div className={cn("max-w-xs rounded-xl p-3 md:max-w-md", msg.senderId === landlord.id ? "bg-primary text-primary-foreground" : "bg-secondary")}>
                                            <p className="text-sm">{msg.text}</p>
                                        </div>
                                         {msg.senderId === landlord.id && (
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={landlord.avatarUrl} />
                                                <AvatarFallback>{landlord.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                         )}
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
                            <p className="text-muted-foreground">Choose a tenant from the list to start chatting.</p>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    </div>
  );
}
