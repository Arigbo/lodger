
'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { RentalApplication, UserProfile as User, Property } from '@/types';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import Loading from '@/app/loading';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from "@/components/dashboard";
import { useAsyncResult } from "@/hooks/use-async-result";
import { fetchDocsByIds } from "@/lib/firestore-batch";

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

  const [requestToDelete, setRequestToDelete] = React.useState<string | null>(null);
  const [requestToEdit, setRequestToEdit] = React.useState<RentalApplication | null>(null);
  const [editMessage, setEditMessage] = React.useState('');
  const { toast } = useToast();

  const handleDeleteRequest = async () => {
    if (!requestToDelete || !firestore) return;

    try {
      await deleteDoc(doc(firestore, 'rentalApplications', requestToDelete));
      toast({
        title: "Request Deleted",
        description: "Your rental application has been cancelled.",
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
        title: "Request Updated",
        description: "Your application details have been updated.",
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
    return <Loading />;
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <PageHeader title="My requests" description="Track the rental requests you've sent to landlords." />

      {aggregatedRequests.length > 0 ? (
        <Card className="overflow-hidden border border-foreground/5 bg-card shadow-sm rounded-3xl">
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 border-none">
                  <TableHead className="px-8 font-bold text-foreground">Property</TableHead>
                  <TableHead className="font-bold text-foreground">Landlord</TableHead>
                  <TableHead className="font-bold text-foreground">Date Applied</TableHead>
                  <TableHead className="font-bold text-foreground">Status</TableHead>
                  <TableHead className="text-right px-8 font-bold text-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aggregatedRequests.map(({ request, landlord, property }) => (
                  <TableRow key={request.id} className="border-muted/10 hover:bg-muted/5 transition-colors text-xs sm:text-xs md:text-sm">
                    <TableCell className="px-8 font-bold">
                      <Link href={`/student/properties/${property?.id}`} className="hover:text-primary transition-colors whitespace-nowrap">
                        {property?.title || 'Unknown Property'}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium whitespace-nowrap">{landlord?.name || 'N/A'}</TableCell>
                    <TableCell className="font-medium text-muted-foreground whitespace-nowrap">
                      {new Date(request.applicationDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn(
                        "rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-wider border-none",
                        request.status === 'approved' ? "bg-green-500/10 text-green-600" :
                          request.status === 'declined' ? "bg-red-500/10 text-red-600" :
                            "bg-primary/10 text-primary"
                      )}>
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right px-8 space-x-2 whitespace-nowrap">
                      {request.status === 'approved' && (
                        <Button size="sm" className="rounded-xl font-bold" asChild>
                          <Link href="/student/leases">View Lease</Link>
                        </Button>
                      )}
                      {request.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl font-bold"
                          onClick={() => {
                            setRequestToEdit(request);
                            setEditMessage(request.messageToLandlord || '');
                          }}
                        >
                          Edit
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-xl font-bold text-red-500 hover:bg-red-50"
                        onClick={() => setRequestToDelete(request.id)}
                      >
                        {request.status === 'pending' ? 'Withdraw' : 'Clear'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-muted/10">
            {aggregatedRequests.map(({ request, landlord, property }) => (
              <div key={request.id} className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <Link href={`/student/properties/${property?.id}`} className="font-bold text-sm uppercase tracking-tight hover:text-primary transition-colors block mb-1">
                      {property?.title || 'Unknown Property'}
                    </Link>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Applied: {new Date(request.applicationDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <Badge className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider border-none",
                    request.status === 'approved' ? "bg-green-500/10 text-green-600" :
                      request.status === 'declined' ? "bg-red-500/10 text-red-600" :
                        "bg-primary/10 text-primary"
                  )}>
                    {request.status}
                  </Badge>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-muted/20 flex items-center justify-center text-xs font-semibold uppercase">
                    {landlord?.name?.[0] || 'L'}
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">{landlord?.name || 'Unknown Landlord'}</p>
                </div>

                <div className="flex gap-2 pt-2">
                  {request.status === 'approved' ? (
                    <Button size="sm" className="flex-1 rounded-xl font-semibold text-xs uppercase tracking-wider h-10" asChild>
                      <Link href="/student/leases">View Lease</Link>
                    </Button>
                  ) : request.status === 'pending' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 rounded-xl font-semibold text-xs uppercase tracking-wider h-10 border"
                      onClick={() => {
                        setRequestToEdit(request);
                        setEditMessage(request.messageToLandlord || '');
                      }}
                    >
                      Edit
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-xl font-semibold text-xs uppercase tracking-wider text-red-500 h-10 px-4"
                    onClick={() => setRequestToDelete(request.id)}
                  >
                    {request.status === 'pending' ? 'Withdraw' : 'Clear'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden border-none bg-card shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-24 text-center">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full scale-150" />
              <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-muted/30">
                <Search className="h-10 w-10 text-primary opacity-20" />
              </div>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">No Active Requests</h2>
            <p className="mx-auto mt-2 max-w-sm text-muted-foreground font-medium">
              You haven&apos;t submitted any rental applications yet.
            </p>
            <Button className="mt-8 rounded-2xl px-8 font-bold" asChild>
              <Link href="/student/properties">Explore Properties</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!requestToDelete} onOpenChange={(open) => !open && setRequestToDelete(null)}>
        <AlertDialogContent className="w-[95vw] sm:max-w-md rounded-3xl border-none shadow-sm p-6">
          <AlertDialogHeader className="space-y-4">
            <AlertDialogTitle className="text-3xl font-bold">Withdraw this request?</AlertDialogTitle>
            <AlertDialogDescription className="text-lg font-medium text-muted-foreground">
              Are you sure you want to withdraw this application? This action cannot be reversed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-4 mt-8">
            <AlertDialogCancel className="h-14 rounded-2xl border font-semibold text-xs uppercase tracking-wider">Keep request</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRequest} className="h-14 rounded-2xl bg-red-500 text-white hover:bg-red-600 font-semibold text-xs uppercase tracking-wider shadow-sm">
              Withdraw application
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <Dialog open={!!requestToEdit} onOpenChange={(open) => !open && setRequestToEdit(null)}>
        <DialogContent className="sm:max-w-md w-[95vw] rounded-3xl border-none shadow-sm p-6">
          <DialogHeader className="space-y-4">
            <DialogTitle className="text-3xl font-bold">Edit Application</DialogTitle>
            <DialogDescription className="text-lg font-medium text-muted-foreground">
              Update your message to the landlord.
            </DialogDescription>
          </DialogHeader>
          <div className="py-8 space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/40 ml-1">Message</label>
            <Textarea
              value={editMessage}
              onChange={(e) => setEditMessage(e.target.value)}
              placeholder="Introduce yourself and explain why you're a good fit..."
              className="min-h-[200px] rounded-3xl border bg-muted/5 focus:bg-card transition-all p-6 text-lg font-medium leading-relaxed"
            />
          </div>
          <DialogFooter className="gap-4">
            <Button variant="ghost" className="h-14 rounded-2xl font-semibold text-xs uppercase tracking-wider" onClick={() => setRequestToEdit(null)}>Cancel</Button>
            <Button onClick={handleUpdateRequest} className="h-11 rounded-2xl px-6 font-semibold text-xs uppercase tracking-wider shadow-sm">Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
