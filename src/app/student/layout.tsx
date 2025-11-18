import LandlordSidebar from "@/components/landlord-sidebar";
import { getUserById } from "@/lib/data";

// Mock current user
const useUser = () => {
    // To test landlord view: 'user-1'
    // To test tenant view: 'user-3'
    const user = getUserById('user-3');
    return { user };
}


export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
       <main className="flex min-h-screen flex-1 flex-col gap-4 p-4 md:gap-8 md:p-10">
          <div className="mx-auto grid w-full max-w-6xl gap-2">
              <div className="grid grid-cols-1 gap-12 lg:grid-cols-4">
                <aside className="lg:col-span-1">
                  <LandlordSidebar />
                </aside>
                <main className="lg:col-span-3">{children}</main>
              </div>
          </div>
      </main>
    </div>
  );
}
