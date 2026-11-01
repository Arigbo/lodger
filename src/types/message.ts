import { UserProfile } from "@/types/user";
import type { Timestamp } from "firebase/firestore";

export type Conversation = {
    id: string; // Corresponds to the participant's user ID
    participant: UserProfile;
    lastMessage: string;
    lastMessageTimestamp: string;
    unreadCount: number;
};

export type Message = {
    id: string;
    senderId: string;
    recipientId: string;
    text: string;
    /** Server timestamp; null until the write is acknowledged. */
    timestamp: Timestamp | null;
    read: boolean;
    participantIds: string[];
};
