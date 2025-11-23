
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TenancySkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
        <div>
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
        </div>
        <Separator />

        <Tabs defaultValue="payments" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="payments">Payments</TabsTrigger>
                <TabsTrigger value="lease">Lease Info</TabsTrigger>
                <TabsTrigger value="contact">Contact</TabsTrigger>
            </TabsList>
            <TabsContent value="payments">
                 <Card className="mt-2">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>Payment History</CardTitle>
                                <CardDescription>Review your past transactions.</CardDescription>
                            </div>
                            <Skeleton className="h-10 w-32" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                                    <TableCell className="text-center"><Skeleton className="h-4 w-20 mx-auto" /></TableCell>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {[...Array(3)].map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                                        <TableCell className="text-center"><Skeleton className="h-6 w-24 rounded-full mx-auto" /></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                 </Card>
            </TabsContent>
        </Tabs>
    </div>
  );
}
