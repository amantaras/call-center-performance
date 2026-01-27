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
import { Progress } from '@/components/ui/progress';
import { Sparkle, ArrowLeft, ArrowRight, Check, MagicWand } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { SchemaDefinition } from '@/types/schema';
import { EvaluationCriterion } from '@/types/call';
import { LLMCaller } from '@/llmCaller';
import type { AzureOpenAIConfig } from '@/configManager';
import { loadAzureConfigFromCookie } from '@/lib/azure-config-storage';
import { BrowserConfigManager } from '@/services/browser-config-manager';

interface EvaluationRulesWizardProps {
  activeSchema: SchemaDefinition | null;
  onRulesGenerated?: (rules: EvaluationCriterion[]) => void;
  trigger?: React.ReactNode;
}

type WizardStep = 'context' | 'generating' | 'review' | 'complete';

interface GeneratedRule {
  id: number;
  type: 'Must Do' | 'Must Not Do';
  name: string;
  definition: string;
  evaluationCriteria: string;
  scoringStandard: {
    passed: number;
    partial?: number;
    failed: number;
  };
  examples: string[];
  reasoning?: string;
}

export function EvaluationRulesWizard({
  activeSchema,
  onRulesGenerated,
  trigger,
}: EvaluationRulesWizardProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>('context');
  const [businessContext, setBusinessContext] = useState('');
  const [participant1Label, setParticipant1Label] = useState('Agent');
  const [participant2Label, setParticipant2Label] = useState('Customer');
  const [sampleCallDescriptions, setSampleCallDescriptions] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedRules, setGeneratedRules] = useState<GeneratedRule[]>([]);
  const [progress, setProgress] = useState(0);
  const [generatingDescriptions, setGeneratingDescriptions] = useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && activeSchema) {
      // Populate from active schema when opening
      setBusinessContext(activeSchema.businessContext || '');
      
      // Get participant labels from schema fields
      const p1Field = activeSchema.fields.find(f => f.semanticRole === 'participant_1');
      const p2Field = activeSchema.fields.find(f => f.semanticRole === 'participant_2');
      setParticipant1Label(p1Field?.participantLabel || p1Field?.displayName || 'Agent');
      setParticipant2Label(p2Field?.participantLabel || p2Field?.displayName || 'Customer');
    }
    
    if (!newOpen) {
      // Reset wizard state when closing
      setStep('context');
      setBusinessContext('');
      setParticipant1Label('Agent');
      setParticipant2Label('Customer');
      setSampleCallDescriptions('');
      setGeneratedRules([]);
      setProgress(0);
    }
    setOpen(newOpen);
  };

  const handleGenerateCallDescriptions = async () => {
    if (!activeSchema) {
      toast.error('No active schema selected');
      return;
    }

    if (!businessContext.trim()) {
      toast.error('Please provide business context first');
      return;
    }

    setGeneratingDescriptions(true);

    try {
      // Load Azure OpenAI config from cookie
      const azureServicesConfig = loadAzureConfigFromCookie();
      if (!azureServicesConfig?.openAI?.endpoint || !azureServicesConfig?.openAI?.apiKey || !azureServicesConfig?.openAI?.deploymentName) {
        throw new Error('Azure OpenAI is not configured. Please configure it in settings.');
      }

      const configManager = new BrowserConfigManager(azureServicesConfig.openAI);
      const llmCaller = new LLMCaller(configManager);

      // Create prompt for call description generation
      const schemaFieldsSummary = activeSchema.fields
        .filter(f => f.showInTable || f.useInPrompt)
        .map(f => `- ${f.displayName} (${f.semanticRole}): ${f.type}`)
        .join('\n');

      const prompt = `Based on this business context and schema, generate 2-3 realistic sample call descriptions that represent typical interactions.

Business Context:
${businessContext}

Participants:
- ${participant1Label}: ${activeSchema.fields.find(f => f.semanticRole === 'participant_1')?.displayName || 'First participant'}
- ${participant2Label}: ${activeSchema.fields.find(f => f.semanticRole === 'participant_2')?.displayName || 'Second participant'}

Schema Fields:
${schemaFieldsSummary}

Provide 2-3 short call descriptions (2-3 sentences each) showing different scenarios. Format as a continuous paragraph separated by new lines.`;

      const response = await llmCaller.call([
        { role: 'system', content: 'You are a call center operations expert.' },
        { role: 'user', content: prompt }
      ]);

      if (response) {
        setSampleCallDescriptions(response.trim());
        toast.success('Call descriptions generated');
      }
    } catch (error: any) {
      console.error('Failed to generate descriptions:', error);
      toast.error(`Failed: ${error.message}`);
    } finally {
      setGeneratingDescriptions(false);
    }
  };

  const handleGenerateRules = async () => {
    if (!activeSchema) {
      toast.error('No active schema selected');
      return;
    }

    if (!businessContext.trim()) {
      toast.error('Please provide business context');
      return;
    }

    setStep('generating');
    setGenerating(true);
    setProgress(10);

    try {
      setProgress(30);

      // Get participant field names from schema by semantic role
      const participant1Field = activeSchema.fields.find(
        (f) => f.semanticRole === 'participant_1'
      );
      const participant2Field = activeSchema.fields.find(
        (f) => f.semanticRole === 'participant_2'
      );
      const participant1FieldName = participant1Field?.name || 'agentName';
      const participant2FieldName = participant2Field?.name || 'borrowerName';

      // Build inline prompt
      const filledPrompt = `You are an expert QA framework designer specializing in call quality evaluation. Generate comprehensive evaluation rules tailored to the provided schema and business context.

## Business Context
${businessContext}

## Schema Definition
${JSON.stringify(activeSchema, null, 2)}

## Participant Information
- **Participant 1 (${participant1Label})**: ${participant1FieldName}
- **Participant 2 (${participant2Label})**: ${participant2FieldName}

## Sample Call Descriptions
${sampleCallDescriptions || 'No sample descriptions provided'}

## Your Task
Generate 8-12 **evaluation rules** that assess conversation quality. Each rule should:

1. **Be domain-appropriate**: Match the business context and industry
2. **Be measurable**: Have clear pass/fail/partial criteria
3. **Reference schema fields**: Use participant labels and classification fields
4. **Provide actionable feedback**: Help improve performance
5. **Cover key aspects**: Opening, process, compliance, tone, closing

### Rule Categories to Include:
- **Communication Skills**: Clarity, tone, professionalism
- **Process Compliance**: Following procedures, required disclosures
- **Information Gathering**: Questions asked, data collected
- **Problem Solving**: Handling objections, finding solutions
- **Relationship Building**: Empathy, rapport, customer experience
- **Documentation**: Accuracy, completeness of records

## Response Format
Return a valid JSON array of evaluation rule objects. Each object must have:
- id (number): Sequential starting from 1
- type (string): "Must Do" or "Must Not Do"
- name (string): Rule name (3-5 words)
- definition (string): What this rule evaluates (1-2 sentences)
- evaluationCriteria (string): Specific criteria with bullet points
- scoringStandard (object): { passed: number, failed: number, partial?: number }
- examples (array): 2-3 example strings
- reasoning (string): Why this matters for the business context

**Scoring Guidelines:**
- Critical compliance rules: 10-15 points
- Important quality rules: 5-10 points
- Minor improvement rules: 2-5 points

**Important:** Tailor rules to the business context, use participant labels consistently, ensure rules are objective and measurable.`;

      setProgress(50);

      // Load Azure OpenAI config from cookie
      const azureServicesConfig = loadAzureConfigFromCookie();
      if (!azureServicesConfig?.openAI?.endpoint || !azureServicesConfig?.openAI?.apiKey || !azureServicesConfig?.openAI?.deploymentName) {
        throw new Error('Azure OpenAI is not configured. Please configure it in settings.');
      }

      // Call LLM
      const configManager = new BrowserConfigManager(azureServicesConfig.openAI);
      const llmCaller = new LLMCaller(configManager);

      console.log('🤖 Generating evaluation rules with AI...');
      console.log('📋 Schema:', activeSchema.name);
      console.log('💼 Business context:', businessContext);

      const response = await llmCaller.callWithJsonValidation<GeneratedRule[]>(
        [
          {
            role: 'system',
            content: 'You are an expert QA framework designer. Generate evaluation rules in valid JSON format.',
          },
          {
            role: 'user',
            content: filledPrompt,
          },
        ],
        {
          useJsonMode: false, // Use prompt engineering for better quality
          maxRetries: 2,
        }
      );

      setProgress(90);

      if (!response.parsed || !Array.isArray(response.parsed)) {
        throw new Error('Invalid response format from AI');
      }

      // Validate and clean up rules
      const validatedRules: GeneratedRule[] = response.parsed.map((rule, index) => ({
        id: index + 1,
        type: rule.type === 'Must Not Do' ? 'Must Not Do' : 'Must Do',
        name: rule.name || `Rule ${index + 1}`,
        definition: rule.definition || '',
        evaluationCriteria: rule.evaluationCriteria || '',
        scoringStandard: {
          passed: rule.scoringStandard?.passed || 10,
          partial: rule.scoringStandard?.partial,
          failed: rule.scoringStandard?.failed || 0,
        },
        examples: Array.isArray(rule.examples) ? rule.examples : [],
        reasoning: rule.reasoning,
      }));

      setGeneratedRules(validatedRules);
      setProgress(100);
      setStep('review');

      toast.success(`Generated ${validatedRules.length} evaluation rules`);
    } catch (error: any) {
      console.error('Failed to generate rules:', error);
      toast.error(`Failed to generate rules: ${error.message}`);
      setStep('context');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveRules = () => {
    if (!activeSchema) {
      toast.error('No active schema selected');
      return;
    }

    // Load existing rules
    const storageKey = `evaluation-criteria-${activeSchema.id}`;
    const existingRulesStr = localStorage.getItem(storageKey);
    const existingRules: EvaluationCriterion[] = existingRulesStr 
      ? JSON.parse(existingRulesStr) 
      : [];

    // Find the highest existing ID
    const maxId = existingRules.length > 0 
      ? Math.max(...existingRules.map(r => r.id)) 
      : 0;

    // Convert generated rules to EvaluationCriterion format with new IDs
    const newRules: EvaluationCriterion[] = generatedRules.map((rule, index) => ({
      id: maxId + index + 1,
      type: rule.type,
      name: rule.name,
      definition: rule.definition,
      evaluationCriteria: rule.evaluationCriteria,
      scoringStandard: rule.scoringStandard,
      examples: rule.examples,
    }));

    // Merge existing and new rules
    const mergedRules = [...existingRules, ...newRules];

    // Save merged rules to schema-specific localStorage
    localStorage.setItem(storageKey, JSON.stringify(mergedRules));

    // Also update global custom rules with merged rules
    localStorage.setItem('evaluation-criteria-custom', JSON.stringify(mergedRules));

    // Notify parent with merged rules
    onRulesGenerated?.(mergedRules);

    setStep('complete');
    toast.success(`Added ${newRules.length} new rules to ${activeSchema.name} (Total: ${mergedRules.length})`);

    // Close after brief delay
    setTimeout(() => {
      handleOpenChange(false);
    }, 1500);
  };

  const handleUpdateRule = (index: number, updates: Partial<GeneratedRule>) => {
    const newRules = [...generatedRules];
    newRules[index] = { ...newRules[index], ...updates };
    setGeneratedRules(newRules);
  };

  const handleRemoveRule = (index: number) => {
    const newRules = generatedRules.filter((_, i) => i !== index);
    // Re-index
    const reindexedRules = newRules.map((rule, i) => ({ ...rule, id: i + 1 }));
    setGeneratedRules(reindexedRules);
    toast.info('Rule removed');
  };

  const totalPoints = generatedRules.reduce((sum, rule) => sum + rule.scoringStandard.passed, 0);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Sparkle className="mr-2 animate-pulse" size={18} />
            Generate Rules
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MagicWand size={24} className="text-primary" />
            AI-Powered Rules Generator
          </DialogTitle>
          <DialogDescription>
            {step === 'context' && 'Provide context about your business domain and call center operations'}
            {step === 'generating' && 'Analyzing your schema and generating evaluation rules...'}
            {step === 'review' && 'Review and edit generated rules before saving'}
            {step === 'complete' && 'Rules saved successfully!'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Context Step */}
          {step === 'context' && (
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {!activeSchema ? (
                <Card className="border-destructive">
                  <CardContent className="pt-6">
                    <p className="text-sm text-destructive">
                      No schema is currently active. Please create or select a schema first.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <Sparkle size={20} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium mb-1">Active Schema</h3>
                          <p className="text-sm text-muted-foreground">
                            {activeSchema.name} v{activeSchema.version}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {activeSchema.fields.length} fields • {activeSchema.businessContext}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-2">
                    <Label htmlFor="business-context">
                      Business Context <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="business-context"
                      value={businessContext}
                      onChange={(e) => setBusinessContext(e.target.value)}
                      placeholder="Describe your business domain, industry, and call center operations. E.g., 'Debt collection call center for a digital lending platform in UAE. Agents contact borrowers with overdue payments to recover outstanding amounts while maintaining professionalism and compliance.'"
                      rows={4}
                      disabled={!!activeSchema?.businessContext}
                    />
                    <p className="text-xs text-muted-foreground">
                      {activeSchema?.businessContext 
                        ? '✓ Loaded from active schema' 
                        : 'This helps the AI generate domain-specific evaluation criteria'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="participant1">Participant 1 Label</Label>
                      <Input
                        id="participant1"
                        value={participant1Label}
                        onChange={(e) => setParticipant1Label(e.target.value)}
                        placeholder="Agent"
                        disabled
                      />
                      <p className="text-xs text-muted-foreground">
                        Field:{' '}
                        {activeSchema.fields.find((f) => f.semanticRole === 'participant_1')
                          ?.displayName || 'Agent name'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="participant2">Participant 2 Label</Label>
                      <Input
                        id="participant2"
                        value={participant2Label}
                        onChange={(e) => setParticipant2Label(e.target.value)}
                        placeholder="Customer"
                        disabled
                      />
                      <p className="text-xs text-muted-foreground">
                        Field:{' '}
                        {activeSchema.fields.find((f) => f.semanticRole === 'participant_2')
                          ?.displayName || 'Borrower name'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="sample-calls">Sample Call Descriptions (Optional)</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-purple-500 text-purple-600 hover:bg-purple-50 hover:text-purple-700"
                        onClick={handleGenerateCallDescriptions}
                        disabled={!businessContext.trim() || generatingDescriptions}
                      >
                        <Sparkle className="mr-2" size={16} />
                        {generatingDescriptions ? 'Generating...' : 'Generate Call Descriptions'}
                      </Button>
                    </div>
                    <Textarea
                      id="sample-calls"
                      value={sampleCallDescriptions}
                      onChange={(e) => setSampleCallDescriptions(e.target.value)}
                      placeholder="Provide examples of typical calls in your operation. E.g., 'Agent calls borrower who is 5 days overdue on AED 500. Agent verifies identity, discloses overdue amount, and asks for payment commitment.'"
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional: Helps generate more realistic rules and examples
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Generating Step */}
          {step === 'generating' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 py-12">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/30 border-t-primary" />
                <MagicWand className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" size={24} />
              </div>
              <div className="text-center space-y-2">
                <h3 className="font-medium">Generating Evaluation Rules</h3>
                <p className="text-sm text-muted-foreground">
                  Analyzing your schema and business context...
                </p>
              </div>
              <Progress value={progress} className="w-64" />
            </div>
          )}

          {/* Review Step */}
          {step === 'review' && (
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              <div className="flex items-center justify-between sticky top-0 bg-background py-2 border-b">
                <div className="flex items-center gap-3">
                  <h3 className="font-medium">Generated Rules ({generatedRules.length})</h3>
                  <Badge variant="secondary">{totalPoints} total points</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Click rules to expand and edit
                </p>
              </div>

              {generatedRules.map((rule, index) => (
                <Card key={rule.id}>
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="flex flex-col items-center gap-1">
                          <Badge variant={rule.type === 'Must Do' ? 'default' : 'destructive'}>
                            {rule.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {rule.scoringStandard.passed} pts
                          </span>
                        </div>
                        <div className="flex-1">
                          <Input
                            value={rule.name}
                            onChange={(e) => handleUpdateRule(index, { name: e.target.value })}
                            className="font-medium mb-2"
                          />
                          <Textarea
                            value={rule.definition}
                            onChange={(e) => handleUpdateRule(index, { definition: e.target.value })}
                            rows={2}
                            className="text-sm mb-2"
                          />
                          <Textarea
                            value={rule.evaluationCriteria}
                            onChange={(e) =>
                              handleUpdateRule(index, { evaluationCriteria: e.target.value })
                            }
                            rows={3}
                            className="text-sm"
                          />
                          {rule.reasoning && (
                            <p className="text-xs text-muted-foreground mt-2 italic">
                              💡 {rule.reasoning}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveRule(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        Remove
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Complete Step */}
          {step === 'complete' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 py-12">
              <div className="rounded-full h-16 w-16 bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Check className="text-green-600 dark:text-green-400" size={32} />
              </div>
              <div className="text-center space-y-2">
                <h3 className="font-medium">Rules Saved Successfully!</h3>
                <p className="text-sm text-muted-foreground">
                  {generatedRules.length} evaluation rules have been saved to{' '}
                  <span className="font-medium">{activeSchema?.name}</span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div>
            {step === 'review' && (
              <Button variant="outline" onClick={() => setStep('context')}>
                <ArrowLeft className="mr-2" size={16} />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              {step === 'complete' ? 'Close' : 'Cancel'}
            </Button>
            {step === 'context' && (
              <Button
                onClick={handleGenerateRules}
                disabled={!activeSchema || !businessContext.trim() || generating}
              >
                {generating ? (
                  <>
                    <Sparkle className="mr-2 animate-spin" size={16} />
                    Generating...
                  </>
                ) : (
                  <>
                    Generate Rules
                    <ArrowRight className="ml-2" size={16} />
                  </>
                )}
              </Button>
            )}
            {step === 'review' && (
              <Button onClick={handleSaveRules} disabled={generatedRules.length === 0}>
                <Check className="mr-2" size={16} />
                Save Rules
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
