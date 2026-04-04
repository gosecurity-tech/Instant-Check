'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DocumentType } from '@/types/enums';

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  [DocumentType.Passport]: 'Passport',
  [DocumentType.DrivingLicence]: 'Driving Licence',
  [DocumentType.NationalId]: 'National ID',
  [DocumentType.BirthCertificate]: 'Birth Certificate',
  [DocumentType.UtilityBill]: 'Utility Bill',
  [DocumentType.BankStatement]: 'Bank Statement',
  [DocumentType.CouncilTaxBill]: 'Council Tax Bill',
  [DocumentType.TenancyAgreement]: 'Tenancy Agreement',
  [DocumentType.MortgageStatement]: 'Mortgage Statement',
  [DocumentType.P45]: 'P45',
  [DocumentType.P60]: 'P60',
  [DocumentType.Payslip]: 'Payslip',
  [DocumentType.EmploymentContract]: 'Employment Contract',
  [DocumentType.EducationCertificate]: 'Education Certificate',
  [DocumentType.ProfessionalCertificate]: 'Professional Certificate',
  [DocumentType.DbsCertificate]: 'DBS Certificate',
  [DocumentType.RightToWorkEvidence]: 'Right to Work Evidence',
  [DocumentType.ReferenceResponse]: 'Reference Response',
  [DocumentType.Other]: 'Other',
};

interface DocumentUploadFormProps {
  caseId: string;
}

export function DocumentUploadForm({ caseId }: DocumentUploadFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedType, setSelectedType] = useState<DocumentType | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    if (!selectedType) {
      setError('Please select a document type');
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('caseId', caseId);
      formData.append('documentType', selectedType);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload document');
      }

      setSuccess('Document uploaded successfully');
      setSelectedFile(null);
      setSelectedType('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Refresh the page to show the new document
      router.refresh();

      // Close form after a short delay
      setTimeout(() => {
        setIsOpen(false);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2"
      >
        <Upload className="w-4 h-4" />
        Upload Document
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-semibold mb-4">Upload Document</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* File Input */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Select File
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  disabled={isLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {selectedFile && (
                  <p className="text-xs text-gray-600 mt-1">
                    {selectedFile.name}
                  </p>
                )}
              </div>

              {/* Document Type Select */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Document Type
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as DocumentType)}
                  disabled={isLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a type...</option>
                  {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                  {success}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !selectedFile || !selectedType}
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isLoading ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
