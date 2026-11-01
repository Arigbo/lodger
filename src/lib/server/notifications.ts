import 'server-only';
import { getAdminDb } from '@/firebase/admin';

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/**
 * Notifies every other active applicant that the property has been rented.
 * Returns the number of notifications written.
 */
export async function notifyRejectedApplicants(propertyId: string, winnerTenantId: string, propertyTitle: string) {
  const db = getAdminDb();
  const snapshot = await db
    .collection('rentalApplications')
    .where('propertyId', '==', propertyId)
    .where('status', 'in', ['pending', 'approved', 'accepted'])
    .get();

  const applicantIds = new Set<string>();
  snapshot.docs.forEach((doc) => {
    const tenantId = doc.data().tenantId as string | undefined;
    if (tenantId && tenantId !== winnerTenantId) applicantIds.add(tenantId);
  });
  if (applicantIds.size === 0) return 0;

  const batch = db.batch();
  const createdAt = new Date().toISOString();
  applicantIds.forEach((userId) => {
    batch.set(db.collection('notifications').doc(), {
      userId,
      title: 'Property no longer available',
      message: `"${propertyTitle}" has been rented by another student. Explore similar listings.`,
      type: 'info',
      read: false,
      createdAt,
      link: '/properties',
      propertyId,
    });
  });
  await batch.commit();
  return applicantIds.size;
}

export type BroadcastTarget = 'all' | 'landlords' | 'students' | 'no-stripe';

export async function dispatchBroadcast({
  title,
  message,
  target,
  type = 'info',
  sendEmail = false,
}: {
  title: string;
  message: string;
  target: BroadcastTarget;
  type?: string;
  sendEmail?: boolean;
}) {
  const db = getAdminDb();
  let usersQuery: FirebaseFirestore.Query = db.collection('users');
  if (target === 'landlords') usersQuery = usersQuery.where('role', '==', 'landlord');
  else if (target === 'students') usersQuery = usersQuery.where('role', '==', 'student');
  else if (target === 'no-stripe')
    usersQuery = usersQuery.where('role', '==', 'landlord').where('stripeDetailsSubmitted', '==', false);

  const snapshot = await usersQuery.get();
  if (snapshot.empty) return { success: true, count: 0 };

  const createdAt = new Date().toISOString();
  const emails: { to: string; subject: string; html: string }[] = [];
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #eee;border-radius:10px">
      <h2 style="color:#000">${escapeHtml(title)}</h2>
      <p style="color:#555;line-height:1.6">${escapeHtml(message)}</p>
      <hr style="border:0;border-top:1px solid #eee;margin:20px 0">
      <p style="font-size:11px;color:#999">Sent by the Lodger team</p>
    </div>`;

  // Firestore batches are limited to 500 writes.
  for (let i = 0; i < snapshot.docs.length; i += 450) {
    const batch = db.batch();
    snapshot.docs.slice(i, i + 450).forEach((doc) => {
      const user = doc.data();
      batch.set(db.collection('notifications').doc(), {
        userId: doc.id,
        title,
        message,
        type,
        read: false,
        createdAt,
        link: user.role === 'landlord' ? '/landlord' : '/student',
      });
      if (sendEmail && user.email) emails.push({ to: user.email, subject: title, html });
    });
    await batch.commit();
  }

  if (emails.length > 0) {
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY is missing. Skipping email delivery.');
    } else {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      const from = process.env.RESEND_FROM_EMAIL || 'Lodger <notifications@lodger.com>';
      const results = await Promise.allSettled(emails.map((email) => resend.emails.send({ from, ...email })));
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed) console.error(`Broadcast: ${failed}/${emails.length} emails failed to send.`);
    }
  }

  return { success: true, count: snapshot.size };
}
