'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/utils';
import { User as UserIcon } from 'lucide-react';
import { format } from "date-fns";
import type { Message } from '@/types';

interface MessageItemProps {
    message: Message;
    isMine: boolean;
    showDate: boolean;
    senderProfile?: {
        profileImageUrl?: string;
        name?: string;
    };
    recipientProfile?: {
        profileImageUrl?: string;
        name?: string;
    };
}

export function MessageItem({ message, isMine, showDate, senderProfile }: MessageItemProps) {
    const timestamp = message.timestamp?.toDate();

    return (
        <div className="space-y-6 w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
            {showDate && timestamp && (
                <div className="flex items-center gap-6 py-6 group">
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-muted/20 to-transparent" />
                    <span className="text-[9px] font-black uppercase tracking-[0.5em] text-muted-foreground/30 px-4 group-hover:text-primary/40 transition-colors">
                        {format(timestamp, 'EEEE, d MMMM yyyy')}
                    </span>
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-muted/20 to-transparent" />
                </div>
            )}
            <div className={cn(
                "flex items-start gap-4 transition-all duration-300",
                isMine ? "flex-row-reverse" : "flex-row"
            )}>
                <div className="flex-shrink-0 mt-1 relative group">
                    <Avatar className="h-10 w-10 border-2 border-white shadow-xl ring-1 ring-black/5">
                        <AvatarImage
                            src={senderProfile?.profileImageUrl}
                            className="object-cover"
                        />
                        <AvatarFallback className="bg-muted text-muted-foreground/40 text-[10px] font-black uppercase">
                            {senderProfile?.name?.[0] || 'U'}
                        </AvatarFallback>
                    </Avatar>
                    <div className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white shadow-sm",
                        isMine ? "bg-primary" : "bg-green-500"
                    )} />
                </div>

                <div className={cn(
                    "flex flex-col gap-2 max-w-[85%] md:max-w-[70%]",
                    isMine ? "items-end" : "items-start"
                )}>
                    {!isMine && (
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 px-1">
                            {senderProfile?.name}
                        </span>
                    )}
                    <div className={cn(
                        "px-6 py-4 rounded-[1.75rem] relative group transition-all duration-300 hover:shadow-2xl",
                        isMine
                            ? "bg-foreground text-white rounded-tr-none shadow-xl shadow-foreground/5"
                            : "bg-white border border-muted/10 text-foreground rounded-tl-none shadow-lg shadow-black/5"
                    )}>
                        <p className="text-sm md:text-[16px] leading-relaxed font-medium selection:bg-primary/20">
                            {message.text}
                        </p>
                    </div>
                    {timestamp && (
                        <div className={cn(
                            "flex items-center gap-2 px-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground/30",
                            isMine ? "justify-end" : "justify-start"
                        )}>
                            <span>{format(timestamp, 'h:mm a')}</span>
                            <div className="h-1 w-1 rounded-full bg-muted/20" />
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity uppercase">Delivered</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
