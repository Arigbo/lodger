'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { cn } from '@/utils';
import type { UserProfile as User, Message } from '@/types';
import { Send, Search, MessageSquare, MoreVertical, Phone, Video, User as UserIcon, ArrowLeft } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, where, getDocs, doc, addDoc, serverTimestamp, documentId } from 'firebase/firestore';
import Loading from '@/app/loading';
import { sendNotification } from '@/lib/notifications';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { format, formatDistanceToNow } from 'date-fns';

type Conversation = {
    id: string;
    participant: User;
    otherUser: User;
    lastMessage: Message | null;
    lastMessageTimestamp: Date | null;
    unreadCount: number;
};

export default function MessagesPage() {
    const { user: landlord, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedParticipant, setSelectedParticipant] = useState<User | null>(null);
    const [isClient, setIsClient] = useState(false);
    const [isDataLoading, setIsDataLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const [newMessage, setNewMessage] = useState('');
    const [localSelectedConversationId, setLocalSelectedConversationId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const selectedConversationId = searchParams.get('conversationId');

    // Fetch current landlord's profile for avatar
    const landlordDocRef = useMemoFirebase(
        () => landlord ? doc(firestore, 'users', landlord.uid) : null,
        [landlord, firestore]
    );
    const { data: landlordProfile } = useDoc<User>(landlordDocRef);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const allMessagesQuery = useMemoFirebase(() => {
        if (!landlord) return null;
        return query(
            collection(firestore, 'messages'),
            where('participantIds', 'array-contains', landlord.uid)
        );
    }, [firestore, landlord]);

    const { data: allLandlordMessages, isLoading: messagesLoading } = useCollection<Message>(allMessagesQuery);

    useEffect(() => {
        if (isUserLoading || messagesLoading) return;
        if (!landlord) {
            setIsDataLoading(false);
            return;
        }

        const processConversations = async () => {
            setIsDataLoading(true);

            const conversationsMap = new Map<string, { lastMessage: Message, participantId: string }>();
            (allLandlordMessages || []).forEach(msg => {
                const otherParticipantId = msg.participantIds.find(id => id !== landlord.uid);
                if (otherParticipantId) {
                    if (!conversationsMap.has(otherParticipantId) || (msg.timestamp && conversationsMap.get(otherParticipantId)!.lastMessage.timestamp && msg.timestamp.toMillis() > conversationsMap.get(otherParticipantId)!.lastMessage.timestamp.toMillis())) {
                        conversationsMap.set(otherParticipantId, { lastMessage: msg, participantId: otherParticipantId });
                    }
                }
            });

            const participantIds = Array.from(conversationsMap.keys());

            if (participantIds.length === 0) {
                setConversations([]);
                setIsDataLoading(false);
                return;
            }

            const usersQuery = query(collection(firestore, 'users'), where(documentId(), 'in', participantIds));
            const usersSnapshot = await getDocs(usersQuery);
            const usersMap = new Map<string, User>();
            usersSnapshot.forEach((docSnap: any) => usersMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as User));

            const convos = participantIds.map(pId => {
                const participant = usersMap.get(pId);
                if (!participant) return null;

                const convoData = conversationsMap.get(pId);

                return {
                    id: pId,
                    participant,
                    otherUser: participant,
                    lastMessage: convoData?.lastMessage || null,
                    lastMessageTimestamp: convoData?.lastMessage.timestamp?.toDate() || new Date(0),
                    unreadCount: 0,
                } as Conversation;
            }).filter(Boolean) as Conversation[];

            convos.sort((a, b) => (b.lastMessageTimestamp?.getTime() || 0) - (a.lastMessageTimestamp?.getTime() || 0));
            setConversations(convos);
            setIsDataLoading(false);
        };

        processConversations();
    }, [landlord, firestore, isUserLoading, allLandlordMessages, messagesLoading]);

    useEffect(() => {
        if (selectedConversationId) {
            const participant = conversations.find(c => c.id === selectedConversationId)?.participant;
            if (participant) {
                setSelectedParticipant(participant);
                setLocalSelectedConversationId(selectedConversationId);
            }
        } else if (conversations.length > 0 && !localSelectedConversationId) {
            setSelectedParticipant(conversations[0].participant);
            setLocalSelectedConversationId(conversations[0].id);
            router.replace(`${pathname}?conversationId=${conversations[0].id}`, { scroll: false });
        }
    }, [selectedConversationId, conversations, localSelectedConversationId, router, pathname]);

    useEffect(() => {
        if (messagesEndRef.current) {
            scrollToBottom();
        }
    }, [allLandlordMessages]);

    const messages = useMemo(() => {
        if (!allLandlordMessages || !selectedParticipant) return [];
        return allLandlordMessages
            .filter(msg => msg.participantIds.includes(selectedParticipant.id))
            .sort((a, b) => {
                if (a.timestamp && b.timestamp) {
                    return a.timestamp.toMillis() - b.timestamp.toMillis();
                }
                return 0;
            });
    }, [allLandlordMessages, selectedParticipant]);

    const handleSendMessage = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newMessage.trim() || !landlord || !selectedParticipant || !firestore) return;

        const messagesRef = collection(firestore, 'messages');
        const messageData = {
            text: newMessage,
            senderId: landlord.uid,
            recipientId: selectedParticipant.id,
            participantIds: [landlord.uid, selectedParticipant.id].sort(),
            timestamp: serverTimestamp(),
            read: false,
        };

        addDoc(messagesRef, messageData)
            .then(() => {
                setNewMessage('');
                scrollToBottom();
                return sendNotification({
                    toUserId: selectedParticipant.id,
                    type: 'NEW_MESSAGE',
                    firestore: firestore,
                    senderName: landlord.displayName || 'Landlord',
                    customMessage: newMessage,
                    link: `/student/messages?conversationId=${landlord.uid}`
                });
            })
            .catch((serverError: any) => {
                const permissionError = new FirestorePermissionError({
                    path: messagesRef.path,
                    operation: 'create',
                    requestResourceData: messageData,
                });
                errorEmitter.emit('permission-error', permissionError);
            });
    };

    const selectedConversation = conversations.find(c => c.id === localSelectedConversationId);
    const filteredConversations = conversations.filter(c =>
        c.participant.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isUserLoading || isDataLoading) {
        return <Loading />;
    }

    return (
        <div className="flex h-[calc(100vh-8rem)] gap-8 animate-in fade-in duration-700">
            {/* Conversation List */}
            <div className="w-80 md:w-96 flex-shrink-0 flex flex-col gap-6">
                <div className="px-2">
                    <h1 className="text-3xl font-black uppercase tracking-tight">Messages<span className="text-primary">.</span></h1>
                    <p className="text-sm font-medium text-muted-foreground mt-1 text-left">Your direct communication portal with tenants.</p>
                </div>

                <Card className="flex-1 flex flex-col rounded-[2.5rem] border-2 border-white/40 shadow-xl shadow-black/[0.02] overflow-hidden bg-white/60 backdrop-blur-xl">
                    <div className="p-6 border-b border-muted/20">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                            <Input
                                placeholder="Search conversations..."
                                className="pl-12 h-12 rounded-2xl border-none bg-muted/20 focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all font-bold"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                        {isDataLoading ? (
                            <div className="space-y-4 p-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex gap-4 items-center animate-pulse">
                                        <div className="h-14 w-14 rounded-2xl bg-muted/40" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 w-1/2 bg-muted/40 rounded-full" />
                                            <div className="h-3 w-3/4 bg-muted/40 rounded-full" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : filteredConversations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
                                <div className="h-16 w-16 rounded-2xl bg-muted/20 flex items-center justify-center">
                                    <MessageSquare className="h-8 w-8 text-muted-foreground/20" />
                                </div>
                                <p className="text-sm font-black text-muted-foreground uppercase tracking-widest leading-relaxed">No conversations found</p>
                            </div>
                        ) : (
                            filteredConversations.map((conv) => (
                                <button
                                    key={conv.id}
                                    onClick={() => {
                                        setLocalSelectedConversationId(conv.id);
                                        router.replace(`${pathname}?conversationId=${conv.id}`, { scroll: false });
                                    }}
                                    className={cn(
                                        "w-full flex gap-4 items-center p-4 rounded-3xl transition-all duration-300 border-2 border-transparent",
                                        localSelectedConversationId === conv.id
                                            ? "bg-white border-primary/10 shadow-lg scale-[1.02]"
                                            : "hover:bg-white/40 hover:border-white/60 grayscale-[0.5] hover:grayscale-0"
                                    )}
                                >
                                    <Avatar className="h-14 w-14 rounded-2xl border-2 border-background shadow-sm">
                                        <AvatarImage src={conv.otherUser?.profileImageUrl} className="object-cover" />
                                        <AvatarFallback className="bg-primary/5 text-primary text-xl font-black">
                                            {conv.otherUser?.name?.[0] || 'U'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 text-left min-w-0">
                                        <div className="flex justify-between items-start mb-0.5">
                                            <h3 className="font-black text-xs uppercase tracking-tight truncate pr-2">{conv.otherUser?.name || 'Unknown User'}</h3>
                                            <span className="text-[10px] font-bold text-muted-foreground/40 whitespace-nowrap">
                                                {conv.lastMessage?.timestamp ? formatDistanceToNow(new Date(conv.lastMessage.timestamp.toDate()), { addSuffix: false }) : ''}
                                            </span>
                                        </div>
                                        <p className="text-xs font-medium text-muted-foreground/60 truncate pr-4 leading-tight">
                                            {conv.lastMessage?.senderId === landlord?.uid ? 'You: ' : ''}{conv.lastMessage?.text || 'No messages yet'}
                                        </p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </Card>
            </div>

            {/* Chat Area */}
            <div className="flex-1">
                {localSelectedConversationId ? (
                    <Card className="h-full flex flex-col rounded-[3rem] border-2 border-white/40 shadow-2xl shadow-black/[0.03] bg-white overflow-hidden relative">
                        <div className="p-6 md:p-8 border-b-2 border-muted/5 flex items-center justify-between bg-white text-left">
                            <div className="flex items-center gap-6">
                                <Avatar className="h-16 w-16 rounded-[1.25rem] border-2 border-primary/5 shadow-md">
                                    <AvatarImage src={selectedConversation?.otherUser?.profileImageUrl} className="object-cover" />
                                    <AvatarFallback className="bg-muted text-2xl font-black">{selectedConversation?.otherUser?.name?.[0]}</AvatarFallback>
                                </Avatar>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-2xl font-black uppercase tracking-tight leading-none">{selectedConversation?.otherUser?.name}</h2>
                                        <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.5)]" />
                                    </div>
                                    <p className="text-xs font-bold text-muted-foreground/40 uppercase tracking-[0.1em]">Verified Tenant Connection</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl hover:bg-muted/30 transition-all text-muted-foreground">
                                    <MoreVertical className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed opacity-60">
                            {Object.entries(
                                messages.reduce((groups, msg) => {
                                    const date = format(new Date(msg.timestamp.toDate()), 'MMMM d, yyyy');
                                    if (!groups[date]) groups[date] = [];
                                    groups[date].push(msg);
                                    return groups;
                                }, {} as Record<string, typeof messages>)
                            ).map(([date, groupMessages]) => (
                                <div key={date} className="space-y-8">
                                    <div className="flex justify-center py-4 relative">
                                        <div className="absolute inset-x-0 top-1/2 h-px bg-muted/10" />
                                        <span className="relative z-10 px-6 py-2 rounded-full bg-white border-2 border-muted/5 text-[10px] font-black uppercase tracking-[0.2em] shadow-sm">{date}</span>
                                    </div>
                                    {groupMessages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className={cn(
                                                "flex gap-4 max-w-[85%] animate-in slide-in-from-bottom-2 duration-500",
                                                msg.senderId === landlord?.uid ? "ml-auto flex-row-reverse" : "mr-auto"
                                            )}
                                        >
                                            <Avatar className="h-10 w-10 flex-shrink-0 rounded-xl mt-1 shadow-sm border-2 border-white">
                                                <AvatarImage src={msg.senderId === landlord?.uid ? landlordProfile?.profileImageUrl : selectedConversation?.otherUser?.profileImageUrl} className="object-cover" />
                                                <AvatarFallback className="text-[10px] font-black">{msg.senderId === landlord?.uid ? 'ME' : 'U'}</AvatarFallback>
                                            </Avatar>
                                            <div className="space-y-2">
                                                <div
                                                    className={cn(
                                                        "p-6 rounded-[2rem] text-sm font-medium leading-relaxed shadow-xl transition-all hover:scale-[1.01]",
                                                        msg.senderId === landlord?.uid
                                                            ? "bg-foreground text-white rounded-tr-none shadow-black/10"
                                                            : "bg-white border-2 border-muted/10 text-foreground rounded-tl-none shadow-black/5"
                                                    )}
                                                >
                                                    {msg.text}
                                                </div>
                                                <p className={cn(
                                                    "text-[8px] font-bold text-muted-foreground/30 uppercase tracking-widest",
                                                    msg.senderId === landlord?.uid ? "text-right" : "text-left"
                                                )}>
                                                    {format(new Date(msg.timestamp.toDate()), 'HH:mm')} • {msg.senderId === landlord?.uid ? 'Delivered' : 'Received'}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-8 border-t-2 border-muted/5 bg-white relative">
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleSendMessage();
                                }}
                                className="relative"
                            >
                                <Input
                                    placeholder="Draft your message..."
                                    className="h-20 rounded-[2.5rem] border-2 bg-muted/5 pl-8 pr-28 text-sm font-medium focus:bg-white focus:ring-8 focus:ring-primary/5 transition-all shadow-inner placeholder:text-muted-foreground/40"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                />
                                <Button
                                    type="submit"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 h-14 px-8 rounded-full bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100"
                                    disabled={!newMessage.trim()}
                                >
                                    <Send className="h-5 w-5" />
                                </Button>
                            </form>
                        </div>
                    </Card>
                ) : (
                    <Card className="h-full flex flex-col items-center justify-center rounded-[3rem] border-2 border-dashed border-muted/10 bg-muted/5 p-20 text-center space-y-8 animate-in zoom-in duration-700">
                        <div className="h-32 w-32 rounded-[2.5rem] bg-white shadow-2xl flex items-center justify-center mx-auto relative group overflow-hidden">
                            <div className="absolute inset-0 bg-primary/5 rounded-[2.5rem] animate-pulse" />
                            <MessageSquare className="h-14 w-14 text-muted-foreground/20 group-hover:scale-110 transition-transform duration-500" />
                        </div>
                        <div className="space-y-3">
                            <h3 className="text-3xl font-black uppercase tracking-tight">Channel <span className="text-primary">Hibernated</span></h3>
                            <p className="text-lg text-muted-foreground font-medium max-w-sm mx-auto leading-relaxed">
                                Select a verified tenant thread to initiate formal communication protocols.
                            </p>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
}
