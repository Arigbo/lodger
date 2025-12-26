'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/utils';
import { Phone, Video, User as UserIcon, ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { MessageItem } from './MessageItem';
import { MessageInput } from './MessageInput';
import type { UserProfile as User, Message } from '@/types';

interface ChatAreaProps {
    participant: User;
    student: { uid: string; displayName?: string | null; photoURL?: string | null };
    studentProfile?: User;
    messages: Message[];
    onSendMessage: (text: string) => void;
}

export function ChatArea({ participant, student, studentProfile, messages, onSendMessage }: ChatAreaProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className="flex-1 flex flex-col bg-[#fafafa] relative overflow-hidden">
            {/* Professional Chat Header */}
            <div className="px-6 py-5 md:px-10 md:py-8 flex items-center justify-between border-b border-muted/10 bg-white/90 backdrop-blur-2xl z-20 shadow-sm">
                <div className="flex items-center gap-5">
                    <Button variant="ghost" size="icon" className="md:hidden rounded-2xl hover:bg-muted/10" asChild>
                        <Link href="/student/messages" scroll={false}>
                            <ArrowLeft className="h-6 w-6" />
                        </Link>
                    </Button>
                    <div className="relative">
                        <Avatar className="h-16 w-16 border-2 border-primary/10 shadow-xl">
                            <AvatarImage src={participant.profileImageUrl} className="object-cover" />
                            <AvatarFallback><UserIcon className="h-8 w-8" /></AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-4 border-white bg-green-500" />
                    </div>
                    <div>
                        <h3 className="font-extrabold text-lg uppercase tracking-tight">{participant.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Connectivity Stable</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" className="h-12 w-12 rounded-[1.2rem] border-2 hover:bg-muted/10">
                        <Phone className="h-5 w-5 opacity-60" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-12 w-12 rounded-[1.2rem] border-2 hover:bg-muted/10">
                        <Video className="h-5 w-5 opacity-60" />
                    </Button>
                </div>
            </div>

            {/* Messages Grid */}
            <ScrollArea className="flex-1 px-6 md:px-12 py-10 bg-[#fdfdfd]">
                <div className="space-y-8">
                    {messages.map((msg, idx) => {
                        const isMine = msg.senderId === student.uid;
                        const showDate = idx === 0 || (
                            msg.timestamp &&
                            messages[idx - 1].timestamp &&
                            msg.timestamp.toMillis() - messages[idx - 1].timestamp.toMillis() > 3600000
                        );

                        return (
                            <MessageItem
                                key={msg.id}
                                message={msg}
                                isMine={isMine}
                                showDate={showDate}
                                senderProfile={isMine ? {
                                    profileImageUrl: studentProfile?.profileImageUrl || student.photoURL || undefined,
                                    name: studentProfile?.name || student.displayName || 'You'
                                } : {
                                    profileImageUrl: participant.profileImageUrl,
                                    name: participant.name
                                }}
                            />
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>
            </ScrollArea>

            {/* Input Architecture */}
            <MessageInput onSendMessage={onSendMessage} />
        </div>
    );
}
