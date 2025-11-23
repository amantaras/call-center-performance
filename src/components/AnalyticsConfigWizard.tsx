import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChartBar, Plus, Trash, Check, Warning } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { SchemaDefinition, AnalyticsView } from '@/types/schema';

interface AnalyticsConfigWizardProps {
  activeSchema: SchemaDefinition | null;
  onViewsSaved?: (views: AnalyticsView[]) => void;
  trigger?: React.ReactNode;
}

const CHART_TYPES = [
  { value: 'bar', label: 'Bar Chart', description: 'Compare values across categories' },
  { value: 'line', label: 'Line Chart', description: 'Show trends over time' },
  { value: 'pie', label: 'Pie Chart', description: 'Show proportions of a whole' },
  { value: 'scatter', label: 'Scatter Plot', description: 'Show relationship between two metrics' },
  { value: 'trend', label: 'Trend Analysis', description: 'Analyze changes over time' },
] as const;

const AGGREGATIONS = [
  { value: 'count', label: 'Count', description: 'Count number of items' },
  { value: 'sum', label: 'Sum', description: 'Sum of values' },
  { value: 'avg', label: 'Average', description: 'Average of values' },
  { value: 'min', label: 'Minimum', description: 'Minimum value' },
  { value: 'max', label: 'Maximum', description: 'Maximum value' },
] as const;

