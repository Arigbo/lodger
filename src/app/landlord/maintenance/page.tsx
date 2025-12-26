'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { MaintenanceRequest, UserProfile as User, Property } from '@/types';
import { MoreHorizontal, Wrench, Clock, AlertCircle, CheckCircle2, XCircle, Building, User as UserIcon, Calendar, ArrowRight, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useUser, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { collection, query, where, getDocs, documentId, doc, updateDoc } from 'firebase/firestore';
import Loading from '@/app/loading';

type AggregatedRequest = MaintenanceRequest & {
  tenantName: string;
  propertyName: string;
};

// Helper function to split an array into chunks
function chunkArray<T>(array: T[], size: number): T[][] {
  if (!array || array.length === 0) return [];
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export default function MaintenancePage() {
  const { user: landlord, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [requests, setRequests] = React.useState<AggregatedRequest[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchMaintenanceRequests = async () => {
    if (!landlord || !firestore) return;
    setIsLoading(true);

    const requestsQuery = query(collection(firestore, 'maintenanceRequests'), where('landlordId', '==', landlord.uid));
    const requestsSnapshot = await getDocs(requestsQuery);
    const landlordRequests: MaintenanceRequest[] = requestsSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as MaintenanceRequest));

    if (landlordRequests.length === 0) {
      setRequests([]);
      setIsLoading(false);
      return;
    }

    const tenantIds = [...new Set(landlordRequests.map(r => r.tenantId))];
    const propertyIds = [...new Set(landlordRequests.map(r => r.propertyId))];

    const usersMap = new Map<string, User>();
    const propertiesMap = new Map<string, Property>();

    if (tenantIds.length > 0) {
      const userChunks = chunkArray(tenantIds, 30);
      for (const chunk of userChunks) {
        const usersQuery = query(collection(firestore, 'users'), where(documentId(), 'in', chunk));
        const usersSnapshot = await getDocs(usersQuery);
        usersSnapshot.forEach((doc: any) => usersMap.set(doc.id, { id: doc.id, ...doc.data() } as User));
      }
    }

    if (propertyIds.length > 0) {
      const propertyChunks = chunkArray(propertyIds, 30);
      for (const chunk of propertyChunks) {
        const propertiesQuery = query(collection(firestore, 'properties'), where(documentId(), 'in', chunk));
        const propertiesSnapshot = await getDocs(propertiesQuery);
        propertiesSnapshot.forEach((doc: any) => propertiesMap.set(doc.id, { id: doc.id, ...doc.data() } as Property));
      }
    }

    const aggregatedData = landlordRequests.map(request => ({
      ...request,
      tenantName: usersMap.get(request.tenantId)?.name || 'Unknown Tenant',
      propertyName: propertiesMap.get(request.propertyId)?.title || 'Unknown Property',
    }));

    setRequests(aggregatedData.sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()));
    setIsLoading(false);
  };

  React.useEffect(() => {
    fetchMaintenanceRequests();
  }, [landlord, firestore]);

  const handleUpdateStatus = async (requestId: string, newStatus: MaintenanceRequest['status']) => {
    try {
      const requestRef = doc(firestore, 'maintenanceRequests', requestId);
      await updateDoc(requestRef, { status: newStatus });

      setRequests(prev => prev.map(req =>
        req.id === requestId ? { ...req, status: newStatus } : req
      ));

      toast({
        title: "Status Synchronized",
        description: `Request has been transitioned to ${newStatus}.`,
      });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        variant: "destructive",
        title: "Protocol Failure",
        description: "Failed to update service status.",
      });
    }
  };

  const getPriorityVariant = (priority: MaintenanceRequest['priority']) => {
    switch (priority) {
      case 'High': return 'destructive';
      case 'Medium': return 'default';
      case 'Low': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: MaintenanceRequest['status']) => {
    switch (status) {
      case 'Completed': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'In Progress': return <Clock className="h-4 w-4 text-primary animate-pulse" />;
      case 'Pending': return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'Cancelled': return <XCircle className="h-4 w-4 text-muted-foreground" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (isUserLoading || isLoading) {
    return <Loading />;
  }

  return (
    <div className="space-y-16 pb-32 animate-in fade-in duration-1000">
      {/* Cinematic Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-8 border-b-4 border-foreground/5">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white shadow-lg border-2 border-primary/10">
              <Wrench className="h-5 w-5 text-primary" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary italic">SERVICE TERMINAL</p>
          </div>
          <h1 className="font-headline text-5xl md:text-6xl font-black tracking-tight text-foreground uppercase">
            MAINTENANCE <span className="text-primary italic">LOGS</span>
          </h1>
          <p className="text-lg text-muted-foreground font-medium italic font-serif">
            &quot;Overseeing the structural integrity and serviceability of your assets.&quot;
          </p>
        </div>
        <div className="flex gap-4">
          <div className="bg-primary/5 px-8 py-4 rounded-[2rem] border-2 border-primary/10">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1 italic">Total Requests</p>
            <p className="text-3xl font-black text-primary">{requests.length}</p>
          </div>
          <div className="bg-orange-500/5 px-8 py-4 rounded-[2rem] border-2 border-orange-500/10">
            <p className="text-[10px] font-black uppercase tracking-widest text-orange-600 mb-1 italic">Pending Tasks</p>
            <p className="text-3xl font-black text-orange-600">{requests.filter(r => r.status === 'Pending').length}</p>
          </div>
        </div>
      </div>

      {requests.length > 0 ? (
        <div className="grid grid-cols-1 gap-8">
          {requests.map((request) => (
            <Card key={request.id} className="group relative overflow-hidden rounded-[3rem] bg-white border-2 border-muted/10 shadow-xl hover:shadow-3xl hover:border-primary/20 transition-all duration-500 p-8 md:p-10">
              <div className="flex flex-col lg:flex-row gap-10">
                {/* Service Metadata */}
                <div className="lg:w-1/4 border-r-2 border-muted/5 pr-10 space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(request.status)}
                      <Badge variant="outline" className="px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest">
                        {request.status}
                      </Badge>
                    </div>
                    <h3 className="text-2xl font-black uppercase tracking-tight group-hover:text-primary transition-colors leading-tight">
                      {request.title}
                    </h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-muted/20 flex items-center justify-center">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-muted-foreground/40 uppercase italic">Logged On</p>
                        <p className="text-xs font-bold">{new Date(request.requestDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-muted/20 flex items-center justify-center">
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-muted-foreground/40 uppercase italic">Priority Level</p>
                        <Badge variant={getPriorityVariant(request.priority)} className="h-4 px-2 text-[8px] font-black uppercase">{request.priority}</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Request Body */}
                <div className="flex-1 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 italic">Asset Impacted</p>
                      <Link href={`/landlord/properties/${request.propertyId}`} className="group/link flex items-center gap-2 text-lg font-black uppercase tracking-tight hover:text-primary transition-colors">
                        <Building className="h-5 w-5 opacity-40" /> {request.propertyName} <ExternalLink className="h-3 w-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                      </Link>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 italic">Inhabitant</p>
                      <Link href={`/landlord/tenants/${request.tenantId}`} className="group/link flex items-center gap-2 text-lg font-black uppercase tracking-tight hover:text-primary transition-colors">
                        <UserIcon className="h-5 w-5 opacity-40" /> {request.tenantName} <ExternalLink className="h-3 w-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                      </Link>
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-muted/10 border-2 border-muted/5 min-h-[100px]">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-3 italic">Technical Specification / Description</p>
                    <p className="text-sm font-medium text-muted-foreground italic font-serif leading-relaxed">
                      &quot;{request.description || "No tactical details provided by the resident."}&quot;
                    </p>
                  </div>
                </div>

                {/* Administrative Terminal */}
                <div className="lg:w-1/5 flex lg:flex-col gap-3 justify-center">
                  <p className="text-[9px] font-black uppercase tracking-widest text-center text-muted-foreground/40 hidden lg:block italic mb-2">Protocol Control</p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="h-14 rounded-xl bg-foreground text-white hover:bg-primary transition-all font-black text-[10px] uppercase tracking-widest gap-2 shadow-lg">
                        STATE SHIFT <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-2xl p-2 border-2 border-foreground/5 shadow-2xl">
                      <DropdownMenuItem onClick={() => handleUpdateStatus(request.id, 'In Progress')} className="rounded-xl focus:bg-primary focus:text-white cursor-pointer py-3 px-4 font-black text-[10px] uppercase tracking-widest">
                        MARK IN PROGRESS
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleUpdateStatus(request.id, 'Completed')} className="rounded-xl focus:bg-emerald-500 focus:text-white cursor-pointer py-3 px-4 font-black text-[10px] uppercase tracking-widest">
                        MARK COMPLETED
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleUpdateStatus(request.id, 'Cancelled')} className="rounded-xl focus:bg-destructive focus:text-white cursor-pointer py-3 px-4 font-black text-[10px] uppercase tracking-widest text-destructive">
                        CANCEL PROTOCOL
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Link href={`/landlord/messages?conversationId=${request.tenantId}`} className="w-full">
                    <Button variant="outline" className="w-full h-14 rounded-xl border-2 hover:bg-muted font-black text-[10px] uppercase tracking-widest gap-2">
                      CONTACT <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-32 space-y-10 animate-in zoom-in duration-700">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
            <div className="relative h-40 w-40 rounded-[3rem] bg-white border-4 border-muted/10 shadow-3xl flex items-center justify-center overflow-hidden">
              <Wrench className="h-16 w-16 text-muted-foreground/20" />
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
            </div>
          </div>
          <div className="space-y-4 text-center">
            <h3 className="text-3xl font-black uppercase tracking-tight italic">Systems Optimized</h3>
            <p className="text-xl text-muted-foreground font-serif italic max-w-sm mx-auto opacity-60 leading-relaxed">
              &quot;The infrastructure is currently reporting zero service interruptions. Logs will manifest as maintenance is required.&quot;
            </p>
          </div>
        </div>
      )}
    </div>
  );
}




