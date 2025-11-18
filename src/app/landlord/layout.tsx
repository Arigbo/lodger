import LandlordSidebar from "@/components/landlord-sidebar";
import { getUserById } from "@/lib/data";
import Header from "@/components/header";
import { cn } from "@/lib/utils";

// Mock current user
const useUser = () => {
    // To test landlord view: 'user-1'
    // To test tenant view: 'user-3'
    const user = getUserById('user-1');
    return { user };
}


export default function LandlordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useUser();

  const isLandlord = user?.role === 'landlord';

  return (
    <div className="flex min-h-screen w-full flex-col">
       <Header />
       <main className="flex min-h-[calc(100vh_-_theme(spacing.20))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
        {isLandlord ? (
          <div className="mx-auto grid w-full max-w-6xl gap-2">
              <div className="grid grid-cols-1 gap-12 lg:grid-cols-4">
                <aside className="lg:col-span-1">
                  <LandlordSidebar />
                </aside>
                <main className="lg:col-span-3">{children}</main>
              </div>
          </div>
        ) : (
          <div className="container mx-auto max-w-4xl py-12 px-4">{children}</div>
        )}
      </main>
    </div>
  );
}
