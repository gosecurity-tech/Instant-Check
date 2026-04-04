'use server';

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Download, Trash2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { requireInternalUser } from '@/lib/auth/server';
import { getCaseById } from '@/lib/services/cases';
import { listDocumentsForCase, getDocumentStats } from '@/lib/services/documents';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PageHeader } from '@/components/shared/PageHeader';
import { DocumentUploadForm } from './DocumentUploadForm';

interface DocumentsPageProps {
  params: Promise<{ id: string }>;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function getDocumentTypeLabel(type: string): string {
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'accepted':
      return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    case 'rejected':
      return <XCircle className="w-4 h-4 text-red-600" />;
    case 'pending_review':
      return <Clock className="w-4 h-4 text-amber-600" />;
    default:
      return null;
  }
}

export async function generateMetadata({ params }: DocumentsPageProps) {
  const { id } = await params;
  return {
    title: `Documents — Case ${id} — Instant Check`,
  };
}

export default async function DocumentsPage({ params }: DocumentsPageProps) {
  // Ensure user is authenticated as internal
  await requireInternalUser();

  // Get the case ID from params
  const { id } = await params;

  // Fetch case data
  const caseData = await getCaseById(id);
  if (!caseData) {
    notFound();
  }

  // Fetch documents and stats
  const documents = await listDocumentsForCase(id);
  const stats = await getDocumentStats(id);

  return (
    <div>
      <PageHeader
        title="Documents"
        description={`Managing ${stats.total} documents for case ${id}`}
        backHref={`/cases/${id}`}
        actions={
          <DocumentUploadForm caseId={id} />
        }
      />

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-gray-600">Total Documents</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">{stats.pending_review}</div>
              <div className="text-sm text-gray-600">Pending Review</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
              <div className="text-sm text-gray-600">Accepted</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
              <div className="text-sm text-gray-600">Rejected</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documents Table */}
      {documents.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="text-center">
              <p className="text-gray-500 mb-4">No documents uploaded yet</p>
              <p className="text-sm text-gray-400">Upload documents using the button above</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Document List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">File Name</th>
                    <th className="px-4 py-2 text-left font-semibold">Type</th>
                    <th className="px-4 py-2 text-left font-semibold">Status</th>
                    <th className="px-4 py-2 text-left font-semibold">Size</th>
                    <th className="px-4 py-2 text-left font-semibold">Uploaded</th>
                    <th className="px-4 py-2 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/api/documents/${doc.id}`}
                          target="_blank"
                          className="text-blue-600 hover:underline flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          {doc.file_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">
                          {getDocumentTypeLabel(doc.document_type)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(doc.status)}
                          <StatusBadge status={doc.status} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatFileSize(doc.file_size)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatDate(doc.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {doc.status === 'pending_review' && (
                            <div className="text-xs text-gray-400">
                              Awaiting review
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
