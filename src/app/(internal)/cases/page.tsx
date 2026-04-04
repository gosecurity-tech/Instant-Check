import { Suspense } from 'react';
import Link from 'next/link';
import { requireInternalUser } from '@/lib/auth/server';
import { listCases } from '@/lib/services/cases';
import { CaseStatus } from '@/types/enums';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { CasesTable } from './CasesTable';

export const metadata = { title: 'Cases — Instant Check' };

interface CasesPageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

export default async function CasesPage({ searchParams }: CasesPageProps) {
  await requireInternalUser();

  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);
  const pageSize = parseInt(params.pageSize || '25', 10);
  const search = params.search || undefined;
  const status = params.status || undefined;
  const sortBy = params.sortBy || 'created_at';
  const sortOrder = (params.sortOrder || 'desc') as 'asc' | 'desc';

  const result = await listCases({
    page,
    pageSize,
    search,
    status: status as CaseStatus | undefined,
    sortBy,
    sortOrder,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cases"
        description="All vetting cases"
        actions={
          <Link href="/cases/new">
            <Button>New Case</Button>
          </Link>
        }
      />

      <Suspense fallback={<div className="text-gray-500">Loading cases...</div>}>
        <CasesTable
          data={result.data}
          page={result.page}
          pageSize={result.pageSize}
          totalPages={result.totalPages}
          totalCount={result.count}
          search={search}
          sortBy={sortBy}
          sortOrder={sortOrder}
          status={status}
        />
      </Suspense>
    </div>
  );
}
