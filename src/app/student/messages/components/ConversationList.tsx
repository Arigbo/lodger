'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/utils';
import { User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import format from "date-fns/format";
import type { UserProfile as User } from '@/types';

type Conversation = {
    participant: User;
    lastMessage: string;
    lastMessageTimestamp: Date | null;
    unreadCount: number;
};

interface ConversationListProps {
    conversations: Conversation[];
    selectedParticipantId?: string;
}

export function ConversationList({ conversations, selectedParticipantId }: ConversationListProps) {
    const pathname = usePathname();

    return (
        <div className="flex flex-col h-full bg-white md:bg-muted/5">
            <div className="p-8 border-b border-muted/10 bg-white/70 backdrop-blur-xl flex items-center justify-between">
                <h2 className="text-xs font-black text-foreground/40 uppercase tracking-[0.25em]">Conversations</h2>
                <div className="h-2 w-2 rounded-full bg-primary/20 animate-pulse" />
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4 space-y-2">
                    {conversations.map(convo => {
                        const isSelected = selectedParticipantId === convo.participant.id;
                        return (
                            <Link
                                key={convo.participant.id}
                                href={`${pathname}?conversationId=${convo.participant.id}`}
                                className={cn(
                                    "flex items-center gap-4 p-5 rounded-2xl transition-all group relative overflow-hidden",
                                    isSelected
                                        ? "bg-foreground text-white shadow-xl shadow-foreground/10"
                                        : "hover:bg-white hover:shadow-lg hover:shadow-black/5"
                                )}
                                scroll={false}
                            >
                                <div className="relative">
                                    <Avatar className="h-14 w-14 border-2 border-white/20 shadow-lg">
                                        <AvatarImage src={convo.participant.profileImageUrl} className="object-cover" />
                                        <AvatarFallback className="bg-muted text-muted-foreground">
                                            <UserIcon className="h-6 w-6" />
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className={cn(
                                        "absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white bg-green-500",
                                        isSelected && "border-foreground"
                                    )} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="font-black text-sm uppercase tracking-tight truncate pr-2">
                                            {convo.participant.name}
                                        </p>
                                        <span className={cn(
                                            "text-[10px] font-bold uppercase tracking-tighter opacity-40 whitespace-nowrap",
                                            isSelected && "text-white/60"
                                        )}>
                                            {convo.lastMessageTimestamp && convo.lastMessageTimestamp.getTime() > 0
                                                ? format(convo.lastMessageTimestamp, "h:mm a")
                                                : ''}
                                        </span>
                                    </div>
                                    <p className={cn(
                                        "text-xs truncate font-medium",
                                        isSelected ? "text-white/60" : "text-muted-foreground"
                                    )}>
                                        {convo.lastMessage}
                                    </p>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </ScrollArea>
        </div>
    );
}
