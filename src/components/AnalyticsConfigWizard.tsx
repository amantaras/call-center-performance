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
  const [generating, setGenerating] = useState(false);
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

  const handleGenerateWithAI = async () => {
    if (!activeSchema) {
      toast.error('No active schema selected');
      return;
    }

    setGenerating(true);
    toast.info('🤖 Generating analytics views with AI...');

    try {
      const { LLMCaller } = await import('@/llmCaller');
      const { loadAzureConfigFromCookie } = await import('@/lib/azure-config-storage');
      
      const azureConfig = loadAzureConfigFromCookie();
      if (!azureConfig?.openAI?.endpoint || !azureConfig?.openAI?.apiKey || !azureConfig?.openAI?.deploymentName) {
        toast.error('Azure OpenAI not configured. Please configure in Settings.');
        setGenerating(false);
        return;
      }

      // Create a ConfigManager wrapper for the config
      const configManager = {
        async getConfig() {
          return {
            endpoint: azureConfig.openAI.endpoint,
            apiKey: azureConfig.openAI.apiKey,
            deploymentName: azureConfig.openAI.deploymentName,
            apiVersion: azureConfig.openAI.apiVersion || '2024-12-01-preview',
            authType: 'apiKey' as const,
            reasoningEffort: azureConfig.openAI.reasoningEffort || 'medium'
          };
        },
        async getEntraIdToken() {
          return null;
        },
        getMaxRetries() {
          return 3;
        }
      };

      const llmCaller = new LLMCaller(configManager);

      // Build context from schema
      const dimensionFields = activeSchema.fields.filter(f => 
        f.dataType === 'dimension' || f.dataType === 'classification'
      );
      const measureFields = activeSchema.fields.filter(f => 
        f.dataType === 'metric' || f.dataType === 'measure'
      );

      const prompt = `You are an expert data analyst creating analytics views for a ${activeSchema.businessContext || 'business'} application.

**Schema Context:**
- Business Context: ${activeSchema.businessContext || 'Not specified'}
- Schema Name: ${activeSchema.name}

**Available Dimension/Classification Fields:**
${dimensionFields.map(f => `- ${f.displayName} (${f.fieldName}): ${f.description || 'No description'}`).join('\n')}

**Available Measure/Metric Fields:**
${measureFields.map(f => `- ${f.displayName} (${f.fieldName}): ${f.description || 'No description'}`).join('\n')}

**Task:**
Generate 5-8 meaningful, business-relevant analytics views that would provide valuable insights for this use case. Each view should combine dimensions and measures appropriately.

For each view, specify:
1. **name**: Clear, business-friendly name (e.g., "Agent Performance by Product")
2. **description**: Brief explanation of what insights this view provides
3. **chartType**: One of: "bar", "line", "pie", "area", "scatter"
4. **dimensionField**: The field ID to use as dimension (x-axis or category) - must be from the dimension fields list above, or omit if count-only
5. **measureField**: The field ID to use as measure (y-axis or value) - must be from the measure fields list above, or omit for count
6. **aggregation**: One of: "count", "sum", "average", "min", "max" (use "count" if no measureField)

**Important Guidelines:**
- Choose chart types that match the data: bar for categories, line for trends, pie for proportions
- Create a mix of different view types for comprehensive analysis
- Use meaningful combinations that answer business questions
- If using field IDs, use the exact fieldName values provided above
- For count-only views (no measure), omit measureField and use aggregation: "count"

Return ONLY a valid JSON array of analytics views.`;

      const response = await llmCaller.callWithJsonValidation<any>(
        [{ role: 'user', content: prompt }],
        { temperature: 0.7, max_tokens: 3000 }
      );

      // Handle both array and object responses
      const viewsArray = Array.isArray(response.parsed) ? response.parsed : (response.parsed.views || []);
      
      const generatedViews: AnalyticsView[] = viewsArray.map((v: any, index: number) => ({
        id: `ai-view-${Date.now()}-${index}`,
        name: v.name,
        description: v.description || '',
        chartType: v.chartType || 'bar',
        dimensionField: v.dimensionField || undefined,
        measureField: v.measureField || undefined,
        aggregation: v.aggregation || 'count',
        enabled: true,
      }));

      setViews(generatedViews);
      toast.success(`✨ Generated ${generatedViews.length} analytics views with AI!`);
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error(`AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGenerating(false);
    }
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
      <DialogContent className="!max-w-[90vw] w-[90vw] max-h-[90vh] overflow-hidden flex flex-col">
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
                {activeSchema && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleGenerateWithAI}
                    disabled={generating}
                    className="border-purple-500 text-purple-600 hover:bg-purple-50"
                  >
                    {generating ? (
                      <>⏳ Generating...</>
                    ) : (
                      <>✨ Generate with AI</>
                    )}
                  </Button>
                )}
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
                  <CardContent className="pt-6 text-center space-y-3">
                    <ChartBar size={48} className="mx-auto text-muted-foreground opacity-50" />
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        No analytics views configured yet.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Click "Generate with AI" to create views automatically based on your schema, or create them manually using the form.
                      </p>
                    </div>
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
                        <SelectItem value="none">None</SelectItem>
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
                        <SelectItem value="none">None (Count only)</SelectItem>
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
