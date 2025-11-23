import { CallRecord } from '@/types/call';
import { SchemaDefinition, FieldDefinition } from '@/types/schema';
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
  schema: SchemaDefinition | null;
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
  schema,
  onSelectCall,
  onUpdateCalls,
  transcribingIds,
  evaluatingIds,
  selectedCallIds,
  onToggleSelect,
  onTranscribe,
  onEvaluate,
}: CallsTableProps) {
  // Get visible columns from schema (fields marked as showInTable)
  const visibleFields = useMemo(() => {
    if (!schema) return [];
    return schema.fields.filter(field => field.showInTable);
  }, [schema]);

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

  const formatFieldValue = (value: any, field: FieldDefinition): string => {
    if (value === null || value === undefined) return '-';
    
    switch (field.type) {
      case 'date':
        return formatDate(value);
      case 'number':
        // Format currency if field name suggests it's a monetary value
        if (field.name.toLowerCase().includes('amount') || field.name.toLowerCase().includes('price')) {
          return `$${Number(value).toFixed(2)}`;
        }
        return String(value);
      case 'boolean':
        return value ? 'Yes' : 'No';
      default:
        return String(value);
    }
  };

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>(
    { key: 'createdAt', direction: 'desc' }
  );

  type SortKey = string;

  const handleSort = (key: string) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    );
  };

  const getSortIndicator = (key: string) => {
    if (sortConfig.key !== key) {
      return '↕';
    }
    return sortConfig.direction === 'asc' ? '▲' : '▼';
  };

  const getSortableValue = (call: CallRecord, key: string) => {
    // Handle special system fields
    if (key === 'createdAt') {
      return call.createdAt ? new Date(call.createdAt).getTime() : null;
    }
    if (key === 'status') {
      return call.status;
    }
    if (key === 'score') {
      return call.evaluation?.percentage ?? null;
    }
    
    // Handle metadata fields from schema
    const value = call.metadata[key];
    if (value === null || value === undefined) return null;
    
    // Normalize strings for case-insensitive sorting
    if (typeof value === 'string') {
      return value.toLowerCase();
    }
    
    return value;
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
            
            {/* Status and Score - Always first */}
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
            
            {/* Dynamic columns from schema */}
            {visibleFields.map(field => (
              <TableHead key={field.id} className="cursor-pointer">
                <button
                  type="button"
                  className="flex w-full items-center gap-1 text-left font-medium hover:text-primary"
                  onClick={() => handleSort(field.name)}
                >
                  {field.displayName}
                  <span className="text-xs text-muted-foreground">
                    {getSortIndicator(field.name)}
                  </span>
                </button>
              </TableHead>
            ))}
            
            {/* Date column */}
            <TableHead className="cursor-pointer">
              <button
                type="button"
                className="flex w-full items-center gap-1 text-left font-medium hover:text-primary"
                onClick={() => handleSort('createdAt')}
              >
                Date
                <span className="text-xs text-muted-foreground">{getSortIndicator('createdAt')}</span>
              </button>
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedCalls.map((call) => {
            const canTranscribe = !!call.audioFile;
            const canEvaluate = !!call.transcript;
            const canProcess = canTranscribe || canEvaluate;
            
            return (
            <TableRow
              key={call.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onSelectCall(call)}
            >
              <TableCell className="w-12" onClick={(e) => e.stopPropagation()}>
                {canProcess && (
                  <Checkbox
                    checked={selectedCallIds.has(call.id)}
                    onCheckedChange={() => onToggleSelect(call.id)}
                  />
                )}
              </TableCell>
              
              {/* Status and Score - Always first */}
              <TableCell>{getStatusBadge(call.status)}</TableCell>
              <TableCell className="text-center">
                {call.evaluation ? (
                  <span className="font-semibold">{call.evaluation.percentage}%</span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              
              {/* Dynamic cells from schema */}
              {visibleFields.map((field, index) => {
                const value = call.metadata[field.name];
                const formattedValue = formatFieldValue(value, field);
                
                return (
                  <TableCell 
                    key={field.id}
                    className={index === 0 ? 'font-medium' : ''}
                  >
                    {formattedValue}
                  </TableCell>
                );
              })}
              
              {/* Date cell */}
              <TableCell className="text-muted-foreground">
                {formatDate(call.createdAt)}
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
