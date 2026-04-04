import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { DocumentType, DocumentStatus } from '@/types/enums';

// ============================================================
// Types
// ============================================================

export interface DocumentSummary {
  id: string;
  case_id: string;
  candidate_id: string | null;
  check_id: string | null;
  organisation_id: string;
  document_type: DocumentType;
  status: DocumentStatus;
  file_name: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  created_at: string;
}

export interface DocumentDetail extends DocumentSummary {
  storage_path: string;
  storage_bucket: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  expires_at: string | null;
  updated_at: string;
}

export interface DocumentStats {
  total: number;
  pending_review: number;
  accepted: number;
  rejected: number;
}

// ============================================================
// List documents for a case
// ============================================================

export async function listDocumentsForCase(caseId: string): Promise<DocumentSummary[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('documents')
    .select(
      'id, case_id, candidate_id, check_id, organisation_id, document_type, status, file_name, file_size, mime_type, uploaded_by, created_at'
    )
    .eq('case_id', caseId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list documents: ${error.message}`);
  }

  return (data ?? []) as unknown as DocumentSummary[];
}

// ============================================================
// Get document by ID
// ============================================================

export async function getDocumentById(documentId: string): Promise<DocumentDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .is('deleted_at', null)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    throw new Error(`Failed to get document: ${error.message}`);
  }

  return (data ?? null) as unknown as DocumentDetail | null;
}

// ============================================================
// Upload document
// ============================================================

export async function uploadDocument(params: {
  caseId: string;
  candidateId?: string;
  checkId?: string;
  organisationId: string;
  documentType: DocumentType;
  file: {
    name: string;
    size: number;
    type: string;
    buffer: Buffer;
  };
  uploadedBy: string;
}): Promise<string> {
  const supabase = await createClient();
  const admin = createAdminClient();

  // Generate unique document ID
  const documentId = crypto.randomUUID();

  // Build storage path: ${organisationId}/${caseId}/${documentId}/${fileName}
  const storagePath = `${params.organisationId}/${params.caseId}/${documentId}/${params.file.name}`;

  // Upload file to storage
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, params.file.buffer, {
      cacheControl: '3600',
      upsert: false,
      contentType: params.file.type,
    });

  if (uploadError) {
    throw new Error(`Failed to upload file to storage: ${uploadError.message}`);
  }

  // Create document record in database (use admin client to bypass RLS)
  const { data, error: dbError } = await admin
    .from('documents')
    .insert({
      id: documentId,
      case_id: params.caseId,
      candidate_id: params.candidateId ?? null,
      check_id: params.checkId ?? null,
      organisation_id: params.organisationId,
      document_type: params.documentType,
      status: 'pending_review',
      file_name: params.file.name,
      file_size: params.file.size,
      mime_type: params.file.type,
      storage_path: storagePath,
      storage_bucket: 'documents',
      uploaded_by: params.uploadedBy,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (dbError) {
    throw new Error(`Failed to create document record: ${dbError.message}`);
  }

  return (data as { id: string }).id;
}

// ============================================================
// Review document
// ============================================================

export async function reviewDocument(
  documentId: string,
  reviewerId: string,
  status: DocumentStatus,
  notes?: string
): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin
    .from('documents')
    .update({
      status,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      review_notes: notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId);

  if (error) {
    throw new Error(`Failed to review document: ${error.message}`);
  }
}

// ============================================================
// Get signed download URL
// ============================================================

export async function getDocumentDownloadUrl(documentId: string): Promise<string> {
  const supabase = await createClient();

  // Get document to find storage path
  const document = await getDocumentById(documentId);
  if (!document) {
    throw new Error('Document not found');
  }

  // Generate signed URL with 1 hour expiry
  const { data, error } = await supabase.storage
    .from(document.storage_bucket)
    .createSignedUrl(document.storage_path, 3600);

  if (error) {
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

// ============================================================
// Delete document (soft delete)
// ============================================================

export async function deleteDocument(documentId: string): Promise<void> {
  const admin = createAdminClient();

  // Get document first to get storage path
  const document = await getDocumentById(documentId);
  if (!document) {
    throw new Error('Document not found');
  }

  // Delete from storage
  const { error: storageError } = await admin.storage
    .from(document.storage_bucket)
    .remove([document.storage_path]);

  if (storageError) {
    console.error(`Failed to delete file from storage: ${storageError.message}`);
    // Continue with soft delete even if storage delete fails
  }

  // Soft delete in database
  const { error: dbError } = await admin
    .from('documents')
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId);

  if (dbError) {
    throw new Error(`Failed to delete document: ${dbError.message}`);
  }
}

// ============================================================
// Get document statistics for a case
// ============================================================

export async function getDocumentStats(caseId: string): Promise<DocumentStats> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('documents')
    .select('status')
    .eq('case_id', caseId)
    .is('deleted_at', null);

  if (error) {
    throw new Error(`Failed to get document stats: ${error.message}`);
  }

  const stats: DocumentStats = {
    total: data?.length ?? 0,
    pending_review: data?.filter((d) => d.status === 'pending_review').length ?? 0,
    accepted: data?.filter((d) => d.status === 'accepted').length ?? 0,
    rejected: data?.filter((d) => d.status === 'rejected').length ?? 0,
  };

  return stats;
}
