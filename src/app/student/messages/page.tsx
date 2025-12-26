
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { cn } from '@/utils';
import type { UserProfile as User, Message, Property } from '@/types';
import { Send } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, where, getDocs, doc, addDoc, serverTimestamp, limit, documentId } from 'firebase/firestore';
import Loading from '@/app/loading';
import { sendNotification } from '@/lib/notifications';
import { ConversationList } from './components/ConversationList';
import { ChatArea } from './components/ChatArea';

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
    const [isDataLoading, setIsDataLoading] = useState(true);

    const selectedConversationId = searchParams.get('conversationId');
    const contactId = searchParams.get('contact');

    const { data: newContact } = useDoc<User>(
        useMemoFirebase(() => (contactId ? doc(firestore, 'users', contactId) : null), [contactId, firestore])
    );

    // Fetch current student's profile for avatar
    const studentDocRef = useMemoFirebase(
        () => student ? doc(firestore, 'users', student.uid) : null,
        [student, firestore]
    );
    const { data: studentProfile } = useDoc<User>(studentDocRef);

    useEffect(() => {
        setIsClient(true);
    }, []);

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

    const handleSendMessage = (text: string) => {
        if (!text.trim() || !student || !selectedParticipant || !firestore) return;

        const messagesRef = collection(firestore, 'messages');
        const messageData = {
            text: text,
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
                    customMessage: text,
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
    };

    if (isUserLoading || isDataLoading) {
        return <Loading />;
    }

    return (
        <div className="h-[calc(100vh-8rem)] min-h-[600px] flex flex-col space-y-6 animate-in fade-in duration-700">
            {/* Sleek Page Header */}
            {!selectedConversationId && (
                <div className="px-2 space-y-1">
                    <h1 className="font-headline text-3xl font-black tracking-tight text-foreground uppercase italic px-1">
                        Inbox<span className="text-primary italic">.</span>
                    </h1>
                    <div className="h-1 w-12 bg-primary rounded-full" />
                </div>
            )}

            <div className="flex-1 overflow-hidden bg-white border-2 border-muted/10 rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row relative">
                <div className={cn(
                    "w-full md:w-80 lg:w-[400px] border-r border-muted/10",
                    selectedConversationId ? "hidden md:block" : "block"
                )}>
                    <ConversationList
                        conversations={conversations}
                        selectedParticipantId={selectedParticipant?.id}
                    />
                </div>

                <div className={cn(
                    "flex-1 flex flex-col bg-white relative",
                    selectedConversationId ? "flex" : "hidden md:flex"
                )}>
                    {selectedParticipant && student ? (
                        <ChatArea
                            participant={selectedParticipant}
                            student={student}
                            studentProfile={studentProfile || undefined}
                            messages={messages}
                            onSendMessage={handleSendMessage}
                        />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-8 animate-in zoom-in duration-700 bg-muted/5">
                            <div className="relative">
                                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />
                                <div className="relative h-32 w-32 flex items-center justify-center rounded-[3rem] bg-white shadow-2xl border-2 border-muted/5">
                                    <Send className="h-14 w-14 text-muted-foreground/10 rotate-12" />
                                </div>
                            </div>
                            <div className="space-y-4 max-w-sm mx-auto">
                                <h3 className="text-3xl font-black italic uppercase tracking-tighter">Open a Dialogue</h3>
                                <p className="text-lg text-muted-foreground font-serif italic">
                                    &quot;Select a contact to begin your secured conversation.&quot;
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


