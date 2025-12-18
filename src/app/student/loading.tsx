
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export default function StudentLoading() {
    return (
        <div className="flex flex-col space-y-6 w-full max-w-7xl mx-auto p-4 md:p-8 min-h-screen">
            {/* Header Skeleton */}
            <div className="space-y-2">
                <Skeleton className="h-10 w-[250px]" />
                <Skeleton className="h-4 w-[300px]" />
            </div>

            <Separator className="my-6" />

            {/* Section Title Skeleton */}
            <Skeleton className="h-8 w-[150px]" />

            {/* Main Content Skeleton */}
            <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2">
                {Array.from({ length: 1 }).map((_, i) => (
                    <div key={i} className="flex flex-col space-y-3 p-4 border rounded-xl">
                        <Skeleton className="h-[250px] w-full rounded-xl" />
                        <div className="space-y-2 mt-2">
                            <Skeleton className="h-6 w-[60%]" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-[80%]" />
                        </div>
                        <div className="flex items-center gap-4 mt-4">
                            <Skeleton className="h-10 w-[120px]" />
                            <Skeleton className="h-10 w-[120px]" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
