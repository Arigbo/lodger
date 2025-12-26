
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
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { RentalApplication, UserProfile as User, Property } from '@/types';
import { BellRing, Search, X, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, documentId } from 'firebase/firestore';
import Loading from '@/app/loading';
import { cn } from '@/utils';
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

type AggregatedRequest = {
  request: RentalApplication;
  landlord: User | null;
  property: Property | null;
};

// Helper function to split an array into chunks
function chunkArray<T>(array: T[], size: number): T[][] {
  if (array.length === 0) return [];
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}


export default function StudentRequestsPage() {
  const { user: student, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [aggregatedRequests, setAggregatedRequests] = React.useState<AggregatedRequest[]>([]);
  const [isAggregating, setIsAggregating] = React.useState(true);

  const requestsQuery = useMemoFirebase(() => {
    if (!student) return null;
    return query(collection(firestore, 'rentalApplications'), where('tenantId', '==', student.uid));
  }, [student, firestore]);

  const { data: studentRequests, isLoading: areRequestsLoading } = useCollection<RentalApplication>(requestsQuery);

  React.useEffect(() => {
    if (areRequestsLoading) return;
    if (!studentRequests || !firestore) {
      setAggregatedRequests([]);
      setIsAggregating(false);
      return;
    }

    const aggregateData = async () => {
      setIsAggregating(true);
      if (studentRequests.length === 0) {
        setAggregatedRequests([]);
        setIsAggregating(false);
        return;
      }

      const landlordIds = [...new Set(studentRequests.map(r => r.landlordId))].filter(Boolean);
      const propertyIds = [...new Set(studentRequests.map(r => r.propertyId))].filter(Boolean);

      const usersMap = new Map<string, User>();
      const propertiesMap = new Map<string, Property>();

      if (landlordIds.length > 0) {
        const userChunks = chunkArray(landlordIds, 30);
        for (const chunk of userChunks) {
          const usersQuery = query(collection(firestore, 'users'), where(documentId(), 'in', chunk));
          const userSnapshots = await getDocs(usersQuery);
          userSnapshots.forEach((doc: any) => usersMap.set(doc.id, { id: doc.id, ...doc.data() } as User));
        }
      }

      if (propertyIds.length > 0) {
        const propertyChunks = chunkArray(propertyIds, 30);
        for (const chunk of propertyChunks) {
          const propertyPromises = query(collection(firestore, 'properties'), where(documentId(), 'in', chunk));
          const propertySnapshots = await getDocs(propertyPromises);
          propertySnapshots.forEach((doc: any) => propertiesMap.set(doc.id, { id: doc.id, ...doc.data() } as Property));
        }
      }

      const finalData = studentRequests.map(request => ({
        request,
        landlord: usersMap.get(request.landlordId) || null,
        property: propertiesMap.get(request.propertyId) || null,
      }));

      setAggregatedRequests(finalData.sort((a, b) => new Date(b.request.applicationDate).getTime() - new Date(a.request.applicationDate).getTime()));
      setIsAggregating(false);
    };

    aggregateData();
  }, [studentRequests, areRequestsLoading, firestore]);

  const getStatusVariant = (status: RentalApplication['status']) => {
    switch (status) {
      case 'approved':
        return 'secondary';
      case 'declined':
        return 'destructive';
      case 'pending':
        return 'default';
      default:
        return 'outline';
    }
  };

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
      <div className="space-y-2">
        <h1 className="font-headline text-4xl font-black tracking-tight text-foreground underline decoration-primary/20 underline-offset-8 uppercase">
          Rental Requests
        </h1>
        <p className="text-lg text-muted-foreground font-medium italic font-serif">
          &quot;Track your active rental applications and inquiries.&quot;
        </p>
      </div>

      {aggregatedRequests.length > 0 ? (
        <Card className="overflow-hidden border-2 border-foreground/5 bg-white shadow-xl rounded-[2.5rem]">
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
                <TableRow key={request.id} className="border-muted/10 hover:bg-muted/5 transition-colors">
                  <TableCell className="px-8 font-bold">
                    <Link href={`/student/properties/${property?.id}`} className="hover:text-primary transition-colors">
                      {property?.title || 'Unknown Property'}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">{landlord?.name || 'N/A'}</TableCell>
                  <TableCell className="font-medium text-muted-foreground">
                    {new Date(request.applicationDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn(
                      "rounded-full px-4 py-1 text-[10px] font-black uppercase tracking-widest border-none",
                      request.status === 'approved' ? "bg-green-500/10 text-green-600" :
                        request.status === 'declined' ? "bg-red-500/10 text-red-600" :
                          "bg-primary/10 text-primary"
                    )}>
                      {request.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right px-8 space-x-2">
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
        </Card>
      ) : (
        <Card className="overflow-hidden border-none bg-white shadow-xl shadow-black/[0.02]">
          <CardContent className="flex flex-col items-center justify-center py-24 text-center">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full scale-150" />
              <div className="relative flex h-24 w-24 items-center justify-center rounded-[2rem] bg-muted/30">
                <Search className="h-10 w-10 text-primary opacity-20" />
              </div>
            </div>
            <h2 className="text-2xl font-black tracking-tight">No Active Requests</h2>
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
        <AlertDialogContent className="w-[95vw] sm:max-w-md rounded-[2.5rem] border-none shadow-3xl p-10">
          <AlertDialogHeader className="space-y-4">
            <AlertDialogTitle className="text-3xl font-black">Archive Inquiry?</AlertDialogTitle>
            <AlertDialogDescription className="text-lg font-medium text-muted-foreground italic font-serif">
              Are you sure you want to withdraw this application? This protocol cannot be reversed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-4 mt-8">
            <AlertDialogCancel className="h-14 rounded-2xl border-2 font-black text-xs uppercase tracking-widest">RETAIN</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRequest} className="h-14 rounded-2xl bg-red-500 text-white hover:bg-red-600 font-black text-xs uppercase tracking-widest shadow-xl shadow-red-500/20">
              WITHDRAW INQUIRY
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <Dialog open={!!requestToEdit} onOpenChange={(open) => !open && setRequestToEdit(null)}>
        <DialogContent className="sm:max-w-md w-[95vw] rounded-[2.5rem] border-none shadow-3xl p-10">
          <DialogHeader className="space-y-4">
            <DialogTitle className="text-3xl font-black">Refine Inquiry</DialogTitle>
            <DialogDescription className="text-lg font-medium text-muted-foreground italic font-serif">
              Update your personal narrative for this application.
            </DialogDescription>
          </DialogHeader>
          <div className="py-8 space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 ml-1">PROFILE NARRATIVE</label>
            <Textarea
              value={editMessage}
              onChange={(e) => setEditMessage(e.target.value)}
              placeholder="Introduced yourself and explain why you're a good fit..."
              className="min-h-[200px] rounded-[2rem] border-2 bg-muted/5 focus:bg-white transition-all p-6 text-lg font-medium leading-relaxed font-serif italic"
            />
          </div>
          <DialogFooter className="gap-4">
            <Button variant="ghost" className="h-14 rounded-2xl font-black text-xs uppercase tracking-widest underline underline-offset-8 decoration-primary/20 hover:decoration-primary" onClick={() => setRequestToEdit(null)}>DISCARD</Button>
            <Button onClick={handleUpdateRequest} className="h-14 rounded-2xl px-10 font-black text-xs uppercase tracking-widest shadow-2xl shadow-primary/20">SAVE REFINEMENTS</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}
