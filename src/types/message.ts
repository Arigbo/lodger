import { UserProfile } from "./user";

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
    timestamp: any;
    read: boolean;
    participantIds: string[];
};
