import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Gear } from '@phosphor-icons/react';
import { SchemaDefinition } from '@/types/schema';
import { getAllSchemas, setActiveSchema } from '@/services/schema-manager';
import { SchemaManagerDialog } from '@/components/SchemaManagerDialog';

interface SchemaSelectorProps {
  activeSchema: SchemaDefinition | null;
  onSchemaChange: (schema: SchemaDefinition) => void;
  onManageSchemas?: () => void;
  onCreateSchema?: () => void;
}

/**
 * SchemaSelector Component
 * 
 * Toolbar dropdown for quick schema switching with version badge display.
 * Shows schema name, version, and provides quick access to schema management.
 */
export function SchemaSelector({
  activeSchema,
  onSchemaChange,
  onManageSchemas,
  onCreateSchema,
}: SchemaSelectorProps) {
  const [schemas, setSchemas] = useState<SchemaDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [managerOpen, setManagerOpen] = useState(false);

  useEffect(() => {
    loadSchemas();
  }, []);

  const loadSchemas = () => {
    setLoading(true);
    try {
      const allSchemas = getAllSchemas();
      setSchemas(allSchemas);
    } catch (error) {
      console.error('Failed to load schemas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSchemaChange = (schemaId: string) => {
    const selected = schemas.find(s => s.id === schemaId);
    if (selected) {
      setActiveSchema(selected.id);
      onSchemaChange(selected);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-9 w-48 animate-pulse bg-muted rounded-md" />
      </div>
    );
  }

  if (schemas.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">No schemas available</span>
        {onCreateSchema && (
          <Button
            variant="default"
            size="sm"
            onClick={onCreateSchema}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Schema
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        value={activeSchema?.id || ''}
        onValueChange={handleSchemaChange}
      >
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder="Select schema...">
            {activeSchema && (
              <div className="flex items-center gap-2">
                <span className="font-medium">{activeSchema.name}</span>
                <Badge variant="secondary" className="text-xs">
                  v{activeSchema.version}
                </Badge>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {schemas.map((schema) => (
            <SelectItem key={schema.id} value={schema.id}>
              <div className="flex items-center justify-between w-full gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{schema.name}</span>
                  {schema.businessContext && (
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {schema.businessContext}
                    </span>
                  )}
                </div>
                <Badge variant="outline" className="text-xs ml-auto">
                  v{schema.version}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="icon"
        onClick={() => {
          setManagerOpen(true);
          onManageSchemas?.();
        }}
        title="Manage schemas"
      >
        <Gear className="h-4 w-4" />
      </Button>

      {onCreateSchema && (
        <Button
          variant="outline"
          size="icon"
          onClick={onCreateSchema}
          title="Create new schema"
        >
          <Plus className="h-4 w-4" />
        </Button>
      )}

      <SchemaManagerDialog
        open={managerOpen}
        onOpenChange={(open) => {
          setManagerOpen(open);
          if (!open) {
            // Reload schemas after manager closes
            loadSchemas();
          }
        }}
      />
    </div>
  );
}
