
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/utils';
import type { UserProfile as User, Message } from '@/types';
import { Send, Phone, Video, User as UserIcon, ArrowLeft } from 'lucide-react';
import format from "date-fns/format";
import { useUser, useFirestore, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, where, orderBy, getDocs, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import Loading from '@/app/loading';

type Conversation = {
    participant: User;
    lastMessage: string;
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
    const [newMessage, setNewMessage] = useState('');
    const [isDataLoading, setIsDataLoading] = useState(true);

    const selectedConversationId = searchParams.get('conversationId');

    useEffect(() => {
        setIsClient(true);
    }, []);

    // Query for all messages where the landlord is a participant
    const allMessagesQuery = useMemoFirebase(() => {
        if (!landlord) return null;
        return query(
            collection(firestore, 'messages'),
            where('participantIds', 'array-contains', landlord.uid)
        );
    }, [firestore, landlord]);

    const { data: allLandlordMessages, isLoading: messagesLoading } = useCollection<Message>(allMessagesQuery);

    // This effect processes all messages to build the conversation list
    useEffect(() => {
        if (isUserLoading || messagesLoading) return;
        if (!landlord || !allLandlordMessages) {
            setConversations([]);
            setIsDataLoading(false);
            return;
        }

        const processConversations = async () => {
            setIsDataLoading(true);
            const conversationsMap = new Map<string, { lastMessage: Message, participantId: string }>();

            allLandlordMessages.forEach(msg => {
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

            const usersQuery = query(collection(firestore, 'users'), where('id', 'in', participantIds));
            const usersSnapshot = await getDocs(usersQuery);
            const usersMap = new Map<string, User>();
            usersSnapshot.forEach((docSnap: any) => usersMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as User));

            const convos = Array.from(conversationsMap.values()).map(convoData => {
                const participant = usersMap.get(convoData.participantId);
                if (!participant) return null;

                return {
                    participant,
                    lastMessage: convoData.lastMessage.text || 'No messages yet.',
                    lastMessageTimestamp: convoData.lastMessage.timestamp?.toDate() || null,
                    unreadCount: 0, // Unread count logic needs to be implemented
                } as Conversation;
            }).filter(Boolean) as Conversation[];

            convos.sort((a, b) => (b.lastMessageTimestamp?.getTime() || 0) - (a.lastMessageTimestamp?.getTime() || 0));
            setConversations(convos);
            setIsDataLoading(false);
        };

        processConversations();
    }, [landlord, allLandlordMessages, isUserLoading, messagesLoading, firestore]);

    // Effect to set the selected conversation based on URL param
    useEffect(() => {
        if (selectedConversationId) {
            const participant = conversations.find(c => c.participant.id === selectedConversationId)?.participant;
            setSelectedParticipant(participant || null);
        } else if (conversations.length > 0 && !selectedParticipant) {
            // Default to first conversation
            setSelectedParticipant(conversations[0].participant);
            router.replace(`${pathname}?conversationId=${conversations[0].participant.id}`, { scroll: false });
        }
    }, [selectedConversationId, conversations, selectedParticipant, router, pathname]);

    // Memoized messages for the selected conversation, filtered from all messages
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

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !landlord || !selectedParticipant || !firestore) return;

        const messagesRef = collection(firestore, 'messages');
        const messageData = {
            text: newMessage,
            senderId: landlord.uid,
            recipientId: selectedParticipant.id,
            participantIds: [landlord.uid, selectedParticipant.id].sort(), // Ensure consistent array order
            timestamp: serverTimestamp(),
            read: false,
        };

        addDoc(messagesRef, messageData)
            .catch((serverError: any) => {
                const permissionError = new FirestorePermissionError({
                    path: messagesRef.path,
                    operation: 'create',
                    requestResourceData: messageData,
                });
                errorEmitter.emit('permission-error', permissionError);
            });

        setNewMessage('');
    };

    if (isUserLoading || isDataLoading) {
        return <Loading />;
    }

    return (
        <div>
            <div className="mb-8">
                <h1 className="font-headline text-3xl font-bold">Messages</h1>
                <p className="text-muted-foreground">Communicate with your tenants.</p>
            </div>
            <Card className="h-[calc(80vh)]">
                <div className="grid h-full grid-cols-1 md:grid-cols-3">
                    {/* Conversation List */}
                    <div className={cn(
                        "flex flex-col border-r",
                        "md:flex",
                        selectedConversationId ? "hidden" : "flex"
                    )}>
                        <CardHeader>
                            <CardTitle>Conversations</CardTitle>
                        </CardHeader>
                        <Separator />
                        <ScrollArea className="flex-grow">
                            <CardContent className="p-0">
                                {conversations.map(convo => (
                                    <Link
                                        key={convo.participant.id}
                                        href={`${pathname}?conversationId=${convo.participant.id}`}
                                        className={cn(
                                            "flex w-full items-center gap-4 p-4 text-left hover:bg-accent",
                                            selectedParticipant?.id === convo.participant.id && 'bg-secondary'
                                        )}
                                        scroll={false}
                                    >
                                        <Avatar>
                                            <AvatarImage src={convo.participant.profileImageUrl} />
                                            <AvatarFallback>
                                                <UserIcon className="h-4 w-4" />
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-grow overflow-hidden">
                                            <div className="flex justify-between items-center">
                                                <p className="font-semibold truncate">{convo.participant.name}</p>
                                                <p className="text-xs text-muted-foreground whitespace-nowrap">{isClient && convo.lastMessageTimestamp ? format(convo.lastMessageTimestamp, "p") : ''}</p>
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
                    <div className={cn(
                        "col-span-2 flex-col h-full",
                        selectedConversationId ? "flex" : "hidden",
                        "md:flex"
                    )}>
                        {selectedParticipant && landlord ? (
                            <>
                                {/* Chat Header */}
                                <div className="flex items-center justify-between border-b p-4">
                                    <div className="flex items-center gap-4">
                                        <Button variant="ghost" size="icon" className="md:hidden" asChild>
                                            <Link href="/landlord/messages" scroll={false}>
                                                <ArrowLeft />
                                            </Link>
                                        </Button>
                                        <Link href={`/landlord/tenants/${selectedParticipant.id}`} className="flex items-center gap-4 group">
                                            <Avatar>
                                                <AvatarImage src={selectedParticipant.profileImageUrl} />
                                                <AvatarFallback>
                                                    <UserIcon className="h-4 w-4" />
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-semibold group-hover:underline">{selectedParticipant.name}</p>
                                                <p className="text-xs text-muted-foreground">Online</p>
                                            </div>
                                        </Link>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="icon"><Phone /></Button>
                                        <Button variant="ghost" size="icon"><Video /></Button>
                                    </div>
                                </div>
                                {/* Messages Area */}
                                <ScrollArea className="flex-grow p-6">
                                    <div className="space-y-6">
                                        {messages?.map(msg => (
                                            <div key={msg.id} className={cn("flex flex-col gap-1", msg.senderId === landlord.uid ? "items-end" : "items-start")}>
                                                <div className={cn("flex items-end gap-3", msg.senderId === landlord.uid ? "justify-end" : "justify-start")}>
                                                    {msg.senderId !== landlord.uid && (
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage src={selectedParticipant.profileImageUrl} />
                                                            <AvatarFallback>
                                                                <UserIcon className="h-4 w-4" />
                                                            </AvatarFallback>
                                                        </Avatar>
                                                    )}
                                                    <div className={cn("max-w-xs rounded-xl p-3 md:max-w-md", msg.senderId === landlord.uid ? "bg-primary text-primary-foreground" : "bg-secondary")}>
                                                        <p className="text-sm">{msg.text}</p>
                                                    </div>
                                                    {msg.senderId === landlord.uid && (
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage src={landlord.photoURL || undefined} />
                                                            <AvatarFallback>
                                                                <UserIcon className="h-4 w-4" />
                                                            </AvatarFallback>
                                                        </Avatar>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground px-12">
                                                    {isClient && msg.timestamp ? format(msg.timestamp.toDate(), 'MMM d, yyyy, h:mm a') : '...'}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                                {/* Message Input */}
                                <div className="border-t p-4">
                                    <form onSubmit={handleSendMessage} className="relative">
                                        <Input
                                            placeholder="Type your message..."
                                            className="pr-12"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                        />
                                        <Button type="submit" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8">
                                            <Send />
                                        </Button>
                                    </form>
                                </div>
                            </>
                        ) : (
                            <div className="hidden h-full md:flex flex-col items-center justify-center text-center">
                                <div className="rounded-full bg-secondary p-4">
                                    <Send className="h-10 w-10 text-muted-foreground" />
                                </div>
                                <h3 className="mt-4 text-lg font-semibold">Select a conversation</h3>
                                <p className="text-muted-foreground">Choose someone from the list to start chatting.</p>
                            </div>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
}


