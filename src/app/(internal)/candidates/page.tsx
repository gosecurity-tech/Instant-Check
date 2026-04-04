import { Suspense } from 'react';
import { requireInternalUser } from '@/lib/auth/server';
import { listCandidates } from '@/lib/services/candidates';
import { PageHeader } from '@/components/shared/PageHeader';
import { CandidatesTable } from './CandidatesTable';

export const metadata = { title: 'Candidates — Instant Check' };

interface CandidatesPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }>;
}

export default async function CandidatesPage({ searchParams }: CandidatesPageProps) {
  await requireInternalUser();

  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);
  const search = params.search || '';
  const sortBy = params.sortBy || 'created_at';
  const sortOrder = params.sortOrder || 'desc';

  const result = await listCandidates({
    page,
    pageSize: 20,
    search,
    sortBy,
    sortOrder,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Candidates"
        description="All candidates across active and completed cases."
      />

      <Suspense fallback={<div>Loading candidates...</div>}>
        <CandidatesTable
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
