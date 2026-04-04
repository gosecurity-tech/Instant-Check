import { Suspense } from 'react';
import { requireClientUser } from '@/lib/auth/server';
import { listCases } from '@/lib/services/cases';
import { PageHeader } from '@/components/shared/PageHeader';
import { ClientCasesTable } from './ClientCasesTable';

export const metadata = {
  title: 'Cases — Instant Check Client Portal',
};

interface CasesPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }>;
}

export default async function CasesPage({ searchParams }: CasesPageProps) {
  const user = await requireClientUser();
  const params = await searchParams;

  const page = parseInt(params.page || '1', 10);
  const search = params.search || '';
  const status = params.status || undefined;
  const sortBy = params.sortBy || 'created_at';
  const sortOrder = (params.sortOrder as 'asc' | 'desc') || 'desc';

  const result = await listCases({
    page,
    pageSize: 25,
    search,
    sortBy,
    sortOrder,
    clientId: user.clientId!,
    status: status as any,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Your Cases"
        description="View and manage all screening cases"
      />

      <Suspense fallback={<div>Loading cases...</div>}>
        <ClientCasesTable
          data={result.data}
          page={result.page}
          pageSize={result.pageSize}
          totalPages={result.totalPages}
          totalCount={result.count}
          search={search}
          status={status}
          sortBy={sortBy}
          sortOrder={sortOrder}
        />
      </Suspense>
    </div>
  );
}
