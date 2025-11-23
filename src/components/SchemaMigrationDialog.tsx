import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  ArrowsClockwise,
  Warning,
  CheckCircle,
  X,
  Info,
  Database,
} from '@phosphor-icons/react';
import { SchemaDefinition, FieldDefinition } from '@/types/schema';
import { CallRecord } from '@/types/call';

interface SchemaMigrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSchema: SchemaDefinition | null;
  targetSchema: SchemaDefinition;
  calls: CallRecord[];
  onMigrate: (keepCalls: boolean) => void;
  onCancel: () => void;
}

/**
 * SchemaMigrationDialog Component
 * 
 * Prompts user when switching schemas, showing:
 * - Schema compatibility analysis
 * - Field mapping warnings
 * - Options to migrate or start fresh
 */
export function SchemaMigrationDialog({
  open,
  onOpenChange,
  currentSchema,
  targetSchema,
  calls,
  onMigrate,
  onCancel,
}: SchemaMigrationDialogProps) {
  const [migrating, setMigrating] = useState(false);

  // Analyze schema compatibility
  const analyzeCompatibility = () => {
    if (!currentSchema) {
      return {
        compatible: false,
        matchingFields: [],
        missingFields: [],
        extraFields: [],
        warnings: ['No current schema active. Starting fresh recommended.'],
      };
    }

    const currentFieldNames = currentSchema.fields.map(f => f.name);
    const targetFieldNames = targetSchema.fields.map(f => f.name);

    const matchingFields = currentSchema.fields.filter(f =>
      targetFieldNames.includes(f.name)
    );

    const missingFields = targetSchema.fields.filter(f =>
      !currentFieldNames.includes(f.name) && f.required
    );

    const extraFields = currentSchema.fields.filter(f =>
      !targetFieldNames.includes(f.name)
    );

    const warnings: string[] = [];

    if (missingFields.length > 0) {
      warnings.push(`${missingFields.length} required field(s) in new schema don't exist in current data`);
    }

    if (extraFields.length > 0) {
      warnings.push(`${extraFields.length} field(s) from current schema won't be used`);
    }

    // Check semantic role compatibility
    const currentParticipant1 = currentSchema.fields.find(f => f.semanticRole === 'participant_1');
    const targetParticipant1 = targetSchema.fields.find(f => f.semanticRole === 'participant_1');
    
    if (currentParticipant1?.name !== targetParticipant1?.name) {
      warnings.push('Participant 1 field has changed');
    }

    const currentParticipant2 = currentSchema.fields.find(f => f.semanticRole === 'participant_2');
    const targetParticipant2 = targetSchema.fields.find(f => f.semanticRole === 'participant_2');
    
    if (currentParticipant2?.name !== targetParticipant2?.name) {
      warnings.push('Participant 2 field has changed');
    }

    const compatible = missingFields.length === 0 && warnings.length <= 2;

    return {
      compatible,
      matchingFields,
      missingFields,
      extraFields,
      warnings,
    };
  };

  const compatibility = analyzeCompatibility();
  const callsAffected = calls.filter(c => c.schemaId === currentSchema?.id).length;

  const handleMigrate = async (keepCalls: boolean) => {
    setMigrating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay for UX
      onMigrate(keepCalls);
    } finally {
      setMigrating(false);
    }
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowsClockwise size={24} className="text-blue-500" />
            Schema Change Detected
          </DialogTitle>
          <DialogDescription>
            You're switching from <strong>{currentSchema?.name || 'No Schema'}</strong> to{' '}
            <strong>{targetSchema.name}</strong>. Review the changes below.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {/* Impact Summary */}
            <Alert variant={compatibility.compatible ? 'default' : 'destructive'}>
              <Info size={18} />
              <AlertTitle>Impact Summary</AlertTitle>
              <AlertDescription className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Existing calls: <strong>{calls.length}</strong></span>
                  <span>Affected: <strong>{callsAffected}</strong></span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Compatibility:</span>
                  <Badge variant={compatibility.compatible ? 'default' : 'destructive'}>
                    {compatibility.compatible ? 'Compatible' : 'Incompatible'}
                  </Badge>
                </div>
              </AlertDescription>
            </Alert>

            {/* Warnings */}
            {compatibility.warnings.length > 0 && (
              <Alert variant="default">
                <Warning size={18} className="text-yellow-500" />
                <AlertTitle>Compatibility Warnings</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    {compatibility.warnings.map((warning, idx) => (
                      <li key={idx} className="text-sm">{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Schema Comparison */}
            <div className="grid grid-cols-2 gap-4">
              {/* Current Schema */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Database size={16} className="text-muted-foreground" />
                  <h4 className="text-sm font-semibold">Current Schema</h4>
                </div>
                {currentSchema ? (
                  <>
                    <div className="text-sm">
                      <p className="font-medium">{currentSchema.name}</p>
                      <Badge variant="outline" className="mt-1">v{currentSchema.version}</Badge>
                    </div>
                    <Separator />
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Fields ({currentSchema.fields.length})</p>
                      <div className="space-y-1">
                        {currentSchema.fields.slice(0, 5).map(field => (
                          <div key={field.id} className="flex items-center justify-between text-xs">
                            <span className={
                              compatibility.extraFields.some(f => f.id === field.id)
                                ? 'text-yellow-600 line-through'
                                : ''
                            }>
                              {field.displayName}
                            </span>
                            <Badge variant="outline" className="text-[10px] h-4">
                              {field.semanticRole}
                            </Badge>
                          </div>
                        ))}
                        {currentSchema.fields.length > 5 && (
                          <p className="text-[10px] text-muted-foreground">
                            +{currentSchema.fields.length - 5} more...
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No active schema</p>
                )}
              </div>

              {/* Target Schema */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Database size={16} className="text-blue-500" />
                  <h4 className="text-sm font-semibold text-blue-600">New Schema</h4>
                </div>
                <div className="text-sm">
                  <p className="font-medium">{targetSchema.name}</p>
                  <Badge variant="default" className="mt-1">v{targetSchema.version}</Badge>
                </div>
                <Separator />
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Fields ({targetSchema.fields.length})</p>
                  <div className="space-y-1">
                    {targetSchema.fields.slice(0, 5).map(field => (
                      <div key={field.id} className="flex items-center justify-between text-xs">
                        <span className={
                          compatibility.missingFields.some(f => f.id === field.id)
                            ? 'text-green-600 font-semibold'
                            : ''
                        }>
                          {field.displayName}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </span>
                        <Badge variant="outline" className="text-[10px] h-4">
                          {field.semanticRole}
                        </Badge>
                      </div>
                    ))}
                    {targetSchema.fields.length > 5 && (
                      <p className="text-[10px] text-muted-foreground">
                        +{targetSchema.fields.length - 5} more...
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Field Changes Detail */}
            {(compatibility.missingFields.length > 0 || compatibility.extraFields.length > 0) && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Field Changes</h4>
                
                {compatibility.missingFields.length > 0 && (
                  <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md">
                    <p className="text-xs font-semibold text-green-900 dark:text-green-100 mb-2">
                      New Required Fields ({compatibility.missingFields.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {compatibility.missingFields.map(field => (
                        <Badge key={field.id} variant="outline" className="text-xs">
                          {field.displayName}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-green-800 dark:text-green-200 mt-2">
                      These will use default values for existing calls
                    </p>
                  </div>
                )}

                {compatibility.extraFields.length > 0 && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md">
                    <p className="text-xs font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                      Removed Fields ({compatibility.extraFields.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {compatibility.extraFields.map(field => (
                        <Badge key={field.id} variant="outline" className="text-xs">
                          {field.displayName}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-yellow-800 dark:text-yellow-200 mt-2">
                      This data will be preserved but hidden
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Migration Progress */}
            {migrating && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Migrating calls...</p>
                <Progress value={undefined} className="h-2" />
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={migrating}
          >
            <X className="mr-2" size={16} />
            Cancel
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="destructive"
              onClick={() => handleMigrate(false)}
              disabled={migrating}
            >
              Start Fresh
            </Button>
            <Button
              variant="default"
              onClick={() => handleMigrate(true)}
              disabled={migrating}
            >
              <CheckCircle className="mr-2" size={16} />
              {migrating ? 'Migrating...' : 'Keep & Migrate Calls'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
