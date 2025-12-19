
'use client';
import { useState, useEffect, useMemo, useCallback, useRef, FormEvent } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/utils';
import type { UserProfile as User, Message, Property } from '@/types';
import { Send, Phone, Video, User as UserIcon, ArrowLeft } from 'lucide-react';
import format from "date-fns/format";
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, where, orderBy, getDocs, doc, addDoc, serverTimestamp, limit, documentId } from 'firebase/firestore';
import Loading from '@/app/loading';
import { sendNotification } from '@/lib/notifications';


type Conversation = {
    participant: User;
    lastMessage: string;
    lastMessageTimestamp: Date | null;
    unreadCount: number;
};

export default function MessagesPage() {
    const { user: student, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedParticipant, setSelectedParticipant] = useState<User | null>(null);
    const [isClient, setIsClient] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [isDataLoading, setIsDataLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const selectedConversationId = searchParams.get('conversationId');
    const contactId = searchParams.get('contact');

    const { data: newContact } = useDoc<User>(
        useMemoFirebase(() => (contactId ? doc(firestore, 'users', contactId) : null), [contactId, firestore])
    );

    useEffect(() => {
        setIsClient(true);
    }, []);

    // This query now correctly aligns with the security rules.
    const allMessagesQuery = useMemoFirebase(() => {
        if (!student) return null;
        return query(
            collection(firestore, 'messages'),
            where('participantIds', 'array-contains', student.uid)
        );
    }, [firestore, student]);

    const { data: allStudentMessages, isLoading: messagesLoading } = useCollection<Message>(allMessagesQuery);

    useEffect(() => {
        if (isUserLoading || messagesLoading) return;
        if (!student) {
            setIsDataLoading(false);
            return;
        }

        const processConversations = async () => {
            setIsDataLoading(true);

            const conversationsMap = new Map<string, { lastMessage: Message, participantId: string }>();
            (allStudentMessages || []).forEach(msg => {
                const otherParticipantId = msg.participantIds.find(id => id !== student.uid);
                if (otherParticipantId) {
                    if (!conversationsMap.has(otherParticipantId) || (msg.timestamp && conversationsMap.get(otherParticipantId)!.lastMessage.timestamp && msg.timestamp.toMillis() > conversationsMap.get(otherParticipantId)!.lastMessage.timestamp.toMillis())) {
                        conversationsMap.set(otherParticipantId, { lastMessage: msg, participantId: otherParticipantId });
                    }
                }
            });

            const participantIds = new Set(Array.from(conversationsMap.keys()));

            // Also find the landlord of the currently rented property
            const rentedPropertiesQuery = query(collection(firestore, 'properties'), where('currentTenantId', '==', student.uid), limit(1));
            const rentedPropertiesSnapshot = await getDocs(rentedPropertiesQuery);
            if (!rentedPropertiesSnapshot.empty) {
                const property = rentedPropertiesSnapshot.docs[0].data() as Property;
                participantIds.add(property.landlordId);
            }

            if (newContact) {
                participantIds.add(newContact.id);
            }

            if (participantIds.size === 0) {
                setConversations([]);
                setIsDataLoading(false);
                return;
            }

            const allParticipantIds = Array.from(participantIds);
            const usersQuery = query(collection(firestore, 'users'), where(documentId(), 'in', allParticipantIds));
            const usersSnapshot = await getDocs(usersQuery);
            const usersMap = new Map<string, User>();
            usersSnapshot.forEach((docSnap: any) => usersMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as User));

            const convos = allParticipantIds.map(pId => {
                const participant = usersMap.get(pId);
                if (!participant) return null;

                const convoData = conversationsMap.get(pId);

                return {
                    participant,
                    lastMessage: convoData?.lastMessage.text || 'Start a new conversation.',
                    lastMessageTimestamp: convoData?.lastMessage.timestamp?.toDate() || new Date(0),
                    unreadCount: 0,
                } as Conversation;
            }).filter(Boolean) as Conversation[];

            convos.sort((a, b) => (b.lastMessageTimestamp?.getTime() || 0) - (a.lastMessageTimestamp?.getTime() || 0));
            setConversations(convos);
            setIsDataLoading(false);
        };

        processConversations();
    }, [student, firestore, newContact, isUserLoading, allStudentMessages, messagesLoading]);

    useEffect(() => {
        const targetId = contactId || selectedConversationId;

        if (targetId) {
            const participant = conversations.find(c => c.participant.id === targetId)?.participant;
            if (participant) {
                setSelectedParticipant(participant);
                if (contactId) {
                    router.replace(`${pathname}?conversationId=${contactId}`, { scroll: false });
                }
            }
        } else if (conversations.length > 0 && !selectedParticipant) {
            setSelectedParticipant(conversations[0].participant);
            router.replace(`${pathname}?conversationId=${conversations[0].participant.id}`, { scroll: false });
        }
    }, [contactId, selectedConversationId, conversations, selectedParticipant, router, pathname]);

    const messages = useMemo(() => {
        if (!allStudentMessages || !selectedParticipant) return [];
        return allStudentMessages
            .filter(msg => msg.participantIds.includes(selectedParticipant.id))
            .sort((a, b) => {
                if (a.timestamp && b.timestamp) {
                    return a.timestamp.toMillis() - b.timestamp.toMillis();
                }
                return 0;
            });
    }, [allStudentMessages, selectedParticipant]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, selectedConversationId]);

    const handleSendMessage = (e: FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !student || !selectedParticipant || !firestore) return;

        const messagesRef = collection(firestore, 'messages');
        const messageData = {
            text: newMessage,
            senderId: student.uid,
            recipientId: selectedParticipant.id,
            participantIds: [student.uid, selectedParticipant.id].sort(),
            timestamp: serverTimestamp(),
            read: false,
        };

        addDoc(messagesRef, messageData)
            .then(() => {
                return sendNotification({
                    toUserId: selectedParticipant.id,
                    type: 'NEW_MESSAGE',
                    firestore: firestore,
                    senderName: student.displayName || 'Student',
                    customMessage: newMessage,
                    link: `/landlord/messages?conversationId=${student.uid}`
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

        setNewMessage('');
    };

    if (isUserLoading || isDataLoading) {
        return <Loading />;
    }

    return (
        <div>
            <div className="mb-8">
                <h1 className="font-headline text-3xl font-bold">Messages</h1>
                <p className="text-muted-foreground">Communicate with your landlords.</p>
            </div>
            {/* Use dvh for mobile viewport height to handle address bars correctly */}
            <Card className="h-[calc(100dvh-12rem)] md:h-[calc(100vh-12rem)] overflow-hidden">
                <div className="grid h-full grid-cols-1 md:grid-cols-3">
                    <div className={cn(
                        "flex flex-col border-r",
                        "md:flex",
                        selectedConversationId ? "hidden" : "flex"
                    )}>
                        <CardHeader>
                            <CardTitle>Conversations</CardTitle>
                        </CardHeader>
                        <Separator />
                        <ScrollArea className="flex-1">
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
                                                <p className="text-xs text-muted-foreground whitespace-nowrap">{isClient && convo.lastMessageTimestamp && convo.lastMessageTimestamp.getTime() > 0 ? format(convo.lastMessageTimestamp, "p") : ''}</p>
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

                    <div className={cn(
                        "col-span-2 flex-col h-full overflow-hidden",
                        selectedConversationId ? "flex" : "hidden",
                        "md:flex"
                    )}>
                        {selectedParticipant && student ? (
                            <>
                                <div className="flex items-center justify-between border-b p-4">
                                    <div className="flex items-center gap-4 group">
                                        <Button variant="ghost" size="icon" className="md:hidden" asChild>
                                            <Link href="/student/messages" scroll={false}>
                                                <ArrowLeft />
                                            </Link>
                                        </Button>
                                        <Avatar>
                                            <AvatarImage src={selectedParticipant.profileImageUrl} />
                                            <AvatarFallback>
                                                <UserIcon className="h-4 w-4" />
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold">{selectedParticipant.name}</p>
                                            <p className="text-xs text-muted-foreground">Online</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="icon"><Phone /></Button>
                                        <Button variant="ghost" size="icon"><Video /></Button>
                                    </div>
                                </div>
                                <ScrollArea className="flex-1 p-6">
                                    <div className="space-y-6">
                                        {messages?.map(msg => (
                                            <div key={msg.id} className={cn("flex flex-col gap-1", msg.senderId === student.uid ? "items-end" : "items-start")}>
                                                <div className={cn("flex items-end gap-3", msg.senderId === student.uid ? "justify-end" : "justify-start")}>
                                                    {msg.senderId !== student.uid && (
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage src={selectedParticipant.profileImageUrl} />
                                                            <AvatarFallback>
                                                                <UserIcon className="h-4 w-4" />
                                                            </AvatarFallback>
                                                        </Avatar>
                                                    )}
                                                    <div className={cn("max-w-xs rounded-xl p-3 md:max-w-md", msg.senderId === student.uid ? "bg-primary text-primary-foreground" : "bg-secondary")}>
                                                        <p className="text-sm">{msg.text}</p>
                                                    </div>
                                                    {msg.senderId === student.uid && (
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage src={student.photoURL || undefined} />
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
                                        <div ref={messagesEndRef} />
                                    </div>
                                </ScrollArea>
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
                            <div className="hidden h-full md:flex flex-col items-center justify-center text-center p-6">
                                <div className="rounded-full bg-secondary p-4">
                                    <Send className="h-10 w-10 text-muted-foreground" />
                                </div>
                                <h3 className="mt-4 text-lg font-semibold">Select a conversation</h3>
                                <p className="text-muted-foreground">Choose a landlord from the list to start chatting, or find a property to contact a new landlord.</p>
                            </div>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
}


