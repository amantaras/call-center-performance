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
import { useMemo, useState, useEffect } from 'react';

interface CallsTableProps {
  calls: CallRecord[];
  schema: SchemaDefinition | null;
  onSelectCall: (call: CallRecord) => void;
  onUpdateCalls: (updater: (prev: CallRecord[] | undefined) => CallRecord[]) => void;
  transcribingIds: Set<string>;
  evaluatingIds: Set<string>;
  selectedCallIds: Set<string>;
  onToggleSelect: (callId: string, index: number, shiftKey: boolean) => void;
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
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Get visible columns from schema (fields marked as showInTable)
  const visibleFields = useMemo(() => {
    if (!schema) return [];
    return schema.fields.filter(field => field.showInTable);
  }, [schema]);

  // Get calculated fields from relationships (marked as displayInTable)
  const calculatedFields = useMemo(() => {
    if (!schema || !schema.relationships) return [];
    return schema.relationships.filter(rel => 
      rel.type === 'complex' && 
      rel.formula && 
      rel.displayInTable === true
    );
  }, [schema]);

  const getStatusBadge = (status: CallRecord['status']) => {
    const variants: Record<CallRecord['status'], {
      variant: 'default' | 'secondary' | 'destructive' | 'outline';
      label: string;
    }> = {
      'pending audio': { variant: 'outline', label: 'Pending Audio' },
      uploaded: { variant: 'secondary', label: 'Ready to Process' },
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

  // Calculate pagination
  const totalPages = Math.ceil(calls.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;

  // Reset to page 1 when calls change significantly
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [calls.length, currentPage, totalPages]);

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

  // Paginate the sorted calls
  const paginatedCalls = sortedCalls.slice(startIndex, endIndex);

  return (
    <div className="space-y-4">
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
            
            {/* Calculated field columns */}
            {calculatedFields.map(rel => (
              <TableHead key={`calc_${rel.id}`} className="cursor-pointer">
                <button
                  type="button"
                  className="flex w-full items-center gap-1 text-left font-medium hover:text-primary"
                  onClick={() => handleSort(`calc_${rel.id}`)}
                  title={rel.description}
                >
                  <span className="mr-1">🧮</span>
                  {rel.displayName || rel.id}
                  <span className="text-xs text-muted-foreground">
                    {getSortIndicator(`calc_${rel.id}`)}
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
          {paginatedCalls.map((call, rowIndex) => {
            const canTranscribe = !!call.audioFile;
            const canEvaluate = !!call.transcript;
            const canProcess = canTranscribe || canEvaluate;
            // Calculate actual index in filteredCalls (accounting for pagination)
            const actualIndex = (currentPage - 1) * rowsPerPage + rowIndex;
            
            return (
            <TableRow
              key={call.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onSelectCall(call)}
            >
              <TableCell 
                className="w-12" 
                onClick={(e) => {
                  e.stopPropagation();
                  if (canProcess) {
                    onToggleSelect(call.id, actualIndex, e.shiftKey);
                  }
                }}
              >
                {canProcess && (
                  <Checkbox
                    checked={selectedCallIds.has(call.id)}
                    onCheckedChange={() => {}} // Handled by TableCell onClick for shift detection
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
                const value = call.metadata[field.id];
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
              
              {/* Calculated field cells */}
              {calculatedFields.map(rel => {
                const value = call.metadata[`calc_${rel.id}`];
                const formattedValue = value !== undefined && value !== null
                  ? (typeof value === 'number' ? value.toFixed(2) : String(value))
                  : '-';
                
                return (
                  <TableCell 
                    key={`calc_${rel.id}`}
                    className="font-mono text-sm"
                    title={rel.description}
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

      {/* Pagination Controls */}
      {calls.length > 0 && (
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(endIndex, calls.length)} of {calls.length} entries
            </span>
          </div>
          
          <div className="flex items-center gap-6">
            {/* Rows per page selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-8 w-16 rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Page navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                First
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                Last
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
