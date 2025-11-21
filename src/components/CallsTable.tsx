import { CallRecord } from '@/types/call';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { PlayCircle, Microphone, CheckCircle } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';

interface CallsTableProps {
  calls: CallRecord[];
  onSelectCall: (call: CallRecord) => void;
  onUpdateCalls: (updater: (prev: CallRecord[] | undefined) => CallRecord[]) => void;
  transcribingIds: Set<string>;
  evaluatingIds: Set<string>;
  selectedCallIds: Set<string>;
  onToggleSelect: (callId: string) => void;
  onTranscribe: (call: CallRecord, e: React.MouseEvent) => void;
  onEvaluate: (call: CallRecord, e: React.MouseEvent) => void;
}

export function CallsTable({
  calls,
  onSelectCall,
  onUpdateCalls,
  transcribingIds,
  evaluatingIds,
  selectedCallIds,
  onToggleSelect,
  onTranscribe,
  onEvaluate,
}: CallsTableProps) {
  const getStatusBadge = (status: CallRecord['status']) => {
    const variants: Record<CallRecord['status'], {
      variant: 'default' | 'secondary' | 'destructive' | 'outline';
      label: string;
    }> = {
      uploaded: { variant: 'secondary', label: 'Uploaded' },
      processing: { variant: 'outline', label: 'Processing...' },
      transcribed: { variant: 'outline', label: 'Transcribed' },
      evaluated: { variant: 'default', label: 'Evaluated' },
      failed: { variant: 'destructive', label: 'Failed' },
    };
    
    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>(
    { key: 'date', direction: 'desc' }
  );

  type SortKey =
    | 'agent'
    | 'borrower'
    | 'product'
    | 'daysPastDue'
    | 'dueAmount'
    | 'date'
    | 'status'
    | 'score';

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    );
  };

  const getSortIndicator = (key: SortKey) => {
    if (sortConfig.key !== key) {
      return '↕';
    }
    return sortConfig.direction === 'asc' ? '▲' : '▼';
  };

  const getSortableValue = (call: CallRecord, key: SortKey) => {
    switch (key) {
      case 'agent':
        return call.metadata.agentName?.toLowerCase() || '';
      case 'borrower':
        return call.metadata.borrowerName?.toLowerCase() || '';
      case 'product':
        return call.metadata.product?.toLowerCase() || '';
      case 'daysPastDue':
        return call.metadata.daysPastDue ?? null;
      case 'dueAmount':
        return call.metadata.dueAmount ?? null;
      case 'date':
        return call.createdAt ? new Date(call.createdAt).getTime() : null;
      case 'status':
        return call.status;
      case 'score':
        return call.evaluation?.percentage ?? null;
      default:
        return null;
    }
  };

  const sortedCalls = useMemo(() => {
    const result = [...calls];
    result.sort((a, b) => {
      const aValue = getSortableValue(a, sortConfig.key);
      const bValue = getSortableValue(b, sortConfig.key);

      if (aValue === null || aValue === undefined) {
        if (bValue === null || bValue === undefined) return 0;
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      if (bValue === null || bValue === undefined) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }

      const numericComparison = Number(aValue) - Number(bValue);
      if (numericComparison === 0) return 0;
      return sortConfig.direction === 'asc' ? numericComparison : -numericComparison;
    });
    return result;
  }, [calls, sortConfig]);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead className="cursor-pointer">
              <button
                type="button"
                className="flex w-full items-center gap-1 text-left font-medium hover:text-primary"
                onClick={() => handleSort('agent')}
              >
                Agent
                <span className="text-xs text-muted-foreground">{getSortIndicator('agent')}</span>
              </button>
            </TableHead>
            <TableHead className="cursor-pointer">
              <button
                type="button"
                className="flex w-full items-center gap-1 text-left font-medium hover:text-primary"
                onClick={() => handleSort('borrower')}
              >
                Borrower
                <span className="text-xs text-muted-foreground">{getSortIndicator('borrower')}</span>
              </button>
            </TableHead>
            <TableHead className="cursor-pointer">
              <button
                type="button"
                className="flex w-full items-center gap-1 text-left font-medium hover:text-primary"
                onClick={() => handleSort('product')}
              >
                Product
                <span className="text-xs text-muted-foreground">{getSortIndicator('product')}</span>
              </button>
            </TableHead>
            <TableHead className="cursor-pointer">
              <button
                type="button"
                className="flex w-full items-center gap-1 text-left font-medium hover:text-primary"
                onClick={() => handleSort('daysPastDue')}
              >
                Days Past Due
                <span className="text-xs text-muted-foreground">{getSortIndicator('daysPastDue')}</span>
              </button>
            </TableHead>
            <TableHead className="cursor-pointer">
              <button
                type="button"
                className="flex w-full items-center gap-1 text-left font-medium hover:text-primary"
                onClick={() => handleSort('dueAmount')}
              >
                Due Amount
                <span className="text-xs text-muted-foreground">{getSortIndicator('dueAmount')}</span>
              </button>
            </TableHead>
            <TableHead className="cursor-pointer">
              <button
                type="button"
                className="flex w-full items-center gap-1 text-left font-medium hover:text-primary"
                onClick={() => handleSort('date')}
              >
                Date
                <span className="text-xs text-muted-foreground">{getSortIndicator('date')}</span>
              </button>
            </TableHead>
            <TableHead className="cursor-pointer">
              <button
                type="button"
                className="flex w-full items-center gap-1 text-left font-medium hover:text-primary"
                onClick={() => handleSort('status')}
              >
                Status
                <span className="text-xs text-muted-foreground">{getSortIndicator('status')}</span>
              </button>
            </TableHead>
            <TableHead className="cursor-pointer text-center">
              <button
                type="button"
                className="flex w-full items-center justify-center gap-1 font-medium hover:text-primary"
                onClick={() => handleSort('score')}
              >
                Score
                <span className="text-xs text-muted-foreground">{getSortIndicator('score')}</span>
              </button>
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedCalls.map((call, index) => {
            // Allow re-transcription for any call with audio file, regardless of status
            const canTranscribe = !!call.audioFile;
            if (index === 0) {
              console.log('=== TABLE RENDERING ===');
              console.log('First call metadata:', call.metadata);
              console.log('Agent Name:', call.metadata.agentName);
              console.log('Borrower Name:', call.metadata.borrowerName);
            }
            return (
            <TableRow
              key={call.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onSelectCall(call)}
            >
              <TableCell className="w-12" onClick={(e) => e.stopPropagation()}>
                {canTranscribe && (
                  <Checkbox
                    checked={selectedCallIds.has(call.id)}
                    onCheckedChange={() => onToggleSelect(call.id)}
                  />
                )}
              </TableCell>
              <TableCell className="font-medium">{call.metadata.agentName || 'NO AGENT'}</TableCell>
              <TableCell>{call.metadata.borrowerName || 'NO BORROWER'}</TableCell>
              <TableCell>{call.metadata.product || 'NO PRODUCT'}</TableCell>
              <TableCell>{call.metadata.daysPastDue ?? 'NO DAYS'}</TableCell>
              <TableCell>${(call.metadata.dueAmount || 0).toFixed(2)}</TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(call.createdAt)}
              </TableCell>
              <TableCell>{getStatusBadge(call.status)}</TableCell>
              <TableCell className="text-center">
                {call.evaluation ? (
                  <span className="font-semibold">{call.evaluation.percentage}%</span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectCall(call);
                    }}
                    className="w-8 h-8 rounded-full border border-border hover:bg-muted flex items-center justify-center transition-colors"
                    title="View details"
                  >
                    <PlayCircle size={16} />
                  </button>
                </div>
              </TableCell>
            </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
