"use client";

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Home, MessageSquare, PenLine, Pencil, Search, Send, Trash2 } from 'lucide-react';
import { collection, deleteDoc, doc, query, updateDoc, where } from 'firebase/firestore';
import { EmptyState, PageHeader, PageSkeleton, StatusBadge } from '@/components/dashboard';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { optimizedImageProps } from '@/config/images';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { useAsyncResult } from '@/hooks/use-async-result';
import { useToast } from '@/hooks/use-toast';
import { fetchDocsByIds } from '@/lib/firestore-batch';
import { formatPrice } from '@/lib/utils';
import type { Property, RentalApplication, UserProfile as User } from '@/types';

type AggregatedRequest = {
  request: RentalApplication;
  landlord: User | null;
  property: Property | null;
};



export default function StudentRequestsPage() {
  const { user: student, isUserLoading } = useUser();
  const firestore = useFirestore();

  const requestsQuery = useMemoFirebase(() => {
    if (!student) return null;
    return query(collection(firestore, 'rentalApplications'), where('tenantId', '==', student.uid));
  }, [student, firestore]);

  const { data: studentRequests, isLoading: areRequestsLoading } = useCollection<RentalApplication>(requestsQuery);

  const { data: aggregatedRequests = [], isLoading: isAggregating } = useAsyncResult(
    studentRequests,
    async (items): Promise<AggregatedRequest[]> => {
      const [people, properties] = await Promise.all([
        fetchDocsByIds<User>(firestore, 'users', items.map((x) => x.landlordId)),
        fetchDocsByIds<Property>(firestore, 'properties', items.map((x) => x.propertyId)),
      ]);
      return items
        .map((request) => ({
          request,
          landlord: people.get(request.landlordId) ?? null,
          property: properties.get(request.propertyId) ?? null,
        }))
        .sort((x, y) => new Date(y.request.applicationDate).getTime() - new Date(x.request.applicationDate).getTime());
    }, { keepPrevious: true });

  const [filter, setFilter] = React.useState<'open' | 'closed'>('open');
  const [requestToDelete, setRequestToDelete] = React.useState<string | null>(null);
  const [requestToEdit, setRequestToEdit] = React.useState<RentalApplication | null>(null);
  const [editMessage, setEditMessage] = React.useState('');
  const { toast } = useToast();

  const handleDeleteRequest = async () => {
    if (!requestToDelete || !firestore) return;

    try {
      await deleteDoc(doc(firestore, 'rentalApplications', requestToDelete));
      toast({
        title: "Request withdrawn",
        description: "The landlord will no longer see this request.",
      });
      setRequestToDelete(null);
    } catch (error) {
      console.error("Error deleting request:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not delete request. Please try again.",
      });
    }
  };

  const handleUpdateRequest = async () => {
    if (!requestToEdit || !firestore) return;

    try {
      await updateDoc(doc(firestore, 'rentalApplications', requestToEdit.id), {
        messageToLandlord: editMessage
      });
      toast({
        title: "Message updated",
        description: "The landlord will see your new message.",
      });
      setRequestToEdit(null);
    } catch (error) {
      console.error("Error updating request:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not update request. Please try again.",
      });
    }
  };

  if (isUserLoading || areRequestsLoading || isAggregating) {
    return <PageSkeleton variant="list" />;
  }

  const isOpen = (r: AggregatedRequest) => r.request.status !== 'declined';
  const visible = aggregatedRequests.filter((r) => (filter === 'open' ? isOpen(r) : !isOpen(r)));
  const openCount = aggregatedRequests.filter(isOpen).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My requests"
        description="Homes you've asked to rent, and what happens next."
        actions={
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/student/properties">
              <Search className="mr-1.5 h-4 w-4" /> Find more homes
            </Link>
          </Button>
        }
      />

      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList className="h-auto rounded-xl p-1">
          <TabsTrigger value="open" className="gap-2 rounded-lg px-3 py-1.5">
            Active <span className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground">{openCount}</span>
          </TabsTrigger>
          <TabsTrigger value="closed" className="gap-2 rounded-lg px-3 py-1.5">
            Closed{' '}
            <span className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground">{aggregatedRequests.length - openCount}</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {visible.length === 0 ? (
        <EmptyState
          icon={Send}
          title={filter === 'open' ? 'No active requests' : 'Nothing here yet'}
          description={
            filter === 'open'
              ? 'Find a home you like and send the landlord a request from the listing page.'
              : 'Requests that were declined will be listed here.'
          }
          action={
            <Button asChild className="rounded-xl">
              <Link href="/student/properties">Browse homes</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {visible.map(({ request, landlord, property }) => {
            const image = property?.images?.[0];
            const next =
              request.status === 'pending'
                ? { text: `Waiting for ${landlord?.name ?? 'the landlord'} to reply.`, tone: 'text-amber-700' }
                : request.status === 'approved'
                  ? { text: 'Accepted! Review and sign your lease to secure the home.', tone: 'text-emerald-700' }
                  : { text: 'This request was not accepted. Similar homes may still be available.', tone: 'text-muted-foreground' };
            return (
              <li key={request.id} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                <div className="flex flex-col sm:flex-row">
                  <Link
                    href={`/student/properties/${request.propertyId}`}
                    className="relative aspect-[16/9] w-full shrink-0 bg-muted sm:aspect-auto sm:w-48"
                  >
                    {image ? (
                      <Image {...optimizedImageProps(image)} alt={property?.title ?? ''} fill sizes="(max-width: 640px) 100vw, 192px" className="object-cover" />
                    ) : (
                      <Home aria-hidden className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
                    )}
                  </Link>
                  <div className="flex flex-1 flex-col gap-3 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link href={`/student/properties/${request.propertyId}`} className="font-semibold hover:underline">
                          {property?.title ?? 'Property'}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {property && `${formatPrice(property.price, property.currency)}/mo · `}
                          Sent {formatDistanceToNow(new Date(request.applicationDate), { addSuffix: true })}
                        </p>
                      </div>
                      <StatusBadge status={request.status} />
                    </div>
                    <p className={`text-sm ${next.tone}`}>{next.text}</p>
                    {request.messageToLandlord && (
                      <p className="line-clamp-2 text-sm italic text-muted-foreground">&ldquo;{request.messageToLandlord}&rdquo;</p>
                    )}
                    <div className="mt-auto flex flex-wrap gap-2 pt-1">
                      {request.status === 'approved' && (
                        <Button asChild size="sm" className="rounded-lg">
                          <Link href="/student/leases">
                            <PenLine className="mr-1.5 h-4 w-4" /> Review lease
                          </Link>
                        </Button>
                      )}
                      {request.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-lg"
                          onClick={() => {
                            setRequestToEdit(request);
                            setEditMessage(request.messageToLandlord || '');
                          }}
                        >
                          <Pencil className="mr-1.5 h-4 w-4" /> Edit message
                        </Button>
                      )}
                      {request.status === 'declined' && (
                        <Button asChild size="sm" className="rounded-lg">
                          <Link href="/student/properties">Find similar homes</Link>
                        </Button>
                      )}
                      <Button asChild size="sm" variant="ghost" className="rounded-lg">
                        <Link href={`/student/messages?contact=${request.landlordId}`}>
                          <MessageSquare className="mr-1.5 h-4 w-4" /> Message
                        </Link>
                      </Button>
                      {request.status !== 'approved' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setRequestToDelete(request.id)}
                        >
                          <Trash2 className="mr-1.5 h-4 w-4" /> {request.status === 'pending' ? 'Withdraw' : 'Remove'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AlertDialog open={!!requestToDelete} onOpenChange={(open) => !open && setRequestToDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw this request?</AlertDialogTitle>
            <AlertDialogDescription>The landlord will no longer see your request. You can send a new one later.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Keep request</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRequest} className="rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Withdraw
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!requestToEdit} onOpenChange={(open) => !open && setRequestToEdit(null)}>
        <DialogContent className="rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit your message</DialogTitle>
            <DialogDescription>Tell the landlord a little about yourself and when you'd like to move in.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={editMessage}
            onChange={(e) => setEditMessage(e.target.value)}
            rows={6}
            className="rounded-xl"
            placeholder="Hi! I'm a 300-level student at…"
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-lg" onClick={() => setRequestToEdit(null)}>
              Cancel
            </Button>
            <Button className="rounded-lg" onClick={handleUpdateRequest} disabled={!editMessage.trim()}>
              Save message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
