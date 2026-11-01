import { describe, expect, it } from 'vitest';
import { buildNotification, type NotificationType } from './notifications';

const ALL_TYPES: NotificationType[] = [
  'WELCOME', 'NEW_MESSAGE', 'NEW_REQUEST', 'REQUEST_ACCEPTED', 'REQUEST_REJECTED', 'MAINTENANCE_REQUEST',
  'RENT_DUE', 'LEASE_GENERATED', 'LEASE_SIGNED', 'TENANCY_ENDED', 'REVIEW_SUBMITTED', 'OFFLINE_PAYMENT_PENDING',
  'OFFLINE_PAYMENT_APPROVED', 'OFFLINE_PAYMENT_REJECTED', 'LEASE_EXPIRED', 'LEASE_TERMS_CHANGED',
  'PROPERTY_OCCUPIED', 'TENANCY_TERMINATING',
];

describe('buildNotification', () => {
  it.each(ALL_TYPES)('produces a title and message for %s', (type) => {
    const n = buildNotification({ toUserId: 'u1', type, propertyName: 'Sunny Flat', senderName: 'Ada' });
    expect(n.title).not.toBe('');
    expect(n.message).not.toBe('');
    expect(n.read).toBe(false);
    expect(n.userId).toBe('u1');
  });

  it('interpolates sender and property', () => {
    const n = buildNotification({ toUserId: 'u1', type: 'NEW_REQUEST', senderName: 'Ada', propertyName: 'Sunny Flat' });
    expect(n.message).toContain('Ada');
    expect(n.message).toContain('Sunny Flat');
    expect(n.link).toBe('/landlord/requests');
  });

  it('prefers custom messages and explicit links', () => {
    const n = buildNotification({ toUserId: 'u1', type: 'NEW_MESSAGE', customMessage: 'Hello!', link: '/x' });
    expect(n.message).toBe('Hello!');
    expect(n.link).toBe('/x');
  });
});
