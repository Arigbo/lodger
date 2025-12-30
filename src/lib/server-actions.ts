import { db } from "@/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export async function notifyRejectedApplicants(propertyId: string, winnerTenantId: string, propertyTitle: string) {
    try {
        const requestsRef = db.collection('property_requests');
        const snapshot = await requestsRef
            .where('propertyId', '==', propertyId)
            .where('status', 'in', ['pending', 'accepted']) // Only notify active requests
            .get();

        if (snapshot.empty) {
            console.log('No other applicants to notify.');
            return;
        }

        const batch = db.batch();
        const notificationsRef = db.collection('notifications');

        let count = 0;
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const applicantId = data.userId; // Assuming 'userId' is the field for the applicant

            // Skip the winner
            if (applicantId === winnerTenantId) return;

            // Update request status to 'closed' or 'rejected' to reflect occupied state
            // Optional: batch.update(doc.ref, { status: 'closed' });

            // Create notification for this applicant
            const notifRef = notificationsRef.doc();
            batch.set(notifRef, {
                userId: applicantId,
                title: 'Property No Longer Available',
                message: `The property "${propertyTitle}" you requested is now occupied by another tenant. We recommend exploring similar listings.`,
                type: 'info',
                read: false,
                createdAt: new Date().toISOString(),
                link: '/student/properties', // Redirect to search
                propertyId: propertyId
            });
            count++;
        });

        if (count > 0) {
            await batch.commit();
            console.log(`Notified ${count} other applicants for property ${propertyId}`);
        }
    } catch (error) {
        console.error('Error notifying rejected applicants:', error);
        // Don't throw, just log. This is a background task.
    }
}
