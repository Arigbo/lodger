'use client';

import { collection, query, where } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { useNotifications } from '@/hooks/useNotifications';
import type { DashboardRole, NavItem } from '@/config/navigation';

/** Live counts shown next to sidebar items. */
export function useNavBadges(role: DashboardRole): Partial<Record<NonNullable<NavItem['badge']>, number>> {
  const { user } = useUser();
  const firestore = useFirestore();
  const { unreadCount } = useNotifications(user?.uid ?? null);
  const isLandlord = role === 'landlord' && !!user;

  const requestsQuery = useMemoFirebase(
    () =>
      isLandlord
        ? query(collection(firestore, 'rentalApplications'), where('landlordId', '==', user!.uid), where('status', '==', 'pending'))
        : null,
    [isLandlord, user, firestore],
  );
  const maintenanceQuery = useMemoFirebase(
    () =>
      isLandlord
        ? query(collection(firestore, 'maintenanceRequests'), where('landlordId', '==', user!.uid), where('status', '==', 'Pending'))
        : null,
    [isLandlord, user, firestore],
  );
  const { data: requests } = useCollection(requestsQuery);
  const { data: maintenance } = useCollection(maintenanceQuery);

  return {
    notifications: unreadCount,
    requests: requests?.length ?? 0,
    maintenance: maintenance?.length ?? 0,
  };
}
