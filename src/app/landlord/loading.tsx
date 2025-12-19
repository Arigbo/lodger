
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export default function LandlordLoading() {
    return (
        <div className="flex flex-col space-y-6 w-full max-w-7xl mx-auto p-4 md:p-8 min-h-screen">
            {/* Header Skeleton */}
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div className="space-y-2">
                    <Skeleton className="h-10 w-[200px]" />
                    <Skeleton className="h-4 w-[300px]" />
                </div>
                <Skeleton className="h-10 w-[160px]" />
            </div>

            <Separator className="my-6" />

            {/* Stats/Section Title Skeleton */}
            <Skeleton className="h-8 w-[250px]" />

            {/* Grid of Property Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex flex-col space-y-3 p-4 border rounded-xl">
                        <Skeleton className="h-[200px] w-full rounded-xl" />
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-[70%]" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-[40%]" />
                        </div>
                        <div className="flex justify-between pt-4">
                            <Skeleton className="h-9 w-[100px]" />
                            <Skeleton className="h-9 w-[100px]" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
