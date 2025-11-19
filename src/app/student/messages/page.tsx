

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
import { cn } from '@/lib/utils';
import type { User, Message, Property } from '@/lib/definitions';
import { Send, Phone, Video, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, orderBy, getDocs, doc, addDoc, serverTimestamp, limit } from 'firebase/firestore';


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

    const selectedConversationId = searchParams.get('conversationId');
    const contactId = searchParams.get('contact');

    const { data: newContact, isLoading: isContactLoading } = useDoc<User>(
        useMemoFirebase(() => (contactId ? doc(firestore, 'users', contactId) : null), [contactId, firestore])
    );
    
    // Effect to set client-side flag
    useEffect(() => {
        setIsClient(true);
    }, []);

    // Effect to fetch all conversations for the student
    useEffect(() => {
        if (!student || !firestore) return;

        const fetchConversations = async () => {
            // 1. Get existing messages to find participants
            const messagesRef = collection(firestore, 'messages');
            const q = query(messagesRef, where('participantIds', 'array-contains', student.uid));
            const messagesSnapshot = await getDocs(q);

            const participantIds = new Set<string>();
            messagesSnapshot.forEach(doc => {
                const data = doc.data();
                const otherParticipant = data.participantIds.find((id: string) => id !== student.uid);
                if (otherParticipant) {
                    participantIds.add(otherParticipant);
                }
            });

            // 2. Find student's current landlord
            const rentedPropertiesQuery = query(collection(firestore, 'properties'), where('currentTenantId', '==', student.uid), limit(1));
            const rentedPropertiesSnapshot = await getDocs(rentedPropertiesQuery);
            if (!rentedPropertiesSnapshot.empty) {
                const property = rentedPropertiesSnapshot.docs[0].data() as Property;
                participantIds.add(property.landlordId);
            }
            
            if (participantIds.size === 0 && !newContact) {
                 setConversations([]);
                 return;
            }

            const allParticipantIds = Array.from(participantIds);
            if (newContact && !allParticipantIds.includes(newContact.id)) {
                allParticipantIds.push(newContact.id);
            }
            
            if(allParticipantIds.length === 0) return;

            const usersQuery = query(collection(firestore, 'users'), where('id', 'in', allParticipantIds));
            const usersSnapshot = await getDocs(usersQuery);
            const usersMap = new Map<string, User>();
            usersSnapshot.forEach(doc => usersMap.set(doc.id, { id: doc.id, ...doc.data() } as User));

            const convoPromises = allParticipantIds.map(async (pId) => {
                const participant = usersMap.get(pId);
                if (!participant) return null;

                const lastMessageQuery = query(
                    collection(firestore, 'messages'),
                    where('participantIds', 'array-contains', student.uid),
                    where('participantIds', 'array-contains', pId),
                    orderBy('timestamp', 'desc'),
                    limit(1)
                );
                
                const lastMessageSnapshot = await getDocs(lastMessageQuery);
                const lastMessageDoc = lastMessageSnapshot.docs[0];

                return {
                    participant,
                    lastMessage: lastMessageDoc?.data()?.text || 'Start a new conversation.',
                    lastMessageTimestamp: lastMessageDoc?.data()?.timestamp?.toDate() || new Date(0), // Use epoch for sorting if no message
                    unreadCount: 0, // Unread count logic needs to be implemented
                } as Conversation;
            });

            const resolvedConversations = (await Promise.all(convoPromises)).filter(Boolean) as Conversation[];
            resolvedConversations.sort((a,b) => (b.lastMessageTimestamp?.getTime() || 0) - (a.lastMessageTimestamp?.getTime() || 0));
            setConversations(resolvedConversations);
        };

        fetchConversations();
    }, [student, firestore, newContact]);

    // Effect to set the selected conversation based on URL param
    useEffect(() => {
        const targetId = contactId || selectedConversationId;

        if (targetId) {
            const participant = conversations.find(c => c.participant.id === targetId)?.participant;
            if (participant) {
                setSelectedParticipant(participant);
                 // Update URL to reflect the conversation
                if (contactId) {
                    router.replace(`${pathname}?conversationId=${contactId}`, { scroll: false });
                }
            }
        } else if (conversations.length > 0 && !selectedParticipant) {
            // Default to first conversation
            setSelectedParticipant(conversations[0].participant);
             router.replace(`${pathname}?conversationId=${conversations[0].participant.id}`, { scroll: false });
        }
    }, [contactId, selectedConversationId, conversations, selectedParticipant, router, pathname]);
    
    // Memoized query for the selected conversation's messages
    const messagesQuery = useMemoFirebase(() => {
        if (!student || !selectedParticipant) return null;
        return query(
            collection(firestore, 'messages'),
            where('participantIds', 'array-contains', student.uid),
            where('participantIds', 'array-contains', selectedParticipant.id),
            orderBy('timestamp', 'asc')
        );
    }, [firestore, student, selectedParticipant]);

    const { data: messages } = useCollection<Message>(messagesQuery);
    
    const handleSendMessage = async () => {
        if (!newMessage.trim() || !student || !selectedParticipant || !firestore) return;

        const messagesRef = collection(firestore, 'messages');
        try {
            await addDoc(messagesRef, {
                text: newMessage,
                senderId: student.uid,
                recipientId: selectedParticipant.id,
                participantIds: [student.uid, selectedParticipant.id],
                timestamp: serverTimestamp(),
                read: false,
            });

            setNewMessage('');
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    if (isUserLoading) {
        return <div>Loading...</div>
    }

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

                    {/* Chat Window */}
                    <div className="col-span-2 flex flex-col h-full">
                        {selectedParticipant && student ? (
                            <>
                            {/* Chat Header */}
                             <div className="flex items-center justify-between border-b p-4">
                                <div className="flex items-center gap-4 group">
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
                            {/* Messages Area */}
                            <ScrollArea className="flex-grow p-6">
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
                                </div>
                            </ScrollArea>
                            {/* Message Input */}
                            <div className="border-t p-4">
                                <form onSubmit={(e) => {e.preventDefault(); handleSendMessage();}} className="relative">
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
                            <div className="flex h-full flex-col items-center justify-center text-center p-6">
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
