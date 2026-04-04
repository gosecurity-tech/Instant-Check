import { InternalSidebar } from '@/components/layouts/InternalSidebar';
import { InternalTopbar } from '@/components/layouts/InternalTopbar';

export default function InternalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <InternalSidebar />
      <div className="pl-64">
        <InternalTopbar />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
