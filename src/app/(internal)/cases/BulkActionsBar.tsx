'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { CaseStatus, CasePriority } from '@/types/enums';
import {
  bulkAssignAction,
  bulkStatusAction,
  bulkPriorityAction,
  bulkExportAction,
} from './bulk-actions';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

interface BulkActionsBarProps {
  selectedIds: string[];
  onClearSelection: () => void;
}

interface ActionResult {
  succeeded: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

export function BulkActionsBar({ selectedIds, onClearSelection }: BulkActionsBarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [assigneeInput, setAssigneeInput] = useState('');
  const [statusInput, setStatusInput] = useState('');
  const [priorityInput, setPriorityInput] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [result, setResult] = useState<ActionResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleAssign = () => {
    if (!assigneeInput.trim()) {
      alert('Please enter a user ID');
      return;
    }

    startTransition(async () => {
      try {
        const res = await bulkAssignAction({
          caseIds: selectedIds,
          assigneeId: assigneeInput,
        });
        setResult(res);
        setShowResult(true);
        setAssigneeInput('');
        router.refresh();

        setTimeout(() => {
          setShowResult(false);
        }, 4000);
      } catch (error) {
        console.error('Bulk assign failed:', error);
        alert('Failed to assign cases');
      }
    });
  };

  const handleStatusChange = () => {
    if (!statusInput) {
      alert('Please select a status');
      return;
    }

    startTransition(async () => {
      try {
        const res = await bulkStatusAction({
          caseIds: selectedIds,
          status: statusInput,
          notes: statusNotes || undefined,
        });
        setResult(res);
        setShowResult(true);
        setStatusInput('');
        setStatusNotes('');
        router.refresh();

        setTimeout(() => {
          setShowResult(false);
        }, 4000);
      } catch (error) {
        console.error('Bulk status change failed:', error);
        alert('Failed to change case status');
      }
    });
  };

  const handlePriorityChange = () => {
    if (!priorityInput) {
      alert('Please select a priority');
      return;
    }

    startTransition(async () => {
      try {
        const res = await bulkPriorityAction({
          caseIds: selectedIds,
          priority: priorityInput,
        });
        setResult(res);
        setShowResult(true);
        setPriorityInput('');
        router.refresh();

        setTimeout(() => {
          setShowResult(false);
        }, 4000);
      } catch (error) {
        console.error('Bulk priority change failed:', error);
        alert('Failed to change case priority');
      }
    });
  };

  const handleExport = () => {
    startTransition(async () => {
      try {
        const { csv, filename } = await bulkExportAction(selectedIds);

        if (!csv) {
          alert('No data to export');
          return;
        }

        // Trigger download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setResult({
          succeeded: selectedIds.length,
          failed: 0,
          errors: [],
        });
        setShowResult(true);

        setTimeout(() => {
          setShowResult(false);
        }, 3000);
      } catch (error) {
        console.error('Export failed:', error);
        alert('Failed to export cases');
      }
    });
  };

  const isVisible = selectedIds.length > 0;
  const count = selectedIds.length;

  return (
    <>
      {/* Result Notification */}
      {showResult && result && (
        <div className="fixed bottom-24 left-4 right-4 md:left-auto md:right-4 md:max-w-sm bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-40">
          <div className="flex items-start gap-3">
            {result.failed === 0 ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="font-medium text-sm">
                {result.failed === 0
                  ? `Successfully updated ${result.succeeded} case${result.succeeded !== 1 ? 's' : ''}`
                  : `Updated ${result.succeeded} case${result.succeeded !== 1 ? 's' : ''}, ${result.failed} failed`}
              </p>
              {result.errors.length > 0 && (
                <p className="text-xs text-gray-600 mt-1">
                  {result.errors.slice(0, 2).map((e) => e.error).join('; ')}
                  {result.errors.length > 2 && ` and ${result.errors.length - 2} more`}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Bar */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 transition-transform duration-300 ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        } z-40 md:bottom-4 md:right-4 md:left-auto md:top-auto md:w-full md:max-w-2xl md:rounded-lg md:border md:shadow-lg`}
      >
        <div className="p-4">
          <div className="flex items-center justify-between gap-3 mb-4">
            <span className="font-medium text-sm md:text-base">
              {count} case{count !== 1 ? 's' : ''} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              disabled={isPending}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            {/* Assign Button */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="User ID"
                value={assigneeInput}
                onChange={(e) => setAssigneeInput(e.target.value)}
                disabled={isPending}
                className="px-3 py-2 border border-gray-300 rounded text-sm flex-1"
              />
              <Button
                size="sm"
                onClick={handleAssign}
                disabled={isPending || !assigneeInput.trim()}
                variant="outline"
                className="text-sm"
              >
                Assign
              </Button>
            </div>

            {/* Status Select */}
            <div className="flex gap-2">
              <Select value={statusInput} onValueChange={setStatusInput} disabled={isPending}>
                <SelectTrigger className="h-9 text-sm flex-1">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CaseStatus).map(([key, value]) => (
                    <SelectItem key={value} value={value}>
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={handleStatusChange}
                disabled={isPending || !statusInput}
                variant="outline"
                className="text-sm"
              >
                Change
              </Button>
            </div>

            {/* Priority Select */}
            <div className="flex gap-2">
              <Select value={priorityInput} onValueChange={setPriorityInput} disabled={isPending}>
                <SelectTrigger className="h-9 text-sm flex-1">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CasePriority).map(([key, value]) => (
                    <SelectItem key={value} value={value}>
                      {key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={handlePriorityChange}
                disabled={isPending || !priorityInput}
                variant="outline"
                className="text-sm"
              >
                Update
              </Button>
            </div>

            {/* Export Button */}
            <Button
              size="sm"
              onClick={handleExport}
              disabled={isPending}
              variant="outline"
              className="text-sm"
            >
              Export CSV
            </Button>

            {/* Clear Button */}
            <Button
              size="sm"
              onClick={onClearSelection}
              disabled={isPending}
              variant="outline"
              className="text-sm"
            >
              Clear
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
