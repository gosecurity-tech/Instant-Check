import { Suspense } from 'react';
import Link from 'next/link';
import { requireInternalUser } from '@/lib/auth/server';
import { listClients } from '@/lib/services/clients';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { ClientsTable } from './ClientsTable';

export const metadata = { title: 'Clients — Instant Check' };

interface ClientsPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }>;
}

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  await requireInternalUser();

  const params = await searchParams;
  const page = params.page ? parseInt(params.page, 10) : 1;
  const search = params.search || undefined;
  const sortBy = params.sortBy || 'created_at';
  const sortOrder = params.sortOrder || 'desc';

  const result = await listClients({
    page,
    pageSize: 25,
    search,
    sortBy,
    sortOrder,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Manage client organisations"
        actions={
          <Link href="/clients/new">
            <Button>Add Client</Button>
          </Link>
        }
      />

      <Suspense
        fallback={
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <p className="text-sm text-gray-500">Loading clients...</p>
          </div>
        }
      >
        <ClientsTable
          data={result.data}
          page={result.page}
          pageSize={result.pageSize}
          totalPages={result.totalPages}
          totalCount={result.count}
          search={search}
          sortBy={sortBy}
          sortOrder={sortOrder}
        />
      </Suspense>
    </div>
  );
}
