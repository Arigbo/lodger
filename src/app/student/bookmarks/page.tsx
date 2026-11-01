'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, Search } from 'lucide-react';
import { EmptyState, PageHeader, PageSkeleton } from '@/components/dashboard';
import PropertyCard from '@/components/properties/property-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFirestore, useUser } from '@/firebase';
import { useAsyncResult } from '@/hooks/use-async-result';
import { fetchDocsByIds } from '@/lib/firestore-batch';
import type { Property } from '@/types';

export default function SavedHomesPage() {
  const { profile } = useUser();
  const firestore = useFirestore();
  const [search, setSearch] = useState('');

  // Load only the saved homes (not every listing), keyed by the ID list.
  const savedIds = profile?.bookmarkedPropertyIds ?? [];
  const idsKey = [...savedIds].sort().join(',');
  const { data: byId, isLoading } = useAsyncResult(
    idsKey || null,
    (key) => fetchDocsByIds<Property>(firestore, 'properties', key.split(',')),
    { keepPrevious: true },
  );

  if (isLoading) return <PageSkeleton variant="grid" />;

  // Preserve the order homes were saved in, newest first.
  const saved = [...savedIds].reverse().flatMap((id) => {
    const property = byId?.get(id);
    return property ? [property] : [];
  });
  const term = search.trim().toLowerCase();
  const visible = saved.filter(
    (p) => !term || [p.title, p.location?.address, p.location?.city, p.location?.school].some((v) => v?.toLowerCase().includes(term)),
  );
  const available = saved.filter((p) => p.status === 'available').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Saved homes"
        description={
          saved.length
            ? `${saved.length} saved · ${available} still available`
            : 'Tap the heart on any listing to keep it on your shortlist.'
        }
      />

      {saved.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="No saved homes yet"
          description="Save homes you like while browsing so you can compare them and come back later."
          action={
            <Button asChild className="rounded-xl">
              <Link href="/student/properties">Browse homes</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="relative max-w-sm">
            <Search aria-hidden className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search saved homes"
              aria-label="Search saved homes"
              className="h-10 rounded-xl pl-9"
            />
          </div>
          {visible.length ? (
            <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((property) => (
                <li key={property.id} className={property.status !== 'available' ? 'opacity-70' : undefined}>
                  <PropertyCard property={property} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Search} title="No saved homes match your search" />
          )}
        </>
      )}
    </div>
  );
}
