'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { cn } from '@/utils';
import type { UserProfile as User, Message } from '@/types';
import { Send, Search, MessageSquare, MoreVertical, Phone, Video, User as UserIcon, ArrowLeft } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, where, getDocs, doc, addDoc, serverTimestamp, documentId, updateDoc, writeBatch } from 'firebase/firestore';
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
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const selectedConversationId = searchParams.get('conversationId');

    // Handle initial state and mobile view switching
    useEffect(() => {
        if (selectedConversationId) {
            setIsSidebarOpen(false);
        }
    }, [selectedConversationId]);

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

                // Calculate unread count: messages where read is false and sender is the other participant
                const unreadCount = (allLandlordMessages || []).filter(msg =>
                    msg.participantIds.includes(pId) &&
                    msg.read === false &&
                    msg.senderId !== landlord.uid
                ).length;

                return {
                    id: pId,
                    participant,
                    otherUser: participant,
                    lastMessage: convoData?.lastMessage || null,
                    lastMessageTimestamp: convoData?.lastMessage.timestamp?.toDate() || new Date(0),
                    unreadCount,
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
        } else if (conversations.length > 0 && !localSelectedConversationId && searchParams.get('conversationId')) {
            const convoId = searchParams.get('conversationId');
            const participant = conversations.find(c => c.id === convoId)?.participant;
            if (participant) {
                setSelectedParticipant(participant);
                setLocalSelectedConversationId(convoId);
            }
        }
    }, [selectedConversationId, conversations, localSelectedConversationId, router, pathname]);

    // Mark messages as read when conversation is opened
    useEffect(() => {
        if (!landlord || !selectedParticipant || !firestore || !allLandlordMessages) return;

        const markAsRead = async () => {
            const unreadMessages = allLandlordMessages.filter(msg =>
                msg.participantIds.includes(selectedParticipant.id) &&
                msg.read === false &&
                msg.senderId === selectedParticipant.id
            );

            if (unreadMessages.length === 0) return;

            const batch = writeBatch(firestore);
            unreadMessages.forEach(msg => {
                const msgRef = doc(firestore, 'messages', msg.id);
                batch.update(msgRef, { read: true });
            });

            try {
                await batch.commit();
            } catch (error) {
                console.error('Error marking messages as read:', error);
            }
        };

        markAsRead();
    }, [selectedParticipant, landlord, firestore, allLandlordMessages]);

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

    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
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
        <div className="flex h-[calc(100dvh-7rem)] md:h-[calc(100vh-8rem)] gap-0 md:gap-8 animate-in fade-in duration-700 overflow-hidden -mt-4 md:mt-0">
            {/* Conversation List */}
            <div className={cn(
                "w-full md:w-80 lg:w-96 flex-shrink-0 flex flex-col gap-4 md:gap-6 transition-all duration-300",
                !isSidebarOpen && "hidden md:flex"
            )}>
                <div className="px-2">
                    <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">Messages<span className="text-primary">.</span></h1>
                    <p className="text-[10px] md:text-sm font-medium text-muted-foreground mt-1 text-left">Your direct communication portal with tenants.</p>
                </div>

                <Card className="flex-1 flex flex-col rounded-[2rem] md:rounded-[2.5rem] border-2 border-white/40 shadow-xl shadow-black/[0.02] overflow-hidden bg-white/60 backdrop-blur-xl">
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
                            filteredConversations.map((conv) => {
                                const hasUnread = conv.unreadCount > 0;
                                return (
                                    <button
                                        key={conv.id}
                                        onClick={() => {
                                            setLocalSelectedConversationId(conv.id);
                                            setIsSidebarOpen(false);
                                            router.replace(`${pathname}?conversationId=${conv.id}`, { scroll: false });
                                        }}
                                        className={cn(
                                            "w-full flex gap-4 items-center p-3 md:p-4 rounded-2xl md:rounded-3xl transition-all duration-300 border-2 relative",
                                            localSelectedConversationId === conv.id
                                                ? "bg-white border-primary/10 shadow-lg scale-[1.02]"
                                                : hasUnread
                                                    ? "bg-primary/5 border-primary/20 hover:bg-primary/10 hover:border-primary/30"
                                                    : "border-transparent hover:bg-white/40 hover:border-white/60 grayscale-[0.5] hover:grayscale-0"
                                        )}
                                    >
                                        <div className="relative">
                                            <Avatar className="h-14 w-14 rounded-2xl border-2 border-background shadow-sm">
                                                <AvatarImage src={conv.otherUser?.profileImageUrl} className="object-cover" />
                                                <AvatarFallback className={cn(
                                                    "text-xl font-black",
                                                    hasUnread ? "bg-primary/10 text-primary" : "bg-primary/5 text-primary"
                                                )}>
                                                    {conv.otherUser?.name?.[0] || 'U'}
                                                </AvatarFallback>
                                            </Avatar>
                                            {hasUnread && (
                                                <div className="absolute -top-1 -right-1 h-5 w-5 bg-primary rounded-full border-2 border-white flex items-center justify-center">
                                                    <span className="text-[10px] font-black text-white">{conv.unreadCount}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 text-left min-w-0">
                                            <div className="flex justify-between items-start mb-0.5">
                                                <h3 className={cn(
                                                    "font-black text-xs uppercase tracking-tight truncate pr-2",
                                                    hasUnread && "text-primary"
                                                )}>{conv.otherUser?.name || 'Unknown User'}</h3>
                                                <span className="text-[10px] font-bold text-muted-foreground/40 whitespace-nowrap">
                                                    {conv.lastMessage?.timestamp ? formatDistanceToNow(new Date(conv.lastMessage.timestamp.toDate()), { addSuffix: false }) : ''}
                                                </span>
                                            </div>
                                            <p className={cn(
                                                "text-xs font-medium truncate pr-4 leading-tight",
                                                hasUnread ? "text-foreground font-bold" : "text-muted-foreground/60"
                                            )}>
                                                {conv.lastMessage?.senderId === landlord?.uid ? 'You: ' : ''}{conv.lastMessage?.text || 'No messages yet'}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </Card>
            </div>

            {/* Chat Area */}
            <div className={cn(
                "flex-1 h-full",
                isSidebarOpen && "hidden md:block"
            )}>
                {localSelectedConversationId ? (
                    <Card className="h-full flex flex-col rounded-none md:rounded-[3rem] border-0 md:border-2 border-white/40 shadow-2xl shadow-black/[0.03] bg-white overflow-hidden relative">
                        <div className="p-4 md:p-8 border-b-2 border-muted/5 flex items-center justify-between bg-white text-left">
                            <div className="flex items-center gap-3 md:gap-6">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="md:hidden h-10 w-10 rounded-xl"
                                    onClick={() => {
                                        setIsSidebarOpen(true);
                                        router.replace(pathname, { scroll: false });
                                    }}
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                                <Avatar className="h-10 w-10 md:h-16 md:w-16 rounded-xl md:rounded-[1.25rem] border-2 border-primary/5 shadow-md">
                                    <AvatarImage src={selectedConversation?.otherUser?.profileImageUrl} className="object-cover" />
                                    <AvatarFallback className="bg-muted text-xl md:text-2xl font-black">{selectedConversation?.otherUser?.name?.[0]}</AvatarFallback>
                                </Avatar>
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2 md:gap-3">
                                        <h2 className="text-base md:text-xl font-black uppercase tracking-tight leading-none truncate max-w-[150px] md:max-w-none">{selectedConversation?.otherUser?.name}</h2>
                                        <div className="h-1 md:h-1.5 w-1 md:w-1.5 rounded-full bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.5)]" />
                                    </div>
                                    <p className="text-[7px] md:text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.1em]">Verified Tenant Connection</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="icon" className="h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl hover:bg-muted/30 transition-all text-muted-foreground">
                                    <MoreVertical className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-6 md:space-y-8 custom-scrollbar relative">
                            {/* Texture Overlay */}
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed opacity-[0.02] pointer-events-none" />

                            <div className="relative z-10 space-y-6 md:space-y-8">
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
                        </div>

                        <div className="p-4 md:p-8 border-t-2 border-muted/5 bg-white relative">
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleSendMessage();
                                }}
                                className="relative"
                            >
                                <Input
                                    placeholder="Draft your message..."
                                    className="h-14 md:h-20 rounded-2xl md:rounded-[2.5rem] border-2 bg-muted/5 pl-6 md:pl-8 pr-20 md:pr-28 text-sm font-medium focus:bg-white focus:ring-8 focus:ring-primary/5 transition-all shadow-inner placeholder:text-muted-foreground/40"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                />
                                <Button
                                    type="submit"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-10 md:h-14 px-4 md:px-8 rounded-xl md:rounded-full bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100"
                                    disabled={!newMessage.trim()}
                                >
                                    <Send className="h-4 w-4 md:h-5 md:w-5" />
                                </Button>
                            </form>
                        </div>
                    </Card>
                ) : (
                    <Card className="h-full flex flex-col items-center justify-center rounded-[2rem] md:rounded-[3rem] border-2 border-dashed border-muted/10 bg-muted/5 p-8 md:p-20 text-center space-y-6 md:space-y-8 animate-in zoom-in duration-700">
                        <div className="h-20 w-20 md:h-32 md:w-32 rounded-2xl md:rounded-[2.5rem] bg-white shadow-2xl flex items-center justify-center mx-auto relative group overflow-hidden">
                            <div className="absolute inset-0 bg-primary/5 rounded-2xl md:rounded-[2.5rem] animate-pulse" />
                            <MessageSquare className="h-8 w-8 md:h-14 md:w-14 text-muted-foreground/20 group-hover:scale-110 transition-transform duration-500" />
                        </div>
                        <div className="space-y-2 md:space-y-3">
                            <h3 className="text-xl md:text-3xl font-black uppercase tracking-tight">Channel <span className="text-primary">Hibernated</span></h3>
                            <p className="text-sm md:text-lg text-muted-foreground font-medium max-w-sm mx-auto leading-relaxed">
                                Select a verified tenant thread to initiate formal communication protocols.
                            </p>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
}
