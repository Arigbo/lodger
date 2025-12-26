export type MaintenanceRequest = {
    id: string;
    propertyId: string;
    landlordId: string;
    tenantId: string;
    title: string;
    description: string;
    category: 'Plumbing' | 'Electrical' | 'Appliance' | 'General' | 'Other';
    status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
    priority: 'Low' | 'Medium' | 'High';
    requestDate: string; // ISO 8601 date string
    completedDate?: string | null; // ISO 8601 date string
};
