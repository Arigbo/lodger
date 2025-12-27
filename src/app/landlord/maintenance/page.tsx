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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-8 border-b-4 border-foreground/5 px-2">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">Property Care</span>
          </div>
          <h1 className="font-headline text-5xl md:text-7xl font-black tracking-tighter text-foreground uppercase leading-[0.9]">
            MAINTENANCE <br /> <span className="text-primary">LOGISTICS</span>
          </h1>
          <p className="text-lg text-muted-foreground font-medium mt-4">
            Manage service requests and property upkeep.
          </p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white px-8 py-5 rounded-[2rem] border-2 border-muted/10 shadow-sm flex flex-col justify-center min-w-[160px]">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-1">Total Requests</p>
            <p className="text-3xl font-black tracking-tighter">{requests.length}</p>
          </div>
          <div className="bg-orange-600 text-white px-8 py-5 rounded-[2rem] shadow-xl shadow-orange-600/20 flex flex-col justify-center min-w-[160px]">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 mb-1">Pending Tasks</p>
            <p className="text-3xl font-black tracking-tighter">{requests.filter(r => r.status === 'Pending').length}</p>
          </div>
        </div>
      </div>

      <div className="space-y-10">
        <div className="flex items-center gap-4 px-2">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Wrench className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tight">Active Maintenance</h2>
        </div>

        {requests.length > 0 ? (
          <div className="grid grid-cols-1 gap-8">
            {requests.map((request) => (
              <Card key={request.id} className="group relative overflow-hidden rounded-[3rem] bg-white border-2 border-foreground/5 shadow-xl hover:shadow-3xl transition-all duration-500 p-8 md:p-10">
                <div className="flex flex-col lg:flex-row gap-10">
                  {/* Service Metadata */}
                  <div className="lg:w-1/4 border-r-2 border-muted/5 pr-10 space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(request.status)}
                        <Badge variant="outline" className="px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border-muted/20">
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
                          <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">Logged On</p>
                          <p className="text-xs font-bold">{new Date(request.requestDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-muted/20 flex items-center justify-center">
                          <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">Priority Level</p>
                          <Badge variant={getPriorityVariant(request.priority)} className="h-4 px-2 text-[8px] font-black uppercase">{request.priority}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Request Body */}
                  <div className="flex-1 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Property</p>
                        <Link href={`/landlord/properties/${request.propertyId}`} className="group/link flex items-center gap-2 text-xl font-black uppercase tracking-tight hover:text-primary transition-colors">
                          <Building className="h-5 w-5 opacity-40" /> {request.propertyName} <ExternalLink className="h-3 w-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                        </Link>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Tenant</p>
                        <Link href={`/landlord/tenants/${request.tenantId}`} className="group/link flex items-center gap-2 text-xl font-black uppercase tracking-tight hover:text-primary transition-colors">
                          <UserIcon className="h-5 w-5 opacity-40" /> {request.tenantName} <ExternalLink className="h-3 w-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                        </Link>
                      </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-muted/10 border-2 border-muted/5 min-h-[100px]">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-3">Service Details</p>
                      <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                        {request.description || "No tactical details provided by the tenant."}
                      </p>
                    </div>
                  </div>

                  {/* Administrative Terminal */}
                  <div className="lg:w-1/5 flex lg:flex-col gap-3 justify-center">
                    <p className="text-[9px] font-black uppercase tracking-widest text-center text-muted-foreground/40 hidden lg:block mb-2">Manage Request</p>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button className="h-14 rounded-xl bg-foreground text-white hover:bg-primary transition-all font-black text-[10px] uppercase tracking-widest gap-2 shadow-lg">
                          UPDATE STATUS <MoreHorizontal className="h-4 w-4" />
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
                          CANCEL REQUEST
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
          <Card className="rounded-[3.5rem] border-2 border-dashed border-foreground/10 bg-muted/5 p-24 text-center space-y-8">
            <div className="h-32 w-32 rounded-[2.5rem] bg-white shadow-2xl flex items-center justify-center mx-auto relative group overflow-hidden">
              <Wrench className="h-14 w-14 text-muted-foreground/20 group-hover:rotate-12 transition-transform" />
              <div className="absolute inset-0 bg-primary/5 rounded-[2.5rem]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black uppercase tracking-tight">Systems Clear</h3>
              <p className="text-lg text-muted-foreground max-w-sm mx-auto">
                No active maintenance requests found at this time.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
