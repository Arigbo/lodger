'use client';

import * as React from 'react';
import {
  Card,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { MaintenanceRequest, UserProfile as User, Property } from '@/types';
import { MoreHorizontal, Wrench, Clock, AlertCircle, CheckCircle2, XCircle, Building, User as UserIcon, Calendar, ArrowRight, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { collection, query, where, doc, updateDoc } from 'firebase/firestore';
import { PageSkeleton } from "@/components/dashboard/skeletons";
import { PageHeader, StatCard, StatGrid } from "@/components/dashboard";
import { useAsyncResult } from "@/hooks/use-async-result";
import { fetchDocsByIds } from "@/lib/firestore-batch";

type AggregatedRequest = MaintenanceRequest & {
  tenantName: string;
  propertyName: string;
};


export default function MaintenancePage() {
  const { user: landlord, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const requestsQuery = useMemoFirebase(
    () => (landlord ? query(collection(firestore, 'maintenanceRequests'), where('landlordId', '==', landlord.uid)) : null),
    [landlord, firestore],
  );
  const { data: rawRequests, isLoading: areRequestsLoading } = useCollection<MaintenanceRequest>(requestsQuery);

  const { data: requests = [], isLoading: isAggregating } = useAsyncResult(
    rawRequests,
    async (items): Promise<AggregatedRequest[]> => {
      const [tenants, properties] = await Promise.all([
        fetchDocsByIds<User>(firestore, 'users', items.map((r) => r.tenantId)),
        fetchDocsByIds<Property>(firestore, 'properties', items.map((r) => r.propertyId)),
      ]);
      return items
        .map((request) => ({
          ...request,
          tenantName: tenants.get(request.tenantId)?.name || 'Unknown tenant',
          propertyName: properties.get(request.propertyId)?.title || 'Unknown property',
        }))
        .sort((x, y) => new Date(y.requestDate).getTime() - new Date(x.requestDate).getTime());
    },
    { keepPrevious: true },
  );
  const isLoading = areRequestsLoading || isAggregating;

  const handleUpdateStatus = async (requestId: string, newStatus: MaintenanceRequest['status']) => {
    try {
      const requestRef = doc(firestore, 'maintenanceRequests', requestId);
      await updateDoc(requestRef, { status: newStatus });

      toast({
        title: "Status updated",
        description: `Request marked as ${newStatus.toLowerCase()}.`,
      });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        variant: "destructive",
        title: "Update failed",
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
    return <PageSkeleton variant="list" />;
  }

  return (
    <div className="space-y-8 pb-8 animate-in fade-in duration-1000">
      <PageHeader title="Maintenance" description="Repair requests reported by your tenants." />

      <StatGrid className="lg:grid-cols-3">
        <StatCard label="Open" value={requests.filter((r) => r.status === 'Pending').length} icon={Wrench} tone="warning" />
        <StatCard label="In progress" value={requests.filter((r) => r.status === 'In Progress').length} icon={Wrench} tone="info" />
        <StatCard label="Total requests" value={requests.length} icon={Wrench} className="col-span-2 lg:col-span-1" />
      </StatGrid>

      <div className="space-y-10">
        <div className="flex items-center gap-4 px-2">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Wrench className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Active Maintenance</h2>
        </div>

        {requests.length > 0 ? (
          <div className="grid grid-cols-1 gap-8">
            {requests.map((request) => (
              <Card key={request.id} className="group relative overflow-hidden rounded-3xl bg-card border border-foreground/5 shadow-sm hover:shadow-md transition-all duration-500 p-8 md:p-8">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Service Metadata */}
                  <div className="lg:w-1/4 border-r-2 border-muted/5 pr-10 space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(request.status)}
                        <Badge variant="outline" className="px-3 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border-muted/20">
                          {request.status}
                        </Badge>
                      </div>
                      <h3 className="text-2xl font-bold tracking-tight group-hover:text-primary transition-colors leading-tight">
                        {request.title}
                      </h3>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-muted/20 flex items-center justify-center">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground/40 uppercase tracking-wider">Logged On</p>
                          <p className="text-xs font-bold">{new Date(request.requestDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-muted/20 flex items-center justify-center">
                          <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground/40 uppercase tracking-wider">Priority Level</p>
                          <Badge variant={getPriorityVariant(request.priority)} className="h-4 px-2 text-xs font-semibold uppercase">{request.priority}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Request Body */}
                  <div className="flex-1 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/40">Property</p>
                        <Link href={`/landlord/properties/${request.propertyId}`} className="group/link flex items-center gap-2 text-xl font-bold tracking-tight hover:text-primary transition-colors">
                          <Building className="h-5 w-5 opacity-40" /> {request.propertyName} <ExternalLink className="h-3 w-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                        </Link>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/40">Tenant</p>
                        <Link href={`/landlord/tenants/${request.tenantId}`} className="group/link flex items-center gap-2 text-xl font-bold tracking-tight hover:text-primary transition-colors">
                          <UserIcon className="h-5 w-5 opacity-40" /> {request.tenantName} <ExternalLink className="h-3 w-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                        </Link>
                      </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-muted/10 border border-muted/5 min-h-[100px]">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/40 mb-3">Service Details</p>
                      <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                        {request.description || "No tactical details provided by the tenant."}
                      </p>
                    </div>
                  </div>

                  {/* Administrative Terminal */}
                  <div className="lg:w-1/5 flex lg:flex-col gap-3 justify-center">
                    <p className="text-xs font-semibold uppercase tracking-wider text-center text-muted-foreground/40 hidden lg:block mb-2">Manage Request</p>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button className="h-14 rounded-xl bg-foreground text-white hover:bg-primary transition-all font-semibold text-xs uppercase tracking-wider gap-2 shadow-lg">
                          Update status <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-2xl p-2 border border-foreground/5 shadow-sm">
                        <DropdownMenuItem onClick={() => handleUpdateStatus(request.id, 'In Progress')} className="rounded-xl focus:bg-primary focus:text-white cursor-pointer py-3 px-4 font-semibold text-xs uppercase tracking-wider">
                          Mark in progress
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateStatus(request.id, 'Completed')} className="rounded-xl focus:bg-emerald-500 focus:text-white cursor-pointer py-3 px-4 font-semibold text-xs uppercase tracking-wider">
                          Mark completed
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateStatus(request.id, 'Cancelled')} className="rounded-xl focus:bg-destructive focus:text-white cursor-pointer py-3 px-4 font-semibold text-xs uppercase tracking-wider text-destructive">
                          Cancel request
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Link href={`/landlord/messages?conversationId=${request.tenantId}`} className="w-full">
                      <Button variant="outline" className="w-full h-14 rounded-xl border hover:bg-muted font-semibold text-xs uppercase tracking-wider gap-2">
                        Contact <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="rounded-3xl border border-dashed border-foreground/10 bg-muted/5 p-24 text-center space-y-8">
            <div className="h-32 w-32 rounded-3xl bg-card shadow-sm flex items-center justify-center mx-auto relative group overflow-hidden">
              <Wrench className="h-14 w-14 text-muted-foreground/20 group-hover:rotate-12 transition-transform" />
              <div className="absolute inset-0 bg-primary/5 rounded-3xl" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold tracking-tight">Systems Clear</h3>
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
