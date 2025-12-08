/**
 * AI Schema Enhancer Component
 * Uses AI to suggest schema improvements based on user's business context
 */

import React, { useState } from 'react';
import { SchemaDefinition, FieldDefinition, SchemaEvaluationRule, TopicDefinition, RelationshipDefinition } from '@/types/schema';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Sparkles, 
  ChevronDown, 
  Check,
  Plus,
  Edit2,
  FileText,
  Scale,
  Tag,
  Link2,
  Lightbulb,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { LLMCaller, ChatMessage } from '@/llmCaller';
import { AzureOpenAIConfig, ConfigManager } from '@/configManager';
import { loadAzureConfigFromCookie } from '@/lib/azure-config-storage';

// Local config manager implementation for browser usage
class BrowserConfigManager implements ConfigManager {
  constructor(private config: AzureOpenAIConfig) {}
  
  async getConfig(): Promise<AzureOpenAIConfig | null> {
    return this.config;
  }
  
  async getEntraIdToken(): Promise<string | null> {
    return null;
  }
  
  getMaxRetries(): number {
    return 3;
  }
}

interface EnhancementSuggestion {
  suggestedFields: Array<FieldDefinition & { reasoning: string }>;
  suggestedRules: Array<Omit<SchemaEvaluationRule, 'id'> & { reasoning: string }>;
  suggestedTopics: Array<TopicDefinition & { reasoning: string }>;
  suggestedRelationships: Array<RelationshipDefinition & { reasoning: string }>;
  summary: string;
}

interface AISchemaEnhancerProps {
  schema: SchemaDefinition;
  existingRules: Omit<SchemaEvaluationRule, 'id'>[];
  onApplySuggestions: (
    fields: FieldDefinition[],
    rules: Omit<SchemaEvaluationRule, 'id'>[],
    topics: TopicDefinition[],
    relationships: RelationshipDefinition[]
  ) => void;
  onSkip: () => void;
}

// Example prompts to help users get started
const EXAMPLE_PROMPTS = [
  "We handle high-value B2B enterprise accounts with complex approval workflows",
  "Our agents speak multiple languages and serve customers across different time zones",
  "We need to track competitor mentions and handle objections about pricing",
  "Compliance is critical - we need to ensure HIPAA/GDPR requirements are met",
  "We want to measure agent empathy and customer satisfaction throughout calls",
];