export function AnalyticsConfigWizard({
  activeSchema,
  onViewsSaved,
  trigger,
}: AnalyticsConfigWizardProps) {
  const [open, setOpen] = useState(false);
  const [views, setViews] = useState<AnalyticsView[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [currentView, setCurrentView] = useState<Partial<AnalyticsView>>({
    name: '',
    description: '',
    chartType: 'bar',
    aggregation: 'count',
    enabled: true,
  });

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when closing
      setViews([]);
      setEditingIndex(null);
      setCurrentView({
        name: '',
        description: '',
        chartType: 'bar',
        aggregation: 'count',
        enabled: true,
      });
    } else {
      // Load existing views from schema when opening
      loadExistingViews();
    }
    setOpen(newOpen);
  };

  const loadExistingViews = () => {
    if (!activeSchema) return;

    // Try to load analytics views from localStorage
    const storageKey = `analytics-views-${activeSchema.id}`;
    const savedViews = localStorage.getItem(storageKey);

    if (savedViews) {
      try {
        const parsed: AnalyticsView[] = JSON.parse(savedViews);
        setViews(parsed);
      } catch (error) {
        console.error('Failed to load analytics views:', error);
      }
    }
  };

  const handleAddView = () => {
    if (!currentView.name?.trim()) {
      toast.error('Please provide a view name');
      return;
    }

    if (!currentView.chartType) {
      toast.error('Please select a chart type');
      return;
    }

    const newView: AnalyticsView = {
      id: `view-${Date.now()}`,
      name: currentView.name,
      description: currentView.description || '',
      chartType: currentView.chartType as any,
      dimensionField: currentView.dimensionField,
      measureField: currentView.measureField,
      aggregation: currentView.aggregation as any,
      enabled: currentView.enabled ?? true,
    };

    if (editingIndex !== null) {
      // Update existing view
      const updatedViews = [...views];
      updatedViews[editingIndex] = newView;
      setViews(updatedViews);
      setEditingIndex(null);
      toast.success('Analytics view updated');
    } else {
      // Add new view
      setViews([...views, newView]);
      toast.success('Analytics view added');
    }

    // Reset form
    setCurrentView({
      name: '',
      description: '',
      chartType: 'bar',
      aggregation: 'count',
      enabled: true,
    });
  };

  const handleEditView = (index: number) => {
    const view = views[index];
    setCurrentView(view);
    setEditingIndex(index);
  };

  const handleDeleteView = (index: number) => {
    const updatedViews = views.filter((_, i) => i !== index);
    setViews(updatedViews);
    toast.success('Analytics view deleted');
  };

  const handleCancelEdit = () => {
    setCurrentView({
      name: '',
      description: '',
      chartType: 'bar',
      aggregation: 'count',
      enabled: true,
    });
    setEditingIndex(null);
  };

  const handleSave = () => {
    if (!activeSchema) {
      toast.error('No active schema selected');
      return;
    }

    // Save to schema-specific localStorage
    const storageKey = `analytics-views-${activeSchema.id}`;
    localStorage.setItem(storageKey, JSON.stringify(views));

    // Notify parent
    onViewsSaved?.(views);

    toast.success(`Saved ${views.length} analytics view(s) to ${activeSchema.name}`);
    handleOpenChange(false);
  };

  // Get available fields from schema
  const dimensionFields = activeSchema?.fields.filter(
    (f) => f.semanticRole === 'dimension' || f.semanticRole === 'classification'
  ) || [];

  const metricFields = activeSchema?.fields.filter(
    (f) => f.semanticRole === 'metric' || f.type === 'number'
  ) || [];

  const allFields = activeSchema?.fields || [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <ChartBar className="mr-2" size={18} />
            Configure Analytics
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChartBar size={24} className="text-primary" />
            Analytics Views Configuration
          </DialogTitle>
          <DialogDescription>
            Create custom analytics views for your schema. Define dimensions, measures, and chart types.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex gap-6">
          {/* Left: View List */}
          <div className="w-1/3 border-r pr-6 overflow-y-auto">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Analytics Views ({views.length})</h3>
              </div>

              {!activeSchema ? (
                <Card className="border-destructive">
                  <CardContent className="pt-6">
                    <p className="text-sm text-destructive flex items-start gap-2">
                      <Warning size={18} className="flex-shrink-0 mt-0.5" />
                      No schema is currently active. Please create or select a schema first.
                    </p>
                  </CardContent>
                </Card>
              ) : views.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <ChartBar size={48} className="mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground">
                      No analytics views configured yet. Create your first view using the form.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                views.map((view, index) => (
                  <Card
                    key={view.id}
                    className={`cursor-pointer transition-colors ${
                      editingIndex === index
                        ? 'border-primary bg-accent/50'
                        : 'hover:bg-accent/30'
                    }`}
                    onClick={() => handleEditView(index)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="text-xs">
                              {view.chartType}
                            </Badge>
                            {!view.enabled && (
                              <Badge variant="outline" className="text-xs">
                                Disabled
                              </Badge>
                            )}
                          </div>
                          <p className="font-medium text-sm break-words">{view.name}</p>
                          {view.description && (
                            <p className="text-xs text-muted-foreground mt-1 break-words">
                              {view.description}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteView(index);
                          }}
                        >
                          <Trash size={16} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Right: View Editor */}
          <div className="flex-1 overflow-y-auto">
            {activeSchema ? (
              <div className="space-y-4">
                <h3 className="font-medium">
                  {editingIndex !== null ? 'Edit Analytics View' : 'New Analytics View'}
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="view-name">
                    View Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="view-name"
                    value={currentView.name || ''}
                    onChange={(e) => setCurrentView({ ...currentView, name: e.target.value })}
                    placeholder="e.g., Performance by Product"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="view-description">Description</Label>
                  <Textarea
                    id="view-description"
                    value={currentView.description || ''}
                    onChange={(e) => setCurrentView({ ...currentView, description: e.target.value })}
                    placeholder="Brief description of what this view shows"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chart-type">
                    Chart Type <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={currentView.chartType || 'bar'}
                    onValueChange={(value) =>
                      setCurrentView({ ...currentView, chartType: value as any })
                    }
                  >
                    <SelectTrigger id="chart-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHART_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div>
                            <div className="font-medium">{type.label}</div>
                            <div className="text-xs text-muted-foreground">{type.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dimension-field">Dimension (Group By)</Label>
                    <Select
                      value={currentView.dimensionField || ''}
                      onValueChange={(value) =>
                        setCurrentView({ ...currentView, dimensionField: value || undefined })
                      }
                    >
                      <SelectTrigger id="dimension-field">
                        <SelectValue placeholder="Select dimension..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {dimensionFields.map((field) => (
                          <SelectItem key={field.id} value={field.id}>
                            {field.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {dimensionFields.length > 0
                        ? `${dimensionFields.length} dimension/classification fields available`
                        : 'No dimension fields in schema'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="measure-field">Measure (Value Field)</Label>
                    <Select
                      value={currentView.measureField || ''}
                      onValueChange={(value) =>
                        setCurrentView({ ...currentView, measureField: value || undefined })
                      }
                    >
                      <SelectTrigger id="measure-field">
                        <SelectValue placeholder="Select measure..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None (Count only)</SelectItem>
                        {metricFields.map((field) => (
                          <SelectItem key={field.id} value={field.id}>
                            {field.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {metricFields.length > 0
                        ? `${metricFields.length} metric fields available`
                        : 'No metric fields in schema'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aggregation">Aggregation Method</Label>
                  <Select
                    value={currentView.aggregation || 'count'}
                    onValueChange={(value) =>
                      setCurrentView({ ...currentView, aggregation: value as any })
                    }
                  >
                    <SelectTrigger id="aggregation">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AGGREGATIONS.map((agg) => (
                        <SelectItem key={agg.value} value={agg.value}>
                          <div>
                            <div className="font-medium">{agg.label}</div>
                            <div className="text-xs text-muted-foreground">{agg.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="view-enabled"
                    checked={currentView.enabled ?? true}
                    onChange={(e) =>
                      setCurrentView({ ...currentView, enabled: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="view-enabled" className="cursor-pointer">
                    Enable this analytics view
                  </Label>
                </div>

                <div className="flex gap-2 pt-4">
                  {editingIndex !== null && (
                    <Button variant="outline" onClick={handleCancelEdit}>
                      Cancel Edit
                    </Button>
                  )}
                  <Button onClick={handleAddView}>
                    {editingIndex !== null ? (
                      <>
                        <Check className="mr-2" size={16} />
                        Update View
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2" size={16} />
                        Add View
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Warning size={48} className="mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Please select an active schema to configure analytics views
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div>
            <span className="text-sm text-muted-foreground">
              {views.length} view(s) configured
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!activeSchema}>
              <Check className="mr-2" size={16} />
              Save Configuration
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
