import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { SchemaDefinition, InsightCategoryConfig, InsightOutputField } from '@/types/schema';
import { Plus, Trash, Edit, ChevronRight, ChevronDown, Sparkle, Loader2, Lightbulb, GripVertical, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface InsightCategoriesManagerProps {
  schema: SchemaDefinition;
  onSave: (categories: InsightCategoryConfig[]) => void;
}

interface InsightFormData {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  promptInstructions: string;
  outputFields: InsightOutputField[];
  enabled: boolean;
}

const INSIGHT_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#14b8a6', // teal
];

const INSIGHT_ICONS = [
  'ChartBar',
  'TrendUp',
  'TrendDown',
  'Warning',
  'CheckCircle',
  'XCircle',
  'Info',
  'Star',
  'Heart',
  'Shield',
  'Target',
  'Lightbulb',
  'Brain',
  'Gauge',
  'Clock',
  'Users',
  'CurrencyDollar',
  'Phone',
  'ChatCircle',
  'Percent',
];

const OUTPUT_FIELD_TYPES = [
  { value: 'string', label: 'Text (Short)' },
  { value: 'text', label: 'Text (Long)' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Yes/No' },
  { value: 'enum', label: 'Options List' },
  { value: 'tags', label: 'Tags (Multiple)' },
];

export function InsightCategoriesManager({ schema, onSave }: InsightCategoriesManagerProps) {
  const [categories, setCategories] = useState<InsightCategoryConfig[]>(schema.insightCategories || []);
  const [editingCategory, setEditingCategory] = useState<InsightFormData | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    setCategories(schema.insightCategories || []);
  }, [schema.insightCategories]);

  const generateId = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const handleAddCategory = () => {
    setEditingCategory({
      id: '',
      name: '',
      description: '',
      icon: 'Lightbulb',
      color: INSIGHT_COLORS[categories.length % INSIGHT_COLORS.length],
      promptInstructions: '',
      outputFields: [],
      enabled: true,
    });
    setIsAddingNew(true);
  };

  const handleEditCategory = (category: InsightCategoryConfig) => {
    setEditingCategory({
      id: category.id,
      name: category.name,
      description: category.description,
      icon: category.icon,
      color: category.color,
      promptInstructions: category.promptInstructions,
      outputFields: [...category.outputFields],
      enabled: category.enabled,
    });
    setIsAddingNew(false);
  };

  const handleToggleCategory = (categoryId: string) => {
    const updatedCategories = categories.map(cat =>
      cat.id === categoryId ? { ...cat, enabled: !cat.enabled } : cat
    );
    setCategories(updatedCategories);
  };

  const handleSaveCategory = () => {
    if (!editingCategory || !editingCategory.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    if (!editingCategory.promptInstructions.trim()) {
      toast.error('Prompt instructions are required');
      return;
    }

    if (editingCategory.outputFields.length === 0) {
      toast.error('At least one output field is required');
      return;
    }

    const categoryData: InsightCategoryConfig = {
      id: editingCategory.id || generateId(editingCategory.name),
      name: editingCategory.name.trim(),
      description: editingCategory.description.trim(),
      icon: editingCategory.icon,
      color: editingCategory.color,
      promptInstructions: editingCategory.promptInstructions.trim(),
      outputFields: editingCategory.outputFields,
      enabled: editingCategory.enabled,
    };

    if (isAddingNew) {
      // Check for duplicate ID
      if (categories.some(c => c.id === categoryData.id)) {
        categoryData.id = `${categoryData.id}-${Date.now()}`;
      }
      setCategories(prev => [...prev, categoryData]);
      toast.success('Insight category added');
    } else {
      setCategories(prev => prev.map(c => c.id === categoryData.id ? categoryData : c));
      toast.success('Insight category updated');
    }

    setEditingCategory(null);
    setIsAddingNew(false);
  };

  const handleDeleteCategory = (categoryId: string) => {
    setCategories(prev => prev.filter(c => c.id !== categoryId));
    toast.success('Insight category deleted');
  };

  const handleAddOutputField = () => {
    if (!editingCategory) return;
    
    const newField: InsightOutputField = {
      id: `field-${Date.now()}`,
      name: '',
      type: 'string',
      description: '',
    };
    
    setEditingCategory({
      ...editingCategory,
      outputFields: [...editingCategory.outputFields, newField],
    });
  };

  const handleUpdateOutputField = (index: number, updates: Partial<InsightOutputField>) => {
    if (!editingCategory) return;
    
    const updatedFields = [...editingCategory.outputFields];
    updatedFields[index] = { ...updatedFields[index], ...updates };
    
    // Update ID based on name if name changed
    if (updates.name && !updatedFields[index].id.startsWith('field-')) {
      updatedFields[index].id = generateId(updates.name);
    } else if (updates.name) {
      updatedFields[index].id = generateId(updates.name);
    }
    
    setEditingCategory({
      ...editingCategory,
      outputFields: updatedFields,
    });
  };

  const handleRemoveOutputField = (index: number) => {
    if (!editingCategory) return;
    
    setEditingCategory({
      ...editingCategory,
      outputFields: editingCategory.outputFields.filter((_, i) => i !== index),
    });
  };

  const handleGenerateWithAI = async () => {
    setGenerating(true);
    toast.info('🤖 Generating insight categories with AI...');

    try {
      const { LLMCaller } = await import('@/llmCaller');
      const { loadAzureConfigFromCookie } = await import('@/lib/azure-config-storage');
      const { BrowserConfigManager } = await import('@/services/browser-config-manager');

      const azureConfig = loadAzureConfigFromCookie();
      if (!azureConfig?.openAI?.endpoint || !azureConfig?.openAI?.deploymentName) {
        toast.error('Azure OpenAI not configured. Please configure in Settings.');
        setGenerating(false);
        return;
      }
      
      // Check for valid auth - either API key or Entra ID
      const hasValidAuth = azureConfig.openAI.authType === 'entraId' || azureConfig.openAI.apiKey;
      if (!hasValidAuth) {
        toast.error('Azure OpenAI authentication not configured.');
        setGenerating(false);
        return;
      }

      const configManager = new BrowserConfigManager({
        endpoint: azureConfig.openAI.endpoint,
        apiKey: azureConfig.openAI.apiKey,
        deploymentName: azureConfig.openAI.deploymentName,
        apiVersion: azureConfig.openAI.apiVersion || '2024-12-01-preview',
        authType: azureConfig.openAI.authType || 'apiKey',
        tenantId: azureConfig.openAI.tenantId,
        reasoningEffort: azureConfig.openAI.reasoningEffort || 'medium',
      });

      const llmCaller = new LLMCaller(configManager);

      const existingCategoriesContext = categories.length > 0
        ? `\n\n**⚠️ EXISTING CATEGORIES - DO NOT DUPLICATE OR RECREATE THESE:**\n${categories.map(c => `- "${c.name}" (id: ${c.id}): ${c.description}`).join('\n')}\n\n**IMPORTANT:** The categories listed above already exist. You MUST NOT generate any category that:
1. Has the same or similar name (e.g., if "Customer Satisfaction" exists, don't create "Satisfaction Analysis" or "Customer Experience")
2. Has the same id
3. Covers the same analytical purpose or topic
4. Would be redundant with existing analysis

Only generate NEW, DIFFERENT categories that complement the existing ones.`
        : '';

      const prompt = `You are a call center analytics expert. Based on the schema context below, generate AI insight categories that would provide valuable analysis for call evaluations.

**Business Context:**
${schema.businessContext || schema.name}

**Schema Fields:**
${schema.fields.slice(0, 15).map(f => `- ${f.displayName} (${f.semanticRole})`).join('\n')}

**Topic Categories:**
${(schema.topicTaxonomy || []).slice(0, 10).map(t => `- ${t.name}: ${t.description}`).join('\n') || 'None defined'}
${existingCategoriesContext}

**Requirements:**
Generate ${categories.length > 0 ? '2-4 NEW' : '4-6'} insight categories that provide meaningful analysis specific to this business context.${categories.length > 0 ? ' These must be DIFFERENT from the existing categories listed above.' : ''}

Each insight category should have:
1. **id**: Unique kebab-case identifier
2. **name**: Human-readable display name
3. **description**: Brief explanation of what this insight analyzes
4. **icon**: One of [ChartBar, TrendUp, Warning, CheckCircle, Star, Shield, Target, Lightbulb, Brain, Gauge, Clock, Users, CurrencyDollar, Phone]
5. **color**: Hex color code (use distinct colors)
6. **promptInstructions**: Detailed instructions for the AI to analyze the call transcript. Be specific about:
   - What to look for in the conversation
   - How to score or evaluate
   - What context to consider
   - Format expectations for outputs
7. **outputFields**: Array of 2-4 fields that capture the analysis results:
   - id: kebab-case field identifier
   - name: Display name
   - type: One of [string, number, boolean, enum, text, tags]
   - description: What this field represents
   - enumValues: (only for enum type) array of possible values
8. **enabled**: true

**Example Category:**
{
  "id": "customer-satisfaction",
  "name": "Customer Satisfaction",
  "description": "Analyzes customer satisfaction signals throughout the call",
  "icon": "Star",
  "color": "#f59e0b",
  "promptInstructions": "Analyze the call transcript for customer satisfaction indicators. Look for: 1) Tone and sentiment changes, 2) Explicit satisfaction/dissatisfaction statements, 3) Resolution of customer's issue, 4) Customer's final disposition. Score satisfaction 1-10 based on overall experience.",
  "outputFields": [
    { "id": "satisfaction-score", "name": "Satisfaction Score", "type": "number", "description": "Overall satisfaction 1-10" },
    { "id": "key-drivers", "name": "Key Drivers", "type": "tags", "description": "Factors influencing satisfaction" },
    { "id": "resolution-achieved", "name": "Resolution Achieved", "type": "boolean", "description": "Was the customer's issue resolved?" }
  ],
  "enabled": true
}

**Response Format:**
Return ONLY a valid JSON array of InsightCategoryConfig objects.`;

      const response = await llmCaller.callWithJsonValidation<InsightCategoryConfig[]>(
        [{ role: 'user', content: prompt }],
        {}
      );

      const generatedCategories = Array.isArray(response.parsed) ? response.parsed : [];
      
      if (generatedCategories.length === 0) {
        toast.error('No categories were generated. Please try again.');
        return;
      }

      // Ensure all categories have enabled: true and valid structure
      const validatedCategories = generatedCategories.map((cat, index) => ({
        ...cat,
        enabled: cat.enabled !== false,
        color: cat.color || INSIGHT_COLORS[index % INSIGHT_COLORS.length],
        icon: cat.icon || 'Lightbulb',
        outputFields: cat.outputFields || [],
      }));

      // Merge with existing, avoiding duplicates by ID and similar names
      const existingIds = new Set(categories.map(c => c.id.toLowerCase()));
      const existingNames = new Set(categories.map(c => c.name.toLowerCase()));
      
      // Helper to check if a name is too similar to existing ones
      const isSimilarName = (newName: string): boolean => {
        const normalizedNew = newName.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const existingName of categories.map(c => c.name)) {
          const normalizedExisting = existingName.toLowerCase().replace(/[^a-z0-9]/g, '');
          // Check for substring match or high overlap
          if (normalizedNew.includes(normalizedExisting) || 
              normalizedExisting.includes(normalizedNew) ||
              normalizedNew === normalizedExisting) {
            return true;
          }
          // Check for common words overlap (more than 50% shared words)
          const newWords = new Set(newName.toLowerCase().split(/\s+/));
          const existingWords = new Set(existingName.toLowerCase().split(/\s+/));
          const intersection = [...newWords].filter(w => existingWords.has(w) && w.length > 2);
          if (intersection.length >= Math.min(newWords.size, existingWords.size) * 0.5) {
            return true;
          }
        }
        return false;
      };
      
      const newCategories = validatedCategories.filter(c => 
        !existingIds.has(c.id.toLowerCase()) && 
        !existingNames.has(c.name.toLowerCase()) &&
        !isSimilarName(c.name)
      );
      
      if (newCategories.length === 0 && validatedCategories.length > 0) {
        toast.warning('All generated categories were duplicates of existing ones. Try regenerating for different categories.');
        return;
      }
      
      setCategories(prev => [...prev, ...newCategories]);
      toast.success(`✨ Generated ${newCategories.length} new insight categories!`);
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error(`AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveAll = () => {
    onSave(categories);
  };

  const toggleExpanded = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">AI Insight Categories</h3>
          <p className="text-sm text-muted-foreground">
            Define custom insight categories for AI analysis of calls
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleGenerateWithAI}
            disabled={generating}
          >
            {generating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkle className="mr-2 h-4 w-4" />
            )}
            Generate with AI
          </Button>
          <Button onClick={handleAddCategory}>
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        </div>
      </div>

      {/* Categories List */}
      <ScrollArea className="h-[400px] pr-4">
        {categories.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Lightbulb className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                No insight categories defined yet.
                <br />
                Add categories manually or generate them with AI.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {categories.map((category) => (
              <Collapsible
                key={category.id}
                open={expandedCategories.has(category.id)}
                onOpenChange={() => toggleExpanded(category.id)}
              >
                <Card className={`transition-all ${!category.enabled ? 'opacity-60' : ''}`}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {expandedCategories.has(category.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          <div>
                            <CardTitle className="text-base flex items-center gap-2">
                              {category.name}
                              {!category.enabled && (
                                <Badge variant="secondary" className="text-xs">Disabled</Badge>
                              )}
                            </CardTitle>
                            <CardDescription className="text-xs mt-0.5">
                              {category.description}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {category.outputFields.length} fields
                          </Badge>
                          <Switch
                            checked={category.enabled}
                            onCheckedChange={() => handleToggleCategory(category.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditCategory(category);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCategory(category.id);
                            }}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-4 space-y-4">
                      <div className="bg-muted/50 rounded-md p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Prompt Instructions</p>
                        <p className="text-sm whitespace-pre-wrap">{category.promptInstructions}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Output Fields</p>
                        <div className="flex flex-wrap gap-2">
                          {category.outputFields.map((field) => (
                            <Badge key={field.id} variant="secondary" className="text-xs">
                              {field.name} ({field.type})
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Save Button */}
      {categories.length > 0 && (
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSaveAll}>
            Save Insight Categories
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isAddingNew ? 'Add Insight Category' : 'Edit Insight Category'}
            </DialogTitle>
            <DialogDescription>
              Configure how AI should analyze and generate insights for this category
            </DialogDescription>
          </DialogHeader>

          {editingCategory && (
            <div className="space-y-4 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={editingCategory.name}
                    onChange={(e) => setEditingCategory({
                      ...editingCategory,
                      name: e.target.value,
                      id: isAddingNew ? generateId(e.target.value) : editingCategory.id,
                    })}
                    placeholder="e.g., Customer Satisfaction"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="icon">Icon</Label>
                  <Select
                    value={editingCategory.icon}
                    onValueChange={(value) => setEditingCategory({ ...editingCategory, icon: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select icon" />
                    </SelectTrigger>
                    <SelectContent>
                      {INSIGHT_ICONS.map((icon) => (
                        <SelectItem key={icon} value={icon}>
                          {icon}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={editingCategory.description}
                  onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                  placeholder="Brief description of what this insight analyzes"
                />
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2 flex-wrap">
                  {INSIGHT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        editingCategory.color === color ? 'border-foreground scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setEditingCategory({ ...editingCategory, color })}
                    />
                  ))}
                </div>
              </div>

              {/* Prompt Instructions */}
              <div className="space-y-2">
                <Label htmlFor="prompt">Prompt Instructions</Label>
                <Textarea
                  id="prompt"
                  value={editingCategory.promptInstructions}
                  onChange={(e) => setEditingCategory({ ...editingCategory, promptInstructions: e.target.value })}
                  placeholder="Detailed instructions for the AI on how to analyze the call transcript for this insight category..."
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">
                  Be specific about what the AI should look for, how to score, and what format to use.
                </p>
              </div>

              {/* Output Fields */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Output Fields</Label>
                  <Button variant="outline" size="sm" onClick={handleAddOutputField}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Field
                  </Button>
                </div>

                {editingCategory.outputFields.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Add fields to define what data this insight should output
                  </p>
                ) : (
                  <div className="space-y-3">
                    {editingCategory.outputFields.map((field, index) => (
                      <Card key={index} className="p-3">
                        <div className="space-y-3">
                          <div className="flex items-start gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground mt-2.5" />
                            <div className="flex-1 grid grid-cols-3 gap-2">
                              <Input
                                value={field.name}
                                onChange={(e) => handleUpdateOutputField(index, { name: e.target.value })}
                                placeholder="Field name"
                              />
                              <Select
                                value={field.type}
                                onValueChange={(value) => handleUpdateOutputField(index, { 
                                  type: value as InsightOutputField['type'],
                                  enumValues: value === 'enum' ? field.enumValues || [] : undefined
                                })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {OUTPUT_FIELD_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input
                                value={field.description}
                                onChange={(e) => handleUpdateOutputField(index, { description: e.target.value })}
                                placeholder="Description"
                              />
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleRemoveOutputField(index)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                          {field.type === 'enum' && (
                            <div className="ml-6">
                              <Input
                                value={field.enumValues?.join(', ') || ''}
                                onChange={(e) => handleUpdateOutputField(index, { 
                                  enumValues: e.target.value.split(',').map(v => v.trim()).filter(Boolean)
                                })}
                                placeholder="Comma-separated options (e.g., High, Medium, Low)"
                              />
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Enabled Toggle */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <Label>Enabled</Label>
                  <p className="text-xs text-muted-foreground">
                    Disabled categories won't be evaluated
                  </p>
                </div>
                <Switch
                  checked={editingCategory.enabled}
                  onCheckedChange={(checked) => setEditingCategory({ ...editingCategory, enabled: checked })}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCategory(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCategory}>
              {isAddingNew ? 'Add Category' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
