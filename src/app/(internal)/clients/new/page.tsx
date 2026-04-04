import { requireInternalUser } from '@/lib/auth/server';
import { PageHeader } from '@/components/shared/PageHeader';
import { NewClientForm } from './NewClientForm';

export const metadata = { title: 'New Client — Instant Check' };

export default async function NewClientPage() {
  await requireInternalUser();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add New Client"
        backHref="/clients"
      />

      <NewClientForm />
    </div>
  );
}
