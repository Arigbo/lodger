export interface Notification {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    read: boolean;
    createdAt: string; // ISO string
    link?: string; // Optional link to redirect to (e.g., /landlord/requests/123)
}
