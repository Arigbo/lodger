'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';
import { FormEvent, useState } from 'react';

interface MessageInputProps {
    onSendMessage: (text: string) => void;
    disabled?: boolean;
}

export function MessageInput({ onSendMessage, disabled }: MessageInputProps) {
    const [newMessage, setNewMessage] = useState('');

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || disabled) return;
        onSendMessage(newMessage);
        setNewMessage('');
    };

    return (
        <div className="p-6 md:p-8 bg-white border-t-2 border-muted/10 z-20">
            <form onSubmit={handleSubmit} className="relative max-w-4xl mx-auto">
                <div className="relative group">
                    <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full opacity-0 group-focus-within:opacity-20 transition-opacity -z-10" />
                    <Input
                        placeholder="Type your message..."
                        className="h-16 md:h-20 rounded-[2.5rem] px-8 pr-20 bg-muted/20 border-2 border-transparent focus-visible:bg-white focus-visible:border-primary/50 focus-visible:ring-0 transition-all text-base md:text-lg font-medium shadow-inner"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        disabled={disabled}
                    />
                    <Button
                        type="submit"
                        size="icon"
                        className="absolute right-3 top-1/2 -translate-y-1/2 h-12 md:h-14 w-12 md:w-14 rounded-[1.5rem] bg-foreground text-white hover:bg-primary shadow-xl transition-all hover:scale-105 active:scale-95"
                        disabled={!newMessage.trim() || disabled}
                    >
                        <Send className="h-5 w-5" />
                    </Button>
                </div>
                <p className="mt-4 text-center text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
                    End-to-end encrypted communication
                </p>
            </form>
        </div>
    );
}
