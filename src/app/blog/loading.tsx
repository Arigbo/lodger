import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="min-h-screen bg-background">
            <section className="relative pt-32 pb-20 px-6 lg:px-12 bg-primary/5">
                <div className="container mx-auto max-w-6xl text-center">
                    <Skeleton className="w-32 h-8 rounded-full mx-auto mb-6" />
                    <Skeleton className="w-[80%] md:w-[60%] h-20 mx-auto mb-6" />
                    <Skeleton className="w-[60%] md:w-[40%] h-6 mx-auto mb-10" />
                    <Skeleton className="max-w-md h-14 rounded-2xl mx-auto" />
                </div>
            </section>

            <section className="py-20 px-6 lg:px-12">
                <div className="container mx-auto max-w-6xl">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="flex flex-col bg-card rounded-[2rem] overflow-hidden border h-[500px]">
                                <Skeleton className="w-full h-64" />
                                <div className="p-8 flex flex-col flex-1 space-y-4">
                                    <Skeleton className="w-24 h-4 rounded-full" />
                                    <Skeleton className="w-full h-8" />
                                    <Skeleton className="w-full h-20" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
