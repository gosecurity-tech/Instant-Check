'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { X } from 'lucide-react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface AuditFiltersProps {
  action?: string;
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
}

const ACTION_OPTIONS = [
  { value: 'case.created', label: 'Case Created' },
  { value: 'case.status_changed', label: 'Case Status Changed' },
  { value: 'case.assigned', label: 'Case Assigned' },
  { value: 'case.adjudicated', label: 'Case Adjudicated' },
  { value: 'case.reopened', label: 'Case Reopened' },
  { value: 'check.status_changed', label: 'Check Status Changed' },
  { value: 'check.reviewed', label: 'Check Reviewed' },
  { value: 'candidate.invited', label: 'Candidate Invited' },
  { value: 'candidate.submitted', label: 'Candidate Submitted' },
  { value: 'reference.requested', label: 'Reference Requested' },
  { value: 'reference.response_received', label: 'Reference Response Received' },
  { value: 'rtw.created', label: 'Right to Work Check Created' },
  { value: 'rtw.reviewed', label: 'Right to Work Check Reviewed' },
  { value: 'dbs.created', label: 'DBS Check Created' },
  { value: 'dbs.reviewed', label: 'DBS Check Reviewed' },
  { value: 'user_created', label: 'User Created' },
  { value: 'user.login', label: 'User Login' },
  { value: 'document.uploaded', label: 'Document Uploaded' },
  { value: 'report.generated', label: 'Report Generated' },
];

const ENTITY_TYPE_OPTIONS = [
  { value: 'case', label: 'Case' },
  { value: 'case_check', label: 'Case Check' },
  { value: 'candidate', label: 'Candidate' },
  { value: 'document', label: 'Document' },
  { value: 'reference_request', label: 'Reference Request' },
  { value: 'reference_response', label: 'Reference Response' },
  { value: 'internal_user', label: 'Internal User' },
  { value: 'client_user', label: 'Client User' },
  { value: 'client', label: 'Client' },
  { value: 'report', label: 'Report' },
  { value: 'right_to_work_check', label: 'Right to Work Check' },
  { value: 'dbs_check', label: 'DBS Check' },
  { value: 'system', label: 'System' },
];

export function AuditFilters({
  action = '',
  entityType = '',
  dateFrom = '',
  dateTo = '',
}: AuditFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleActionChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams);
      if (value) {
        params.set('action', value);
      } else {
        params.delete('action');
      }
      params.set('page', '1');
      router.push(`/audit?${params.toString()}`);
    },
    [searchParams, router]
  );

  const handleEntityTypeChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams);
      if (value) {
        params.set('entityType', value);
      } else {
        params.delete('entityType');
      }
      params.set('page', '1');
      router.push(`/audit?${params.toString()}`);
    },
    [searchParams, router]
  );

  const handleDateFromChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const params = new URLSearchParams(searchParams);
      if (e.target.value) {
        params.set('dateFrom', e.target.value);
      } else {
        params.delete('dateFrom');
      }
      params.set('page', '1');
      router.push(`/audit?${params.toString()}`);
    },
    [searchParams, router]
  );

  const handleDateToChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const params = new URLSearchParams(searchParams);
      if (e.target.value) {
        params.set('dateTo', e.target.value);
      } else {
        params.delete('dateTo');
      }
      params.set('page', '1');
      router.push(`/audit?${params.toString()}`);
    },
    [searchParams, router]
  );

  const handleClear = useCallback(() => {
    router.push('/audit');
  }, [router]);

  const hasActiveFilters =
    action || entityType || dateFrom || dateTo;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={action} onValueChange={handleActionChange}>
        <SelectTrigger className="w-56">
          <SelectValue placeholder="Filter by action" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All actions</SelectItem>
          {ACTION_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={entityType} onValueChange={handleEntityTypeChange}>
        <SelectTrigger className="w-56">
          <SelectValue placeholder="Filter by entity type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All entity types</SelectItem>
          {ENTITY_TYPE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div>
        <label htmlFor="date-from" className="sr-only">
          From date
        </label>
        <input
          id="date-from"
          type="date"
          value={dateFrom}
          onChange={handleDateFromChange}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          aria-label="From date"
        />
      </div>

      <div>
        <label htmlFor="date-to" className="sr-only">
          To date
        </label>
        <input
          id="date-to"
          type="date"
          value={dateTo}
          onChange={handleDateToChange}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          aria-label="To date"
        />
      </div>

      {hasActiveFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleClear}
          className="gap-2"
        >
          <X className="h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
