'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { addCaseNoteAction } from './actions';

interface CaseNote {
  id: string;
  content: string;
  created_by: string;
  created_by_name: string | null;
  is_internal: boolean;
  created_at: string;
}

interface CaseNotesPanelProps {
  caseId: string;
  initialNotes: CaseNote[];
}

export function CaseNotesPanel({
  caseId,
  initialNotes,
}: CaseNotesPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState('');
  const [isInternal, setIsInternal] = useState(true);
  const [notes, setNotes] = useState(initialNotes);

  const handleAddNote = () => {
    if (!content.trim()) return;

    startTransition(async () => {
      const result = await addCaseNoteAction({
        caseId,
        content,
        isInternal,
      });

      if ('error' in result) {
        console.error('Failed to add note:', result.error);
      } else {
        setContent('');
        router.refresh();
      }
    });
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Case Notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <Textarea
            placeholder="Add a note to this case..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isPending}
            className="min-h-20 bg-white"
          />

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                disabled={isPending}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Internal note only</span>
            </label>

            <Button
              onClick={handleAddNote}
              disabled={isPending || !content.trim()}
              className="gap-2"
            >
              {isPending && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              )}
              Add Note
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium text-gray-900">Notes History</h3>

          {notes.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-500">
              No notes yet
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="rounded-lg border border-gray-200 p-4"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <div className="font-medium text-gray-900">
                        {note.created_by_name || 'Unknown user'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(note.created_at)}
                      </div>
                    </div>
                    {note.is_internal && (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                        Internal
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {note.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
