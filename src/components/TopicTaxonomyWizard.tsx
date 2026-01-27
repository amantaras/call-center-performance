import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { SchemaDefinition, TopicDefinition } from '@/types/schema';
import { Plus, Trash, Edit, ChevronRight, ChevronDown, Sparkle, Loader2, FolderTree } from 'lucide-react';
import { toast } from 'sonner';

interface TopicTaxonomyWizardProps {
  schema: SchemaDefinition;
  onSave: (topics: TopicDefinition[]) => void;
}

interface TopicFormData {
  id: string;
  name: string;
  description: string;
  keywords: string;
  parentId?: string;
  color?: string;
}

const TOPIC_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
];

export function TopicTaxonomyWizard({ schema, onSave }: TopicTaxonomyWizardProps) {
  const [topics, setTopics] = useState<TopicDefinition[]>(schema.topicTaxonomy || []);
  const [editingTopic, setEditingTopic] = useState<TopicFormData | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [parentIdForNew, setParentIdForNew] = useState<string | undefined>(undefined);
  const [generating, setGenerating] = useState(false);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  useEffect(() => {
    setTopics(schema.topicTaxonomy || []);
  }, [schema.topicTaxonomy]);

  const generateId = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const handleAddTopic = (parentId?: string) => {
    setParentIdForNew(parentId);
    setEditingTopic({
      id: '',
      name: '',
      description: '',
      keywords: '',
      parentId,
      color: TOPIC_COLORS[topics.length % TOPIC_COLORS.length],
    });
    setIsAddingNew(true);
  };

  const handleEditTopic = (topic: TopicDefinition) => {
    setEditingTopic({
      id: topic.id,
      name: topic.name,
      description: topic.description,
      keywords: topic.keywords?.join(', ') || '',
      parentId: topic.parentId,
      color: topic.color,
    });
    setIsAddingNew(false);
  };

  const handleSaveTopic = () => {
    if (!editingTopic || !editingTopic.name.trim()) {
      toast.error('Topic name is required');
      return;
    }

    const topicData: TopicDefinition = {
      id: editingTopic.id || generateId(editingTopic.name),
      name: editingTopic.name.trim(),
      description: editingTopic.description.trim(),
      keywords: editingTopic.keywords
        ? editingTopic.keywords.split(',').map(k => k.trim()).filter(Boolean)
        : undefined,
      parentId: editingTopic.parentId,
      color: editingTopic.color,
    };

    if (isAddingNew) {
      // Check for duplicate ID
      const flatTopics = flattenTopics(topics);
      if (flatTopics.some(t => t.id === topicData.id)) {
        topicData.id = `${topicData.id}-${Date.now()}`;
      }
      setTopics(prev => addTopicToTree(prev, topicData));
      toast.success('Topic added');
    } else {
      setTopics(prev => updateTopicInTree(prev, topicData));
      toast.success('Topic updated');
    }

    setEditingTopic(null);
    setIsAddingNew(false);
    setParentIdForNew(undefined);
  };

  const handleDeleteTopic = (topicId: string) => {
    setTopics(prev => removeTopicFromTree(prev, topicId));
    toast.success('Topic deleted');
  };

  const handleGenerateWithAI = async () => {
    setGenerating(true);
    toast.info('🤖 Generating topic suggestions with AI...');

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

      const existingTopicsContext = topics.length > 0
        ? `\n\n**Existing Topics (DO NOT DUPLICATE):**\n${topics.map(t => `- ${t.name}: ${t.description}`).join('\n')}`
        : '';

      const prompt = `You are a call center analytics expert. Based on the business context below, suggest a hierarchical taxonomy of call topics/categories that would be useful for classifying customer calls.

**Business Context:**
${schema.businessContext || schema.name}

**Schema Fields (for context):**
${schema.fields.slice(0, 10).map(f => `- ${f.displayName} (${f.semanticRole})`).join('\n')}
${existingTopicsContext}

**Requirements:**
1. Generate 8-12 top-level topics that cover the main call categories
2. For each major topic, suggest 2-4 subtopics (child topics)
3. Each topic should have:
   - id: lowercase-kebab-case identifier
   - name: Human-readable name (e.g., "Billing Issues")
   - description: Brief description to help classify calls
   - keywords: Array of 3-5 keywords that indicate this topic
   - parentId: ID of parent topic (null for top-level)
   - color: Hex color code for visualization

4. Topics should be relevant to the business context
5. Include both positive (e.g., "Service Compliment") and negative (e.g., "Complaint") topics
6. Consider common call center categories like: account management, billing, technical support, complaints, general inquiries, etc.

**Response Format:**
Return ONLY a valid JSON array of TopicDefinition objects. Include both parent topics (parentId: null) and child topics (parentId: "parent-id").

Example:
[
  { "id": "billing", "name": "Billing Issues", "description": "Calls related to billing, payments, and charges", "keywords": ["bill", "payment", "charge", "invoice"], "parentId": null, "color": "#3b82f6" },
  { "id": "billing-dispute", "name": "Billing Dispute", "description": "Customer disputes a charge on their bill", "keywords": ["dispute", "incorrect", "wrong charge"], "parentId": "billing", "color": "#60a5fa" }
]`;

      const response = await llmCaller.callWithJsonValidation<TopicDefinition[]>(
        [{ role: 'user', content: prompt }],
        {}
      );

      const suggestedTopics = Array.isArray(response.parsed) ? response.parsed : [];
      
      if (suggestedTopics.length === 0) {
        toast.error('No topics were generated. Please try again.');
        return;
      }

      // Build hierarchical structure
      const hierarchicalTopics = buildHierarchy(suggestedTopics);
      
      // Merge with existing topics
      const mergedTopics = [...topics, ...hierarchicalTopics.filter(
        newTopic => !topics.some(existing => existing.id === newTopic.id)
      )];

      setTopics(mergedTopics);
      toast.success(`✨ Generated ${suggestedTopics.length} topic suggestions!`);

    } catch (error) {
      console.error('AI generation error:', error);
      toast.error(`AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveAll = () => {
    onSave(topics);
    toast.success(`Saved ${flattenTopics(topics).length} topics to schema`);
  };

  const toggleExpanded = (topicId: string) => {
    setExpandedTopics(prev => {
      const next = new Set(prev);
      if (next.has(topicId)) {
        next.delete(topicId);
      } else {
        next.add(topicId);
      }
      return next;
    });
  };

  const renderTopicTree = (topicList: TopicDefinition[], level = 0) => {
    return topicList.map(topic => {
      const hasChildren = topic.children && topic.children.length > 0;
      const isExpanded = expandedTopics.has(topic.id);

      return (
        <div key={topic.id} className={`${level > 0 ? 'ml-6 border-l pl-4' : ''}`}>
          <Collapsible open={isExpanded} onOpenChange={() => hasChildren && toggleExpanded(topic.id)}>
            <div className="flex items-center gap-2 py-2 group">
              {hasChildren ? (
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </Button>
                </CollapsibleTrigger>
              ) : (
                <div className="w-6" />
              )}
              
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: topic.color || '#6b7280' }}
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{topic.name}</span>
                  {topic.keywords && topic.keywords.length > 0 && (
                    <div className="flex gap-1">
                      {topic.keywords.slice(0, 2).map(kw => (
                        <Badge key={kw} variant="secondary" className="text-xs">
                          {kw}
                        </Badge>
                      ))}
                      {topic.keywords.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{topic.keywords.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{topic.description}</p>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => handleAddTopic(topic.id)}
                  title="Add subtopic"
                >
                  <Plus size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => handleEditTopic(topic)}
                  title="Edit topic"
                >
                  <Edit size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  onClick={() => handleDeleteTopic(topic.id)}
                  title="Delete topic"
                >
                  <Trash size={14} />
                </Button>
              </div>
            </div>

            {hasChildren && (
              <CollapsibleContent>
                {renderTopicTree(topic.children!, level + 1)}
              </CollapsibleContent>
            )}
          </Collapsible>
        </div>
      );
    });
  };

  const flatTopics = flattenTopics(topics);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FolderTree size={20} />
            Topic Taxonomy
          </h3>
          <p className="text-sm text-muted-foreground">
            Define topics to classify calls. The AI will use this taxonomy during evaluation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateWithAI}
            disabled={generating}
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkle className="mr-2 h-4 w-4" />
                Generate with AI
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleAddTopic()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Topic
          </Button>
        </div>
      </div>

      {topics.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="space-y-3">
            <FolderTree className="mx-auto h-12 w-12 text-muted-foreground" />
            <div>
              <h4 className="font-medium">No topics defined</h4>
              <p className="text-sm text-muted-foreground">
                Add topics manually or use AI to generate suggestions based on your business context.
              </p>
            </div>
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={() => handleAddTopic()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Manually
              </Button>
              <Button onClick={handleGenerateWithAI} disabled={generating}>
                <Sparkle className="mr-2 h-4 w-4" />
                Generate with AI
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Topics ({flatTopics.length})</CardTitle>
                <Badge variant="secondary">
                  {topics.length} root topics
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[350px] pr-4">
                {renderTopicTree(topics)}
              </ScrollArea>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveAll}>
              Save Topics to Schema
            </Button>
          </div>
        </>
      )}

      {/* Edit/Add Topic Dialog */}
      <Dialog open={!!editingTopic} onOpenChange={() => setEditingTopic(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isAddingNew ? 'Add Topic' : 'Edit Topic'}</DialogTitle>
            <DialogDescription>
              {isAddingNew
                ? parentIdForNew
                  ? 'Add a subtopic under the selected parent topic.'
                  : 'Add a new top-level topic to your taxonomy.'
                : 'Update the topic details.'}
            </DialogDescription>
          </DialogHeader>

          {editingTopic && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="topic-name">Name *</Label>
                <Input
                  id="topic-name"
                  value={editingTopic.name}
                  onChange={e => setEditingTopic({ ...editingTopic, name: e.target.value })}
                  placeholder="e.g., Billing Issues"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="topic-description">Description</Label>
                <Textarea
                  id="topic-description"
                  value={editingTopic.description}
                  onChange={e => setEditingTopic({ ...editingTopic, description: e.target.value })}
                  placeholder="Brief description to help the AI classify calls into this topic"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="topic-keywords">Keywords (comma-separated)</Label>
                <Input
                  id="topic-keywords"
                  value={editingTopic.keywords}
                  onChange={e => setEditingTopic({ ...editingTopic, keywords: e.target.value })}
                  placeholder="e.g., bill, payment, charge, invoice"
                />
                <p className="text-xs text-muted-foreground">
                  Keywords help the AI identify this topic in transcripts
                </p>
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2">
                  {TOPIC_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        editingTopic.color === color ? 'border-foreground scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setEditingTopic({ ...editingTopic, color })}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTopic(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTopic}>
              {isAddingNew ? 'Add Topic' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper functions

function flattenTopics(topics: TopicDefinition[]): TopicDefinition[] {
  const result: TopicDefinition[] = [];
  const traverse = (list: TopicDefinition[]) => {
    for (const topic of list) {
      result.push(topic);
      if (topic.children) {
        traverse(topic.children);
      }
    }
  };
  traverse(topics);
  return result;
}

function buildHierarchy(flatTopics: TopicDefinition[]): TopicDefinition[] {
  const topicsMap = new Map<string, TopicDefinition>();
  const roots: TopicDefinition[] = [];

  // First pass: create map of all topics
  for (const topic of flatTopics) {
    topicsMap.set(topic.id, { ...topic, children: [] });
  }

  // Second pass: build hierarchy
  for (const topic of flatTopics) {
    const current = topicsMap.get(topic.id)!;
    if (topic.parentId && topicsMap.has(topic.parentId)) {
      const parent = topicsMap.get(topic.parentId)!;
      if (!parent.children) parent.children = [];
      parent.children.push(current);
    } else {
      roots.push(current);
    }
  }

  return roots;
}

function addTopicToTree(topics: TopicDefinition[], newTopic: TopicDefinition): TopicDefinition[] {
  if (!newTopic.parentId) {
    return [...topics, { ...newTopic, children: [] }];
  }

  return topics.map(topic => {
    if (topic.id === newTopic.parentId) {
      return {
        ...topic,
        children: [...(topic.children || []), { ...newTopic, children: [] }],
      };
    }
    if (topic.children) {
      return {
        ...topic,
        children: addTopicToTree(topic.children, newTopic),
      };
    }
    return topic;
  });
}

function updateTopicInTree(topics: TopicDefinition[], updatedTopic: TopicDefinition): TopicDefinition[] {
  return topics.map(topic => {
    if (topic.id === updatedTopic.id) {
      return { ...updatedTopic, children: topic.children };
    }
    if (topic.children) {
      return {
        ...topic,
        children: updateTopicInTree(topic.children, updatedTopic),
      };
    }
    return topic;
  });
}

function removeTopicFromTree(topics: TopicDefinition[], topicId: string): TopicDefinition[] {
  return topics
    .filter(topic => topic.id !== topicId)
    .map(topic => {
      if (topic.children) {
        return {
          ...topic,
          children: removeTopicFromTree(topic.children, topicId),
        };
      }
      return topic;
    });
}
