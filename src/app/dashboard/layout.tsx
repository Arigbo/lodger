import DashboardSidebar from "@/components/dashboard-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container mx-auto max-w-7xl py-12 px-4">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-4">
        <aside className="lg:col-span-1">
          <DashboardSidebar />
        </aside>
        <main className="lg:col-span-3">{children}</main>
      </div>
    </div>
  );
}
