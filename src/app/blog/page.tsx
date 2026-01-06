import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import { Search, ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils";

const BLOG_API_URL = process.env.NEXT_PUBLIC_BLOG_API_URL || "https://lodger-blog.vercel.app/api/v1/posts";
const PUBLIC_BLOG_URL = process.env.NEXT_PUBLIC_BLOG_URL || "https://lodger-blog.vercel.app/post";

async function getPosts(page: number, search: string) {
    try {
        const res = await fetch(`${BLOG_API_URL}?page=${page}&limit=6&search=${encodeURIComponent(search)}`, {
            cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to fetch posts");
        return res.json();
    } catch (error) {
        console.error(error);
        return null;
    }
}

export default async function BlogPage({
    searchParams,
}: {
    searchParams: { page?: string; query?: string };
}) {
    // Await searchParams before accessing properties
    const params = await searchParams;
    const page = Number(params?.page) || 1;
    const search = params?.query || "";

    const data = await getPosts(page, search);
    const posts = data?.posts || [];
    const pagination = data?.pagination;

    return (
        <div className="min-h-screen bg-background">
            {/* Hero Section */}
            <section className="relative pt-32 pb-20 px-6 lg:px-12 overflow-hidden bg-primary/5">
                <div className="container mx-auto max-w-6xl relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background border shadow-sm mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-sm font-bold tracking-wide uppercase text-primary">The Commons</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-playfair font-black tracking-tight leading-[1.1] mb-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
                        Stories from <span className="text-primary">Lodger</span>.
                    </h1>
                    <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                        Insights, guides, and stories about student living, modern housing, and the future of rentals.
                    </p>

                    <form action="/blog" className="max-w-md mx-auto relative animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
                        <Input
                            name="query"
                            defaultValue={search}
                            placeholder="Search articles..."
                            className="pl-12 h-14 rounded-2xl border-2 hover:border-primary/50 focus:border-primary transition-all text-base shadow-xl shadow-primary/5"
                        />
                    </form>
                </div>

                {/* Background blobs */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />
            </section>

            {/* Posts Grid */}
            <section className="py-20 px-6 lg:px-12">
                <div className="container mx-auto max-w-6xl">
                    {posts.length > 0 ? (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {posts.map((post: any, index: number) => (
                                <Link
                                    href={`${PUBLIC_BLOG_URL}/${post.slug}`}
                                    key={post.id}
                                    target="_blank"
                                    className="group flex flex-col bg-card rounded-[2rem] overflow-hidden border transition-all hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1"
                                >
                                    <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                                        {post.coverImage ? (
                                            <Image
                                                src={post.coverImage}
                                                alt={post.title}
                                                fill
                                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                                                <BookOpen className="h-12 w-12" />
                                            </div>
                                        )}
                                        <div className="absolute top-4 left-4">
                                            <span className="px-3 py-1.5 rounded-xl bg-background/80 backdrop-blur-md text-xs font-bold uppercase tracking-wider text-primary shadow-sm">
                                                {post.category}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col flex-1 p-6 lg:p-8">
                                        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground mb-3">
                                            <span>{format(new Date(post.publishedAt), 'MMMM d, yyyy')}</span>
                                            <span>•</span>
                                            <span>{post.author.name}</span>
                                        </div>
                                        <h3 className="text-2xl font-bold font-playfair mb-3 leading-tight group-hover:text-primary transition-colors">
                                            {post.title}
                                        </h3>
                                        <p className="text-muted-foreground line-clamp-3 mb-6 flex-1">
                                            {post.excerpt}
                                        </p>
                                        <div className="flex items-center text-primary font-bold text-sm mt-auto">
                                            Read Article <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20">
                            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">No articles found</h3>
                            <p className="text-muted-foreground mb-6">We couldn't find any articles matching "{search}".</p>
                            {search && (
                                <Button asChild variant="outline">
                                    <Link href="/blog">Clear Search</Link>
                                </Button>
                            )}
                        </div>
                    )}

                    {/* Pagination */}
                    {pagination && pagination.totalPages > 1 && (
                        <div className="flex items-center justify-center gap-4 mt-16">
                            <Button
                                variant="outline"
                                disabled={page <= 1}
                                asChild={page > 1}
                                className="rounded-xl px-6"
                            >
                                {page > 1 ? (
                                    <Link href={`/blog?page=${page - 1}${search ? `&query=${search}` : ''}`}>
                                        <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                                    </Link>
                                ) : (
                                    <>
                                        <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                                    </>
                                )}
                            </Button>
                            <span className="text-sm font-medium text-muted-foreground">
                                Page {page} of {pagination.totalPages}
                            </span>
                            <Button
                                variant="outline"
                                disabled={page >= pagination.totalPages}
                                asChild={page < pagination.totalPages}
                                className="rounded-xl px-6"
                            >
                                {page < pagination.totalPages ? (
                                    <Link href={`/blog?page=${page + 1}${search ? `&query=${search}` : ''}`}>
                                        Next <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                ) : (
                                    <>
                                        Next <ArrowRight className="ml-2 h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
