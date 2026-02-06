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

export async function dispatchBroadcast({
    title,
    message,
    target,
    type,
    sendEmail = false
}: {
    title: string;
    message: string;
    target: string;
    type: string;
    sendEmail?: boolean;
}) {
    try {
        let usersQuery = db.collection('users');
        
        if (target === 'landlords') {
            usersQuery = usersQuery.where('role', '==', 'landlord') as any;
        } else if (target === 'students') {
            usersQuery = usersQuery.where('role', '==', 'student') as any;
        } else if (target === 'no-stripe') {
            usersQuery = usersQuery.where('role', '==', 'landlord').where('stripeDetailsSubmitted', '==', false) as any;
        }

        const snapshot = await usersQuery.get();
        if (snapshot.empty) return { success: true, count: 0 };

        const batch = db.batch();
        const notificationsRef = db.collection('notifications');
        const emails: { to: string; subject: string; html: string }[] = [];

        snapshot.docs.forEach(doc => {
            const userData = doc.data();
            const userId = doc.id;

            // 1. Create In-App Notification
            const notifRef = notificationsRef.doc();
            batch.set(notifRef, {
                userId,
                title,
                message,
                type: type || 'info',
                read: false,
                createdAt: new Date().toISOString(),
                link: userData.role === 'landlord' ? '/landlord' : '/student'
            });

            // 2. Prepare Email if requested
            if (sendEmail && userData.email) {
                emails.push({
                    to: userData.email,
                    subject: title,
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                            <h2 style="color: #000; text-transform: uppercase; letter-spacing: -1px;">${title}</h2>
                            <p style="color: #666; line-height: 1.6;">${message}</p>
                            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                            <p style="font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 1px;">Sent from Lodger Admin Console</p>
                        </div>
                    `
                });
            }
        });

        await batch.commit();

        // 3. Handle Emails via Resend (Optional)
        if (sendEmail && emails.length > 0 && process.env.RESEND_API_KEY) {
            try {
                const { Resend } = await import('resend');
                const resend = new Resend(process.env.RESEND_API_KEY);
                
                // We send in chunks if necessary, but for now we'll batch send
                await Promise.all(emails.map(email => 
                    resend.emails.send({
                        from: 'Lodger <notifications@lodger.com>', // User needs to verify domain in Resend
                        ...email
                    })
                ));
            } catch (emailError) {
                console.error("Email delivery failed:", emailError);
            }
        }

        return { success: true, count: snapshot.size };
    } catch (error) {
        console.error("Broadcast dispatch failed:", error);
        throw error;
    }
}