export function AISchemaEnhancer({
  schema,
  existingRules,
  onApplySuggestions,
  onSkip
}: AISchemaEnhancerProps) {
  const [userContext, setUserContext] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [suggestions, setSuggestions] = useState<EnhancementSuggestion | null>(null);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [selectedRules, setSelectedRules] = useState<Set<number>>(new Set());
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [selectedRelationships, setSelectedRelationships] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['fields', 'rules', 'topics']));

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleEnhance = async () => {
    if (!userContext.trim()) {
      toast.error('Please describe your business context');
      return;
    }

    const config = loadAzureConfigFromCookie();
    if (!config?.openAI?.endpoint || !config?.openAI?.apiKey) {
      toast.error('Azure OpenAI not configured. Please configure in Settings.');
      return;
    }

    setIsEnhancing(true);
    setSuggestions(null);

    try {
      const configManager = new BrowserConfigManager(config.openAI);
      const llmCaller = new LLMCaller(configManager);

      // Build the prompt
      const systemPrompt = `You are an expert call center quality assurance analyst. Your task is to analyze the user's business context and existing schema, then suggest improvements and additions.

You must respond with a valid JSON object containing your suggestions. Be specific and practical.`;

      const userPrompt = `## Current Schema

**Schema Name:** ${schema.name}
**Business Context:** ${schema.businessContext}

### Existing Fields
${schema.fields.map(f => `- **${f.displayName}** (${f.type}): ${f.semanticRole}${f.selectOptions ? ` - Options: ${f.selectOptions.join(', ')}` : ''}`).join('\n')}

### Existing Evaluation Rules
${existingRules.map(r => `- **${r.name}** (${r.type}): ${r.definition}`).join('\n')}

### Existing Topics
${(schema.topicTaxonomy || []).map(t => `- **${t.name}**: ${t.description}`).join('\n') || 'None defined'}

## User's Enhancement Request

${userContext}

## Your Task

Suggest enhancements to improve this schema. Return a JSON object with:
- suggestedFields: New fields to add (max 5)
- suggestedRules: New evaluation rules (max 5)  
- suggestedTopics: New conversation topics (max 5)
- suggestedRelationships: New field relationships (max 3)
- summary: Brief summary of suggestions

Each suggestion should include a "reasoning" field explaining why it's valuable.

For fields, include all required properties: id, name, displayName, type, semanticRole, required, showInTable, useInPrompt, enableAnalytics, and optionally dependsOn for conditional fields.

For rules, include: type ("Must Do" or "Must Not Do"), name, definition, evaluationCriteria, scoringStandard ({ passed, failed, partial? }), examples.

For topics, include: id, name, description, keywords, color.

Return ONLY valid JSON, no markdown or explanation.`;

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      const response = await llmCaller.callWithJsonValidation<EnhancementSuggestion>(messages, {
        useJsonMode: false,
        maxRetries: 2,
      });

      setSuggestions(response.parsed);
      
      // Auto-select all suggestions
      setSelectedFields(new Set(response.parsed.suggestedFields.map(f => f.id)));
      setSelectedRules(new Set(response.parsed.suggestedRules.map((_, i) => i)));
      setSelectedTopics(new Set(response.parsed.suggestedTopics.map(t => t.id)));
      setSelectedRelationships(new Set(response.parsed.suggestedRelationships.map(r => r.id)));
      
      toast.success('AI suggestions generated!');
    } catch (error) {
      console.error('Enhancement failed:', error);
      toast.error(`Enhancement failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleApply = () => {
    if (!suggestions) return;

    const fieldsToAdd = suggestions.suggestedFields.filter(f => selectedFields.has(f.id));
    const rulesToAdd = suggestions.suggestedRules.filter((_, i) => selectedRules.has(i));
    const topicsToAdd = suggestions.suggestedTopics.filter(t => selectedTopics.has(t.id));
    const relationshipsToAdd = suggestions.suggestedRelationships.filter(r => selectedRelationships.has(r.id));

    // Remove reasoning property before applying
    const cleanFields = fieldsToAdd.map(({ reasoning, ...field }) => field);
    const cleanRules = rulesToAdd.map(({ reasoning, ...rule }) => rule);
    const cleanTopics = topicsToAdd.map(({ reasoning, ...topic }) => topic);
    const cleanRelationships = relationshipsToAdd.map(({ reasoning, ...rel }) => rel);

    onApplySuggestions(cleanFields, cleanRules, cleanTopics, cleanRelationships);
  };

  const totalSelected = selectedFields.size + selectedRules.size + selectedTopics.size + selectedRelationships.size;
  const totalSuggestions = suggestions 
    ? suggestions.suggestedFields.length + suggestions.suggestedRules.length + 
      suggestions.suggestedTopics.length + suggestions.suggestedRelationships.length
    : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Enhance with AI</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Describe your specific needs and AI will suggest schema improvements
        </p>
      </div>

      {!suggestions ? (
        /* Input Phase */
        <div className="flex-1 space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Describe your business context and specific needs
            </label>
            <Textarea
              value={userContext}
              onChange={(e) => setUserContext(e.target.value)}
              placeholder="Example: We need to track customer sentiment, competitor mentions, and ensure agents follow a specific greeting script..."
              className="min-h-[150px]"
              disabled={isEnhancing}
            />
          </div>

          {/* Example Prompts */}
          <div>
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <Lightbulb className="h-3 w-3" />
              Try an example:
            </p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map((prompt, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="cursor-pointer hover:bg-muted transition-colors text-xs"
                  onClick={() => setUserContext(prompt)}
                >
                  {prompt.length > 50 ? prompt.substring(0, 50) + '...' : prompt}
                </Badge>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4">
            <Button variant="ghost" onClick={onSkip}>
              Skip Enhancement
            </Button>
            <Button 
              onClick={handleEnhance} 
              disabled={!userContext.trim() || isEnhancing}
            >
              {isEnhancing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Enhance with AI
                </>
              )}
            </Button>
          </div>

          {isEnhancing && (
            <div className="space-y-2">
              <Progress value={33} className="h-1" />
              <p className="text-xs text-center text-muted-foreground">
                AI is analyzing your requirements...
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Results Phase */
        <div className="flex-1 flex flex-col min-h-0">
          {/* Summary */}
          <Card className="mb-4 bg-primary/5 border-primary/20">
            <CardContent className="py-3">
              <p className="text-sm">{suggestions.summary}</p>
            </CardContent>
          </Card>

          {/* Suggestions */}
          <ScrollArea className="flex-1 pr-3">
            <div className="space-y-3">
              {/* Fields Section */}
              {suggestions.suggestedFields.length > 0 && (
                <Collapsible 
                  open={expandedSections.has('fields')}
                  onOpenChange={() => toggleSection('fields')}
                >
                  <CollapsibleTrigger asChild>
                    <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-500" />
                            <CardTitle className="text-sm">
                              New Fields ({selectedFields.size}/{suggestions.suggestedFields.length})
                            </CardTitle>
                          </div>
                          <ChevronDown className={`h-4 w-4 transition-transform ${
                            expandedSections.has('fields') ? 'rotate-180' : ''
                          }`} />
                        </div>
                      </CardHeader>
                    </Card>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-2 mt-2 ml-4">
                      {suggestions.suggestedFields.map((field) => (
                        <div 
                          key={field.id}
                          className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                        >
                          <Checkbox
                            checked={selectedFields.has(field.id)}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(selectedFields);
                              if (checked) {
                                newSelected.add(field.id);
                              } else {
                                newSelected.delete(field.id);
                              }
                              setSelectedFields(newSelected);
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Plus className="h-3 w-3 text-green-500" />
                              <span className="font-medium text-sm">{field.displayName}</span>
                              <Badge variant="outline" className="text-[10px]">{field.type}</Badge>
                              {field.dependsOn && (
                                <Badge variant="secondary" className="text-[10px]">
                                  🔗 Conditional
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{field.reasoning}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Rules Section */}
              {suggestions.suggestedRules.length > 0 && (
                <Collapsible 
                  open={expandedSections.has('rules')}
                  onOpenChange={() => toggleSection('rules')}
                >
                  <CollapsibleTrigger asChild>
                    <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Scale className="h-4 w-4 text-purple-500" />
                            <CardTitle className="text-sm">
                              New Rules ({selectedRules.size}/{suggestions.suggestedRules.length})
                            </CardTitle>
                          </div>
                          <ChevronDown className={`h-4 w-4 transition-transform ${
                            expandedSections.has('rules') ? 'rotate-180' : ''
                          }`} />
                        </div>
                      </CardHeader>
                    </Card>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-2 mt-2 ml-4">
                      {suggestions.suggestedRules.map((rule, idx) => (
                        <div 
                          key={idx}
                          className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                        >
                          <Checkbox
                            checked={selectedRules.has(idx)}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(selectedRules);
                              if (checked) {
                                newSelected.add(idx);
                              } else {
                                newSelected.delete(idx);
                              }
                              setSelectedRules(newSelected);
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge 
                                variant={rule.type === 'Must Do' ? 'default' : 'destructive'}
                                className="text-[10px]"
                              >
                                {rule.type}
                              </Badge>
                              <span className="font-medium text-sm">{rule.name}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mb-1">{rule.definition}</p>
                            <p className="text-xs text-muted-foreground italic">{rule.reasoning}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Topics Section */}
              {suggestions.suggestedTopics.length > 0 && (
                <Collapsible 
                  open={expandedSections.has('topics')}
                  onOpenChange={() => toggleSection('topics')}
                >
                  <CollapsibleTrigger asChild>
                    <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Tag className="h-4 w-4 text-orange-500" />
                            <CardTitle className="text-sm">
                              New Topics ({selectedTopics.size}/{suggestions.suggestedTopics.length})
                            </CardTitle>
                          </div>
                          <ChevronDown className={`h-4 w-4 transition-transform ${
                            expandedSections.has('topics') ? 'rotate-180' : ''
                          }`} />
                        </div>
                      </CardHeader>
                    </Card>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-2 mt-2 ml-4">
                      {suggestions.suggestedTopics.map((topic) => (
                        <div 
                          key={topic.id}
                          className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                        >
                          <Checkbox
                            checked={selectedTopics.has(topic.id)}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(selectedTopics);
                              if (checked) {
                                newSelected.add(topic.id);
                              } else {
                                newSelected.delete(topic.id);
                              }
                              setSelectedTopics(newSelected);
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: topic.color }}
                              />
                              <span className="font-medium text-sm">{topic.name}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mb-1">{topic.description}</p>
                            <div className="flex flex-wrap gap-1">
                              {topic.keywords?.slice(0, 3).map((kw, i) => (
                                <Badge key={i} variant="outline" className="text-[10px]">
                                  {kw}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Relationships Section */}
              {suggestions.suggestedRelationships.length > 0 && (
                <Collapsible 
                  open={expandedSections.has('relationships')}
                  onOpenChange={() => toggleSection('relationships')}
                >
                  <CollapsibleTrigger asChild>
                    <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Link2 className="h-4 w-4 text-cyan-500" />
                            <CardTitle className="text-sm">
                              New Relationships ({selectedRelationships.size}/{suggestions.suggestedRelationships.length})
                            </CardTitle>
                          </div>
                          <ChevronDown className={`h-4 w-4 transition-transform ${
                            expandedSections.has('relationships') ? 'rotate-180' : ''
                          }`} />
                        </div>
                      </CardHeader>
                    </Card>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-2 mt-2 ml-4">
                      {suggestions.suggestedRelationships.map((rel) => (
                        <div 
                          key={rel.id}
                          className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                        >
                          <Checkbox
                            checked={selectedRelationships.has(rel.id)}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(selectedRelationships);
                              if (checked) {
                                newSelected.add(rel.id);
                              } else {
                                newSelected.delete(rel.id);
                              }
                              setSelectedRelationships(newSelected);
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-[10px]">{rel.type}</Badge>
                              <span className="font-medium text-sm truncate">{rel.description}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Fields: {rel.involvedFields.join(' ↔ ')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          </ScrollArea>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 mt-4 border-t">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedFields(new Set(suggestions.suggestedFields.map(f => f.id)));
                  setSelectedRules(new Set(suggestions.suggestedRules.map((_, i) => i)));
                  setSelectedTopics(new Set(suggestions.suggestedTopics.map(t => t.id)));
                  setSelectedRelationships(new Set(suggestions.suggestedRelationships.map(r => r.id)));
                }}
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedFields(new Set());
                  setSelectedRules(new Set());
                  setSelectedTopics(new Set());
                  setSelectedRelationships(new Set());
                }}
              >
                Deselect All
              </Button>
              <span className="text-xs text-muted-foreground">
                {totalSelected} of {totalSuggestions} selected
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSuggestions(null)}>
                Back
              </Button>
              <Button 
                onClick={handleApply}
                disabled={totalSelected === 0}
              >
                <Check className="h-4 w-4 mr-2" />
                Apply {totalSelected} Suggestions
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
