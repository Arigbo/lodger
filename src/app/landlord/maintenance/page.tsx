"use client";

import * as React from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ArrowRight, Building2, CheckCircle2, MessageSquare, User as UserIcon } from 'lucide-react';
import { collection, doc, query, updateDoc, where } from 'firebase/firestore';
import { EmptyState, PageHeader, PageSkeleton, StatusBadge } from '@/components/dashboard';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { useAsyncResult } from '@/hooks/use-async-result';
import { useToast } from '@/hooks/use-toast';
import { fetchDocsByIds } from '@/lib/firestore-batch';
import { cn } from '@/lib/utils';
import type { MaintenanceRequest, Property, UserProfile as User } from '@/types';

const COLUMNS: { status: MaintenanceRequest['status']; label: string; hint: string }[] = [
  { status: 'Pending', label: 'Open', hint: 'New issues to look at' },
  { status: 'In Progress', label: 'In progress', hint: 'Being fixed' },
  { status: 'Completed', label: 'Done', hint: 'Resolved issues' },
];

const PRIORITY_STYLES: Record<MaintenanceRequest['priority'], string> = {
  High: 'bg-red-50 text-red-700 ring-red-200',
  Medium: 'bg-amber-50 text-amber-800 ring-amber-200',
  Low: 'bg-muted text-muted-foreground ring-border',
};

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

  const [mobileColumn, setMobileColumn] = React.useState<MaintenanceRequest['status']>('Pending');

  if (isUserLoading || isLoading) {
    return <PageSkeleton variant="list" />;
  }

  const byStatus = (status: MaintenanceRequest['status']) =>
    requests
      .filter((r) => r.status === status)
      .sort((a, b) => (a.priority === 'High' ? -1 : 0) - (b.priority === 'High' ? -1 : 0));

  return (
    <div className="space-y-6">
      <PageHeader title="Maintenance" description="Repair requests reported by your tenants. Move each job along as it gets fixed." />

      {requests.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No repair requests"
          description="When a tenant reports an issue it will appear here so you can track it until it's fixed."
        />
      ) : (
        <>
          <Tabs value={mobileColumn} onValueChange={(v) => setMobileColumn(v as MaintenanceRequest['status'])} className="lg:hidden">
            <TabsList className="grid h-auto w-full grid-cols-3 rounded-xl p-1">
              {COLUMNS.map((c) => (
                <TabsTrigger key={c.status} value={c.status} className="gap-1.5 rounded-lg py-1.5">
                  {c.label} <span className="text-xs text-muted-foreground">{byStatus(c.status).length}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="grid gap-5 lg:grid-cols-3">
            {COLUMNS.map((column) => {
              const items = byStatus(column.status);
              return (
                <section
                  key={column.status}
                  aria-labelledby={`col-${column.status}`}
                  className={cn('rounded-2xl bg-muted/50 p-3', column.status !== mobileColumn && 'hidden lg:block')}
                >
                  <header className="mb-3 flex items-center justify-between px-2 pt-1">
                    <div>
                      <h2 id={`col-${column.status}`} className="text-sm font-semibold">
                        {column.label}
                      </h2>
                      <p className="text-xs text-muted-foreground">{column.hint}</p>
                    </div>
                    <span className="rounded-full bg-background px-2 py-0.5 text-xs font-semibold">{items.length}</span>
                  </header>

                  {items.length === 0 ? (
                    <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">Nothing here</p>
                  ) : (
                    <ul className="space-y-3">
                      {items.map((request) => (
                        <li key={request.id} className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium leading-snug">{request.title}</p>
                            <span
                              className={cn(
                                'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset',
                                PRIORITY_STYLES[request.priority],
                              )}
                            >
                              {request.priority}
                            </span>
                          </div>
                          {request.description && <p className="line-clamp-3 text-sm text-muted-foreground">{request.description}</p>}
                          <div className="space-y-1 text-xs text-muted-foreground">
                            <Link href={`/landlord/properties/${request.propertyId}`} className="flex items-center gap-1.5 hover:text-foreground">
                              <Building2 aria-hidden className="h-3.5 w-3.5" /> {request.propertyName}
                            </Link>
                            <Link href={`/landlord/tenants/${request.tenantId}`} className="flex items-center gap-1.5 hover:text-foreground">
                              <UserIcon aria-hidden className="h-3.5 w-3.5" /> {request.tenantName}
                            </Link>
                            <p>
                              {request.category} · reported {formatDistanceToNow(new Date(request.requestDate), { addSuffix: true })}
                            </p>
                          </div>
                          <div className="flex gap-2 border-t pt-3">
                            {column.status !== 'Completed' && (
                              <Button
                                size="sm"
                                className="h-8 flex-1 rounded-lg"
                                onClick={() => handleUpdateStatus(request.id, column.status === 'Pending' ? 'In Progress' : 'Completed')}
                              >
                                {column.status === 'Pending' ? 'Start work' : 'Mark done'} <ArrowRight className="ml-1 h-3.5 w-3.5" />
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="outline" className="h-8 rounded-lg">
                                  Move
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-xl">
                                <DropdownMenuLabel className="text-xs text-muted-foreground">Move to</DropdownMenuLabel>
                                {(['Pending', 'In Progress', 'Completed', 'Cancelled'] as const)
                                  .filter((s) => s !== request.status)
                                  .map((s) => (
                                    <DropdownMenuItem key={s} onSelect={() => handleUpdateStatus(request.id, s)}>
                                      <StatusBadge status={s} />
                                    </DropdownMenuItem>
                                  ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <Button asChild size="sm" variant="ghost" className="h-8 rounded-lg" aria-label={`Message ${request.tenantName}`}>
                              <Link href={`/landlord/messages?conversationId=${request.tenantId}`}>
                                <MessageSquare className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
