import { CallMetadata, CallEvaluation, EvaluationResult, EvaluationCriterion, TranscriptPhrase, CallSentimentSegment, SentimentLabel, ProductInsight, RiskInsight, NationalityInsight, OutcomeInsight, BorrowerInsight, RiskTier, CategorizedOutcome, CallRecord, TopicInsight, TopicsAndPhrasesInsight } from '@/types/call';
import { SchemaDefinition, TopicDefinition, SchemaEvaluationRule } from '@/types/schema';
import { EVALUATION_CRITERIA, getMaxScore } from '@/lib/evaluation-criteria';
import { loadRulesForSchema } from '@/services/rules-generator';
import type { AzureOpenAIConfig } from '@/configManager';
import { LLMCaller, ChatMessage, LLMCallOptions } from '../llmCaller';
import { preparePrompt } from '@/lib/prompt-loader';
import { BrowserConfigManager } from './browser-config-manager';

// Global rules cache - can be updated by UI
let CUSTOM_EVALUATION_CRITERIA: EvaluationCriterion[] | null = null;

export function setCustomEvaluationCriteria(criteria: EvaluationCriterion[] | null): void {
  CUSTOM_EVALUATION_CRITERIA = criteria;
}

export function getActiveEvaluationCriteria(): EvaluationCriterion[] {
  return CUSTOM_EVALUATION_CRITERIA || EVALUATION_CRITERIA;
}

// Cache for evaluation criteria to prevent repeated localStorage reads on every render
const evaluationCriteriaCache = new Map<string, { criteria: EvaluationCriterion[], timestamp: number }>();
const CACHE_TTL_MS = 5000; // 5 second cache

/**
 * Get evaluation criteria for a specific schema
 * This loads rules directly from localStorage for the given schema ID
 * Falls back to global custom criteria, then default criteria
 */
export function getEvaluationCriteriaForSchema(schemaId: string): EvaluationCriterion[] {
  // Check cache first
  const cached = evaluationCriteriaCache.get(schemaId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.criteria;
  }
  
  // Load from localStorage
  const schemaRules = loadRulesForSchema(schemaId);
  
  let criteria: EvaluationCriterion[];
  if (schemaRules && schemaRules.length > 0) {
    criteria = schemaRules.map(rule => ({
      id: rule.id,
      type: rule.type,
      name: rule.name,
      definition: rule.definition,
      evaluationCriteria: rule.evaluationCriteria,
      scoringStandard: rule.scoringStandard,
      examples: rule.examples
    }));
  } else {
    // Fall back to global custom criteria or defaults
    criteria = CUSTOM_EVALUATION_CRITERIA || EVALUATION_CRITERIA;
  }
  
  // Update cache
  evaluationCriteriaCache.set(schemaId, { criteria, timestamp: Date.now() });
  
  return criteria;
}

/**
 * Clear the evaluation criteria cache (call when rules are updated)
 */
export function clearEvaluationCriteriaCache(schemaId?: string): void {
  if (schemaId) {
    evaluationCriteriaCache.delete(schemaId);
  } else {
    evaluationCriteriaCache.clear();
  }
}

export class AzureOpenAIService {
  private config: AzureOpenAIConfig;
  private llmCaller: LLMCaller | null = null;

  constructor(config?: AzureOpenAIConfig) {
    this.config = config || {
      endpoint: '',
      apiKey: '',
      deploymentName: '',
      apiVersion: '2024-12-01-preview',
      authType: 'apiKey',
      reasoningEffort: 'low',
    };
    
    if (this.isConfigValid()) {
      this.initializeLLMCaller();
    }
  }

  private isConfigValid(): boolean {
    // For Entra ID auth, we don't need an API key
    if (this.config.authType === 'entraId') {
      return !!(this.config.endpoint && this.config.deploymentName);
    }
    // For API key auth, we need all three
    return !!(this.config.endpoint && this.config.apiKey && this.config.deploymentName);
  }

  private initializeLLMCaller(): void {
    console.log('🔧 Initializing LLMCaller with config:', {
      endpoint: this.config.endpoint,
      deploymentName: this.config.deploymentName,
      apiVersion: this.config.apiVersion,
      reasoningEffort: this.config.reasoningEffort,
      authType: this.config.authType
    });
    const configManager = new BrowserConfigManager(this.config);
    this.llmCaller = new LLMCaller(configManager);
    console.log('✓ LLMCaller initialized with structured outputs support');
  }

  updateConfig(config: Partial<AzureOpenAIConfig>) {
    this.config = { ...this.config, ...config };
    
    // Always reinitialize LLM caller if config is valid (even if already initialized)
    // This ensures updated settings like reasoningEffort take effect immediately
    if (this.isConfigValid()) {
      this.initializeLLMCaller();
      console.log('🔄 LLMCaller reinitialized with updated config:', {
        reasoningEffort: this.config.reasoningEffort,
        deploymentName: this.config.deploymentName,
        apiVersion: this.config.apiVersion
      });
    }
  }

  /**
   * Build evaluation prompt with criteria and insights generation (schema-aware)
   */
  private async buildEvaluationPrompt(
    transcript: string, 
    metadata: Record<string, any>,
    schema: SchemaDefinition
  ): Promise<string> {
    console.log(`📝 buildEvaluationPrompt for schema: "${schema.name}" (id: ${schema.id})`);
    
    // Get criteria specific to this schema
    const activeCriteria = getEvaluationCriteriaForSchema(schema.id);
    console.log(`📝 Using ${activeCriteria.length} criteria for evaluation`);
    console.log(`📝 Criteria scores for this eval:`, activeCriteria.map(c => `${c.name}: ${c.scoringStandard.passed}pts`).join(', '));
    
    const criteriaText = activeCriteria.map((criterion) => {
      return `${criterion.id}. ${criterion.name} [${criterion.type}]
   Definition: ${criterion.definition}
   Evaluation: ${criterion.evaluationCriteria}
   Scoring: ${criterion.scoringStandard.passed} points if passed, ${criterion.scoringStandard.failed} if failed${criterion.scoringStandard.partial ? `, ${criterion.scoringStandard.partial} if partially met` : ''}
   Examples: ${criterion.examples.join(' | ')}`;
    }).join('\n\n');

    // Build dynamic metadata section from schema fields marked for prompt inclusion
    const metadataFields = schema.fields
      .filter(f => f.useInPrompt !== false) // Include by default unless explicitly disabled
      .map(field => {
        const value = metadata[field.id];
        const displayValue = value !== undefined && value !== null ? value : 'N/A';
        return `- ${field.displayName}: ${displayValue}`;
      })
      .join('\n');

    // Include business context if available
    const businessContextSection = schema.businessContext
      ? `\n\nBUSINESS CONTEXT:\n${schema.businessContext}\n`
      : '';

    // Build topic taxonomy section if available
    const topicTaxonomySection = this.buildTopicTaxonomySection(schema.topicTaxonomy);

    // Check if schema has custom insight categories - if so, use schema-driven prompt
    const hasCustomInsights = schema.insightCategories && schema.insightCategories.length > 0;
    
    if (hasCustomInsights) {
      const enabledCategories = schema.insightCategories!.filter(c => c.enabled);
      console.log(`📝 Using schema-driven insights (${enabledCategories.length} enabled categories out of ${schema.insightCategories!.length} total)`);
      console.log(`📝 Enabled category names: ${enabledCategories.map(c => c.name).join(', ')}`);
      return this.buildSchemaBasedEvaluationPrompt(
        transcript,
        metadata,
        schema,
        activeCriteria,
        criteriaText,
        metadataFields,
        businessContextSection,
        topicTaxonomySection
      );
    }

    // Fall back to legacy prompt for backward compatibility
    console.log(`📝 Using legacy debt-collection insights (no custom categories)`);
    return await preparePrompt('call-evaluation', {
      schemaName: schema.name,
      criteriaCount: activeCriteria.length.toString(),
      businessContext: businessContextSection,
      metadataFields,
      transcript,
      criteriaText,
      topicTaxonomySection,
      productType: metadata.product || 'N/A',
      daysPastDue: metadata.daysPastDue || 'N/A',
      dueAmount: metadata.dueAmount || 'N/A',
      nationality: metadata.nationality || 'N/A',
      followUpStatus: metadata.followUpStatus || 'N/A'
    });
  }

  /**
   * Build a schema-driven evaluation prompt with custom insight categories
   */
  private buildSchemaBasedEvaluationPrompt(
    transcript: string,
    metadata: Record<string, any>,
    schema: SchemaDefinition,
    activeCriteria: EvaluationCriterion[],
    criteriaText: string,
    metadataFields: string,
    businessContextSection: string,
    topicTaxonomySection: string
  ): string {
    // Build insight categories section
    const insightInstructions = schema.insightCategories!.filter(c => c.enabled).map((category, idx) => {
      const outputFieldsDescription = category.outputFields.map(field => {
        let typeDesc: string = field.type;
        if (field.type === 'enum' && field.enumValues) {
          typeDesc = `one of: ${field.enumValues.map(v => `"${v}"`).join(', ')}`;
        }
        return `     - ${field.id} (${typeDesc}): ${field.description}`;
      }).join('\n');

      return `${idx + 1}. ${category.name.toUpperCase()} (${category.icon}):
   ${category.description}
   Instructions: ${category.promptInstructions}
   Output fields:
${outputFieldsDescription}`;
    }).join('\n\n');

    // Build insight JSON structure
    const insightJsonStructure = schema.insightCategories!.filter(c => c.enabled).reduce((acc, category) => {
      const fields: Record<string, string> = {};
      category.outputFields.forEach(field => {
        if (field.type === 'string' || field.type === 'text') {
          fields[field.id] = 'string value';
        } else if (field.type === 'number') {
          fields[field.id] = '0-100';
        } else if (field.type === 'boolean') {
          fields[field.id] = 'true | false';
        } else if (field.type === 'enum' && field.enumValues) {
          fields[field.id] = field.enumValues.map(v => `"${v}"`).join(' | ');
        } else if (field.type === 'tags') {
          fields[field.id] = '["tag1", "tag2"]';
        }
      });
      acc[category.id] = fields;
      return acc;
    }, {} as Record<string, Record<string, string>>);

    const insightJsonExample = JSON.stringify(insightJsonStructure, null, 2)
      .replace(/"string value"/g, '"your analysis here"')
      .replace(/"0-100"/g, '75')
      .replace(/"true \| false"/g, 'true')
      .replace(/"\[.*?\]"/g, '["item1", "item2"]');

    return `You are an expert call center quality assurance evaluator for: ${schema.name}.

Analyze the following call transcript and evaluate it against the ${activeCriteria.length} quality criteria below. Additionally, generate detailed analytical insights for business intelligence.${businessContextSection}

**IMPORTANT: You MUST provide ALL responses, insights, analysis, reasoning, feedback, and recommendations in ENGLISH language only, regardless of the language used in the transcript.**

CALL METADATA:
${metadataFields}

TRANSCRIPT:
${transcript}

EVALUATION CRITERIA:
${criteriaText}
${topicTaxonomySection}
For each criterion, provide:
1. criterionId (number 1-${activeCriteria.length})
2. score (exactly 0, 5, or 10 based on the scoring standard)
3. passed (true if score >= 10, false otherwise)
4. evidence (exact quote from transcript if found, or "Not found" if missing)
5. reasoning (brief explanation IN ENGLISH of why this score was given)

Also provide an overallFeedback string (2-3 sentences IN ENGLISH) highlighting key strengths and areas for improvement.

IMPORTANT: Additionally, generate detailed analytical insights IN ENGLISH based on the call metadata and transcript.

CUSTOM INSIGHT CATEGORIES FOR THIS SCHEMA:
${insightInstructions}

6. TOPICS AND KEY PHRASES INSIGHT:
   - Classify the call into the most relevant topic(s) from the Topic Taxonomy provided (if available)
   - For each matched topic, provide a confidence score (0-1) and assess the sentiment within that topic context
   - Extract 5-10 significant key phrases from the transcript that capture the main discussion points

Return your evaluation and insights as a valid JSON object with this exact structure:
{
  "results": [
    {
      "criterionId": 1,
      "score": 10,
      "passed": true,
      "evidence": "exact quote from transcript or description",
      "reasoning": "brief explanation"
    }
  ],
  "overallFeedback": "2-3 sentence summary",
  "insights": {
    "schemaInsights": ${insightJsonExample},
    "topicsAndPhrases": {
      "topics": [
        {
          "topicId": "topic-id-from-taxonomy",
          "topicName": "Topic Display Name",
          "confidence": 0.85,
          "sentiment": "positive" | "negative" | "neutral"
        }
      ],
      "keyPhrases": ["key phrase 1", "key phrase 2", "important term"]
    }
  }
}

Be thorough, fair, and specific in your evaluation. Quote exact phrases when possible. Provide detailed, actionable insights IN ENGLISH LANGUAGE ONLY for all insight categories.`;
  }

  /**
   * Build topic taxonomy section for the evaluation prompt
   */
  private buildTopicTaxonomySection(topicTaxonomy?: TopicDefinition[]): string {
    if (!topicTaxonomy || topicTaxonomy.length === 0) {
      return '\n\nTOPIC TAXONOMY:\nNo topic taxonomy defined. Generate topics based on the conversation content.\n';
    }

    const formatTopic = (topic: TopicDefinition, level = 0): string => {
      const indent = '  '.repeat(level);
      const keywords = topic.keywords?.length ? ` (keywords: ${topic.keywords.join(', ')})` : '';
      let result = `${indent}- ${topic.id}: ${topic.name}${keywords}\n`;
      result += `${indent}  Description: ${topic.description}\n`;
      
      if (topic.children && topic.children.length > 0) {
        for (const child of topic.children) {
          result += formatTopic(child, level + 1);
        }
      }
      
      return result;
    };

    const topicsText = topicTaxonomy.map(t => formatTopic(t)).join('');

    return `

TOPIC TAXONOMY:
Use the following predefined topics to classify this call. Match the call to one or more topics based on the conversation content. Use the topic IDs exactly as provided.

${topicsText}
`;
  }

  /**
   * Evaluate a call transcript against quality criteria with retry logic
   * 
   * @param transcript - The call transcript text
   * @param metadata - Call metadata (dynamic schema-based fields)
   * @param schema - Schema definition for this call
   * @param callId - Unique identifier for this call
   * @returns CallEvaluation with validated structure
   */
  async evaluateCall(
    transcript: string,
    metadata: Record<string, any>,
    schema: SchemaDefinition,
    callId: string
  ): Promise<CallEvaluation> {
    if (!transcript || transcript.trim().length === 0) {
      throw new Error('Transcript is empty or invalid');
    }

    if (!this.llmCaller) {
      throw new Error('Azure OpenAI is not configured. Please configure the service in Settings.');
    }

    console.log('🔍 Starting call evaluation with LLMCaller...');
    
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are an expert call center quality assurance evaluator for: ${schema.name}. You must return valid JSON only.`,
      },
      {
        role: 'user',
        content: await this.buildEvaluationPrompt(transcript, metadata, schema),
      },
    ];

    try {
      // Check if schema has custom insight categories
      const hasCustomInsights = schema.insightCategories && schema.insightCategories.length > 0;
      
      // Use LLMCaller's JSON validation with retry logic
      // Do NOT use structuredOutputSchema - Azure Responses API doesn't support it the same way
      const response = await this.llmCaller.callWithJsonValidation<{
        results: EvaluationResult[];
        overallFeedback: string;
        insights?: {
          // Schema-driven insights (new approach)
          schemaInsights?: Record<string, Record<string, any>>;
          // Legacy debt-collection specific insights (backward compatibility)
          product?: {
            productType: string;
            performanceFactors: string[];
            recommendedApproach: string;
          };
          risk?: {
            riskTier: string;
            riskScore: number;
            paymentProbability: number;
            escalationRecommended: boolean;
            detailedAnalysis: string;
          };
          nationality?: {
            culturalFactors: string[];
            languageEffectiveness: string;
            recommendedAdjustments: string;
          };
          outcome?: {
            categorizedOutcome: string;
            successProbability: number;
            keyFactors: string[];
            reasoning: string;
          };
          borrower?: {
            interactionQuality: string;
            relationshipIndicators: string[];
            futureStrategy: string;
          };
          topicsAndPhrases?: {
            topics: Array<{
              topicId: string;
              topicName: string;
              confidence: number;
              sentiment: string;
            }>;
            keyPhrases: string[];
          };
        };
      }>(messages, {
        useJsonMode: false, // Rely on prompt engineering, not JSON mode
        maxRetries: 3,
        retryDelay: 1000,
      });

      const { parsed } = response;

      // Validate results
      if (!parsed.results || !Array.isArray(parsed.results)) {
        throw new Error('Invalid response format from AI - missing results array');
      }

      // Calculate totals using criteria specific to this schema
      const activeCriteria = getEvaluationCriteriaForSchema(schema.id);
      console.log(`🔧 Enforcing scores from rules (not trusting LLM scores)`);

      if (parsed.results.length !== activeCriteria.length) {
        console.warn(`⚠ Expected ${activeCriteria.length} results, got ${parsed.results.length}`);
      }

      // Validate each result and ENFORCE scores from our rules (don't trust LLM scores)
      const correctedResults = parsed.results.map((result: any) => {
        if (!result.criterionId || result.passed === undefined) {
          throw new Error(`Invalid result structure: ${JSON.stringify(result)}`);
        }
        
        // Find the matching criterion by ID, name, or numeric index (LLM returns 1-based index)
        const criterion = activeCriteria.find(c => 
          c.id === result.criterionId || 
          c.name === result.criterionName ||
          c.id === parseInt(result.criterionId)
        ) || activeCriteria[parseInt(result.criterionId) - 1]; // Fallback to array index (1-based to 0-based)
        
        if (!criterion) {
          console.warn(`⚠ No criterion found for ID: ${result.criterionId}, skipping enforcement`);
          return result;
        }
        
        // ENFORCE the score from our rules based on pass/fail/partial status
        let enforcedScore: number;
        if (result.passed === true) {
          enforcedScore = criterion.scoringStandard.passed;
        } else if (result.passed === 'partial' && criterion.scoringStandard.partial) {
          enforcedScore = criterion.scoringStandard.partial;
        } else {
          enforcedScore = criterion.scoringStandard.failed;
        }
        
        console.log(`   ${criterion.name}: LLM said ${result.score}pts, enforcing ${enforcedScore}pts (${result.passed ? 'passed' : 'failed'})`);
        
        return {
          ...result,
          score: enforcedScore, // Override LLM score with our rule's score
        };
      });

      const totalScore = correctedResults.reduce((sum: number, r: any) => sum + r.score, 0);
      const maxScore = activeCriteria.reduce((sum, c) => sum + c.scoringStandard.passed, 0);
      const percentage = Math.round((totalScore / maxScore) * 100);
      console.log(`📊 Final score: ${totalScore}/${maxScore} = ${percentage}%`);

      // Parse and validate insights if present
      let productInsight: ProductInsight | undefined;
      let riskInsight: RiskInsight | undefined;
      let nationalityInsight: NationalityInsight | undefined;
      let outcomeInsight: OutcomeInsight | undefined;
      let borrowerInsight: BorrowerInsight | undefined;
      let topicsInsight: TopicsAndPhrasesInsight | undefined;
      let schemaInsights: Record<string, Record<string, any>> | undefined;

      if (parsed.insights) {
        // Check if schema has custom insight categories - use schema-driven insights
        if (hasCustomInsights && parsed.insights.schemaInsights) {
          console.log('📊 Parsing schema-driven insights');
          console.log(`📊 Schema has ${schema.insightCategories!.filter(c => c.enabled).length} enabled insight categories:`, schema.insightCategories!.filter(c => c.enabled).map(c => c.name).join(', '));
          schemaInsights = parsed.insights.schemaInsights;
          console.log(`✓ Schema insights received from LLM - categories: ${Object.keys(schemaInsights).join(', ')}`);
          console.log(`✓ Full schemaInsights data:`, JSON.stringify(schemaInsights, null, 2));
        } 
        // Only parse legacy insights if schema does NOT have custom insight categories
        else if (!hasCustomInsights) {
          console.log('📊 Parsing legacy debt-collection insights');
          
          // Product insight
          if (parsed.insights.product) {
            productInsight = {
              productType: parsed.insights.product.productType || metadata.product,
              performanceFactors: Array.isArray(parsed.insights.product.performanceFactors)
                ? parsed.insights.product.performanceFactors
                : [],
              recommendedApproach: parsed.insights.product.recommendedApproach || '',
            };
          }

          // Risk insight
          if (parsed.insights.risk) {
            const riskTierValue = parsed.insights.risk.riskTier as RiskTier;
            riskInsight = {
              riskTier: ['Low', 'Medium', 'High', 'Critical'].includes(riskTierValue)
                ? riskTierValue
                : this.calculateRiskTier(metadata.daysPastDue),
              riskScore: Math.min(100, Math.max(0, parsed.insights.risk.riskScore || 0)),
              paymentProbability: Math.min(100, Math.max(0, parsed.insights.risk.paymentProbability || 0)),
              escalationRecommended: parsed.insights.risk.escalationRecommended === true,
              detailedAnalysis: parsed.insights.risk.detailedAnalysis || '',
            };
          }

          // Nationality insight
          if (parsed.insights.nationality) {
            nationalityInsight = {
              culturalFactors: Array.isArray(parsed.insights.nationality.culturalFactors)
                ? parsed.insights.nationality.culturalFactors
                : [],
              languageEffectiveness: parsed.insights.nationality.languageEffectiveness || '',
              recommendedAdjustments: parsed.insights.nationality.recommendedAdjustments || '',
            };
          }

          // Outcome insight
          if (parsed.insights.outcome) {
            const outcomeValue = parsed.insights.outcome.categorizedOutcome as CategorizedOutcome;
            outcomeInsight = {
              categorizedOutcome: ['success', 'promise-to-pay', 'refused', 'no-contact', 'callback-needed', 'other'].includes(outcomeValue)
                ? outcomeValue
                : 'other',
              successProbability: Math.min(100, Math.max(0, parsed.insights.outcome.successProbability || 0)),
              keyFactors: Array.isArray(parsed.insights.outcome.keyFactors)
                ? parsed.insights.outcome.keyFactors
                : [],
              reasoning: parsed.insights.outcome.reasoning || '',
            };
          }

          // Borrower insight
          if (parsed.insights.borrower) {
            borrowerInsight = {
              interactionQuality: parsed.insights.borrower.interactionQuality || 'fair',
              relationshipIndicators: Array.isArray(parsed.insights.borrower.relationshipIndicators)
                ? parsed.insights.borrower.relationshipIndicators
                : [],
              futureStrategy: parsed.insights.borrower.futureStrategy || '',
            };
          }
        }

        // Topics and key phrases insight
        if (parsed.insights.topicsAndPhrases) {
          console.log('📋 Found topicsAndPhrases in response:', JSON.stringify(parsed.insights.topicsAndPhrases).slice(0, 200));
          const validSentiments: SentimentLabel[] = ['positive', 'negative', 'neutral'];
          topicsInsight = {
            topics: Array.isArray(parsed.insights.topicsAndPhrases.topics)
              ? parsed.insights.topicsAndPhrases.topics.map(t => ({
                  topicId: t.topicId || '',
                  topicName: t.topicName || '',
                  confidence: Math.min(1, Math.max(0, t.confidence || 0)),
                  sentiment: validSentiments.includes(t.sentiment as SentimentLabel)
                    ? (t.sentiment as SentimentLabel)
                    : 'neutral',
                }))
              : [],
            keyPhrases: Array.isArray(parsed.insights.topicsAndPhrases.keyPhrases)
              ? parsed.insights.topicsAndPhrases.keyPhrases.filter(Boolean)
              : [],
          };
          console.log('✓ Parsed topicsInsight:', JSON.stringify(topicsInsight).slice(0, 200));
        } else {
          console.log('⚠ No topicsAndPhrases found in parsed.insights');
          console.log('📊 Available insight keys:', Object.keys(parsed.insights || {}));
        }

        console.log('✓ Insights generated successfully');
      } else {
        console.log('⚠ No insights generated in response');
      }

      const evaluation: CallEvaluation = {
        id: `eval_${Date.now()}`,
        callId,
        evaluatedAt: new Date().toISOString(),
        totalScore,
        maxScore,
        percentage,
        results: correctedResults, // Use corrected results with enforced scores
        overallFeedback: parsed.overallFeedback || 'Evaluation completed.',
        productInsight,
        riskInsight,
        nationalityInsight,
        outcomeInsight,
        borrowerInsight,
        topicsInsight,
        schemaInsights,  // Add schema-driven insights
      };

      console.log(`✓ Evaluation complete: ${percentage}% (${totalScore}/${maxScore} points)`);
      console.log(`📊 topicsInsight included: ${!!topicsInsight}, keyPhrases count: ${topicsInsight?.keyPhrases?.length || 0}`);
      console.log(`📊 schemaInsights included: ${!!schemaInsights}`);
      
      return evaluation;
    } catch (error) {
      console.error('Error evaluating call:', error);
      throw new Error(
        `Failed to evaluate call: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async batchEvaluate(
    calls: Array<{ transcript: string; metadata: Record<string, any>; schema: SchemaDefinition; callId: string }>
  ): Promise<CallEvaluation[]> {
    const results: CallEvaluation[] = [];

    for (const call of calls) {
      try {
        const evaluation = await this.evaluateCall(
          call.transcript,
          call.metadata,
          call.schema,
          call.callId
        );
        results.push(evaluation);
      } catch (error) {
        console.error(`Failed to evaluate call ${call.callId}:`, error);
      }
    }

    return results;
  }

  private formatTimestamp(ms: number): string {
    const safeMs = Math.max(0, Math.round(ms));
    const totalSeconds = Math.floor(safeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    const centiseconds = Math.floor((safeMs % 1000) / 10)
      .toString()
      .padStart(2, '0');
    return `${minutes}:${seconds}.${centiseconds}`;
  }

  private async buildSentimentPrompt(
    phrases: TranscriptPhrase[],
    locale: string,
    allowedSentiments: SentimentLabel[],
    businessContext: string = 'call center'
  ): Promise<string> {
    if (phrases.length === 0) {
      return 'No conversation available.';
    }

    const MAX_PHRASES = 200;
    const trimmed = phrases.slice(0, MAX_PHRASES);

    const timeline = trimmed
      .map((phrase, index) => {
        const start = phrase.offsetMilliseconds ?? 0;
        const end = start + (phrase.durationMilliseconds ?? 0);
        const speakerLabel =
          typeof phrase.speaker === 'number' ? `speaker ${phrase.speaker}` : 'unknown speaker';
        const channelLabel =
          typeof phrase.channel === 'number' ? `channel ${phrase.channel}` : 'mono';
        const text = phrase.text || phrase.lexical || '';
        return `${index + 1}. [${this.formatTimestamp(start)} - ${this.formatTimestamp(end)} | ${speakerLabel} | ${channelLabel}] ${text}`;
      })
      .join('\n');

    const omittedCount = phrases.length - trimmed.length;
    const omittedSuffix =
      omittedCount > 0 ? `\n...${omittedCount} additional lines omitted for brevity.` : '';

    return await preparePrompt('sentiment-timeline-analysis', {
      locale,
      businessContext,
      allowedSentiments: allowedSentiments.join(', '),
      timeline: timeline + omittedSuffix
    });
  }

  async analyzeSentimentTimeline(
    callId: string,
    phrases: TranscriptPhrase[],
    locale = 'en-US',
    allowedSentiments: SentimentLabel[] = ['positive', 'neutral', 'negative'],
    businessContext: string = 'call center'
  ): Promise<{ segments: CallSentimentSegment[]; summary: string; customerEmotionalArc?: string; agentPerformance?: string; criticalMoments?: string[] }> {
    if (phrases.length === 0) {
      return {
        segments: [],
        summary: 'No conversation available for sentiment analysis.',
      };
    }

    if (!this.llmCaller) {
      throw new Error('Azure OpenAI is not configured. Please configure the service in Settings.');
    }

    console.log(`🔍 Starting sentiment analysis for call ${callId}...`);

    const userPrompt = await this.buildSentimentPrompt(phrases, locale, allowedSentiments, businessContext);
    
    // Debug: Log the prompt being sent
    console.log('🔍 Sentiment analysis prompt length:', userPrompt.length);
    console.log('🔍 Prompt includes "intensity"?', userPrompt.includes('intensity'));
    console.log('🔍 Prompt includes "emotionalTriggers"?', userPrompt.includes('emotionalTriggers'));
    console.log('🔍 Business context:', businessContext);
    
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content:
          'You are an expert call center quality analyst specializing in emotional intelligence. Return valid JSON only using the specified schema and sentiment labels.',
      },
      {
        role: 'user',
        content: userPrompt,
      },
    ];

    const normalizeSentiment = (value: string): SentimentLabel => {
      const normalized = (value || '').toLowerCase();
      if (normalized.includes('neg')) {
        return 'negative';
      }
      if (normalized.includes('pos')) {
        return 'positive';
      }
      return 'neutral';
    };

    const conversationEnd = phrases.reduce((max, phrase) => {
      const start = phrase.offsetMilliseconds ?? 0;
      const end = start + (phrase.durationMilliseconds ?? 0);
      return Math.max(max, end);
    }, 0);

    try {
      const response = await this.llmCaller.callWithJsonValidation<{
        summary?: string;
        customerEmotionalArc?: string;
        agentPerformance?: string;
        criticalMoments?: string[];
        segments?: Array<{
          startMilliseconds?: number;
          endMilliseconds?: number;
          start?: number;
          end?: number;
          speaker?: number | null;
          sentiment?: string;
          intensity?: number;
          confidence?: number;
          summary?: string;
          rationale?: string;
          emotionalTriggers?: string[];
        }>;
      }>(messages, {
        useJsonMode: false,
        maxRetries: 3,
        retryDelay: 1000,
      });

      const { parsed } = response;
      
      // DEBUG: Log what LLM actually returned
      console.log('🔍 LLM Response - parsed.segments:', parsed.segments?.length || 0, 'segments');
      if (parsed.segments && parsed.segments.length > 0) {
        console.log('🔍 First segment from LLM:', JSON.stringify(parsed.segments[0]));
      }
      console.log('🔍 Has customerEmotionalArc?', !!parsed.customerEmotionalArc);
      console.log('🔍 Has agentPerformance?', !!parsed.agentPerformance);
      
      const segments: CallSentimentSegment[] = [];

      if (Array.isArray(parsed.segments)) {
        for (const raw of parsed.segments) {
          const rawStart =
            typeof raw.startMilliseconds === 'number'
              ? raw.startMilliseconds
              : typeof raw.start === 'number'
              ? raw.start
              : 0;
          const rawEnd =
            typeof raw.endMilliseconds === 'number'
              ? raw.endMilliseconds
              : typeof raw.end === 'number'
              ? raw.end
              : rawStart;

          let startMilliseconds = Math.max(0, Math.round(rawStart));
          let endMilliseconds = Math.max(startMilliseconds, Math.round(rawEnd));

          if (endMilliseconds <= startMilliseconds) {
            endMilliseconds = startMilliseconds + 1000; // fallback 1s window
          }

          if (conversationEnd > 0) {
            endMilliseconds = Math.min(endMilliseconds, conversationEnd);
          }

          const confidence =
            typeof raw.confidence === 'number'
              ? Math.min(Math.max(raw.confidence, 0), 1)
              : undefined;

          const intensity =
            typeof raw.intensity === 'number'
              ? Math.min(Math.max(Math.round(raw.intensity), 1), 10)
              : undefined;

          const sentiment = normalizeSentiment(raw.sentiment || 'neutral');

          const segment: CallSentimentSegment = {
            startMilliseconds,
            endMilliseconds,
            speaker:
              typeof raw.speaker === 'number' && Number.isFinite(raw.speaker)
                ? raw.speaker
                : undefined,
            sentiment,
            intensity,
            confidence,
            summary: raw.summary,
            rationale: raw.rationale,
            emotionalTriggers: Array.isArray(raw.emotionalTriggers) ? raw.emotionalTriggers : undefined,
          };

          segments.push(segment);
        }

        segments.sort((a, b) => a.startMilliseconds - b.startMilliseconds);
      }

      const summary =
        parsed.summary && parsed.summary.trim().length > 0
          ? parsed.summary.trim()
          : 'Sentiment analysis completed.';

      console.log(`✓ Sentiment analysis complete: ${segments.length} segments identified`);
      if (parsed.customerEmotionalArc) {
        console.log(`✓ Customer emotional arc: ${parsed.customerEmotionalArc}`);
      }
      if (parsed.agentPerformance) {
        console.log(`✓ Agent performance: ${parsed.agentPerformance}`);
      }

      return {
        segments,
        summary,
        customerEmotionalArc: parsed.customerEmotionalArc,
        agentPerformance: parsed.agentPerformance,
        criticalMoments: parsed.criticalMoments,
      };
    } catch (error) {
      console.error('Error analyzing sentiment timeline:', error);
      throw new Error(
        `Failed to analyze sentiment timeline: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Analyze the overall sentiment of the entire call (second pass for analytics)
   * Returns a single sentiment label for the call as a whole
   */
  async analyzeOverallSentiment(
    callId: string,
    transcript: string,
    metadata: Record<string, any>,
    schema: SchemaDefinition
  ): Promise<SentimentLabel> {
    if (!transcript || transcript.trim().length === 0) {
      return 'neutral';
    }

    if (!this.llmCaller) {
      throw new Error('Azure OpenAI is not configured.');
    }

    console.log(`🔍 Analyzing overall sentiment for call ${callId}...`);

    // Build dynamic metadata section
    const metadataText = schema.fields
      .filter(f => f.useInPrompt !== false)
      .map(field => `- ${field.displayName}: ${metadata[field.id] ?? 'N/A'}`)
      .join('\n');

    const prompt = await preparePrompt('overall-sentiment-analysis', {
      schemaName: schema.name,
      metadataText,
      transcript
    });

    try {
      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: 'You are an expert call center sentiment analyst. Return only the sentiment label.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ];

      const response = await this.llmCaller.call(messages, {
        useJsonMode: false,
        maxRetries: 2,
        retryDelay: 1000,
      });

      const sentiment = response.trim().toLowerCase();
      
      // Normalize to valid sentiment label
      if (sentiment.includes('neg')) return 'negative';
      if (sentiment.includes('pos')) return 'positive';
      return 'neutral';
    } catch (error) {
      console.error('Error analyzing overall sentiment:', error);
      return 'neutral'; // Fallback to neutral on error
    }
  }

  /**
   * Calculate risk tier from days past due
   */
  private calculateRiskTier(daysPastDue: number): RiskTier {
    if (daysPastDue >= 90) return 'Critical';
    if (daysPastDue >= 60) return 'High';
    if (daysPastDue >= 30) return 'Medium';
    return 'Low';
  }

  /**
   * Regenerate insights for calls with optional progress tracking
   * @param calls - Array of call records to regenerate insights for
   * @param mode - 'missing' = only calls without insights, 'all' = all evaluated calls
   * @param onProgress - Optional callback for progress updates (current, total, callId)
   * @returns Updated call records with new insights
   */
  async regenerateInsights(
    calls: Array<{ id: string; transcript?: string; metadata: Record<string, any>; schema: SchemaDefinition; evaluation?: CallEvaluation }>,
    mode: 'missing' | 'all',
    onProgress?: (current: number, total: number, callId: string) => void
  ): Promise<Array<{ id: string; evaluation: CallEvaluation }>> {
    // Filter calls based on mode
    const callsToProcess = calls.filter((call) => {
      // Must have evaluation and transcript
      if (!call.evaluation || !call.transcript) return false;

      if (mode === 'missing') {
        // Only process calls missing any insights
        return !call.evaluation.productInsight ||
               !call.evaluation.riskInsight ||
               !call.evaluation.nationalityInsight ||
               !call.evaluation.outcomeInsight ||
               !call.evaluation.borrowerInsight;
      }

      // Mode === 'all', process all evaluated calls
      return true;
    });

    console.log(`🔄 Regenerating insights for ${callsToProcess.length} calls (mode: ${mode})`);

    const results: Array<{ id: string; evaluation: CallEvaluation }> = [];

    for (let i = 0; i < callsToProcess.length; i++) {
      const call = callsToProcess[i];
      
      try {
        // Report progress
        if (onProgress) {
          onProgress(i + 1, callsToProcess.length, call.id);
        }

        console.log(`[${i + 1}/${callsToProcess.length}] Regenerating insights for call: ${call.id}`);

        // Re-evaluate the call (this will generate new insights)
        const newEvaluation = await this.evaluateCall(
          call.transcript!,
          call.metadata,
          call.schema,
          call.id
        );

        results.push({
          id: call.id,
          evaluation: newEvaluation,
        });

        console.log(`✓ Insights regenerated for ${call.id}`);

      } catch (error) {
        console.error(`✗ Failed to regenerate insights for ${call.id}:`, error);
        // Continue with next call instead of failing entirely
      }
    }

    console.log(`✓ Insights regeneration complete: ${results.length}/${callsToProcess.length} successful`);

    return results;
  }

  /**
   * Generate synthetic metadata records using LLM
   * @param prompt - The generation prompt with schema and instructions
   * @param recordCount - Number of records to generate
   * @returns Object with records array containing generated metadata
   */
  async generateSyntheticData(
    prompt: string,
    recordCount: number
  ): Promise<{ records: Record<string, any>[] }> {
    if (!this.llmCaller) {
      throw new Error('Azure OpenAI is not configured. Please configure the service in Settings.');
    }

    console.log(`🎲 Generating ${recordCount} synthetic records...`);

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are a data generation assistant that creates realistic synthetic data based on schema definitions. Always respond with valid JSON containing a "records" array.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    try {
      const response = await this.llmCaller.callWithJsonValidation<{ records: Record<string, any>[] }>(
        messages,
        {
          useJsonMode: true,
          maxRetries: 3,
          retryDelay: 2000,
        }
      );

      // Validate response structure
      if (!response.parsed || !Array.isArray(response.parsed.records)) {
        console.error('Invalid synthetic data response:', response);
        throw new Error('Invalid response format: expected { records: [...] }');
      }

      console.log(`✓ Generated ${response.parsed.records.length} synthetic records`);
      return response.parsed;
    } catch (error: any) {
      console.error('Synthetic data generation error:', error);
      throw new Error(`Failed to generate synthetic data: ${error.message}`);
    }
  }

  /**
   * Generate a synthetic call transcription using LLM
   * Returns structured data matching the TranscriptionResult format for UI display
   * @param callMetadata - The call metadata to base the transcription on
   * @param schema - The schema definition for context
   * @returns Generated transcription with structured phrases and sentiment
   */
  async generateSyntheticTranscription(
    callMetadata: Record<string, any>,
    schema: SchemaDefinition,
    customInstructions?: string
  ): Promise<{
    transcript: string;
    phrases: TranscriptPhrase[];
    durationMilliseconds: number;
    speakerCount: number;
    locale: string;
    sentimentSegments: CallSentimentSegment[];
    overallSentiment: SentimentLabel;
  }> {
    if (!this.llmCaller) {
      throw new Error('Azure OpenAI is not configured. Please configure the service in Settings.');
    }

    console.log(`📝 Generating synthetic transcription for call...`);

    // Build context about the business and call type
    const businessContext = schema.businessContext || 'call center';
    const callType = callMetadata.callType || callMetadata.call_type || 'general inquiry';
    const outcome = callMetadata.outcome || callMetadata.call_outcome || 'completed';
    const duration = callMetadata.duration || callMetadata.callDuration || '5 minutes';
    
    // Get participant names from schema semantic roles
    const participant1Field = schema.fields.find(f => f.semanticRole === 'participant_1');
    const participant2Field = schema.fields.find(f => f.semanticRole === 'participant_2');
    
    const agentLabel = participant1Field?.participantLabel || 'Agent';
    const customerLabel = participant2Field?.participantLabel || 'Customer';
    const agentName = participant1Field ? (callMetadata[participant1Field.name] || callMetadata[participant1Field.id] || agentLabel) : 'Agent';
    const customerName = participant2Field ? (callMetadata[participant2Field.name] || callMetadata[participant2Field.id] || customerLabel) : 'Customer';
    
    // Extract any other relevant metadata
    const relevantFields = Object.entries(callMetadata)
      .filter(([key, value]) => 
        value !== undefined && 
        value !== null && 
        !['id', 'transcription', 'status', 'evaluation'].includes(key)
      )
      .map(([key, value]) => `- ${key}: ${JSON.stringify(value)}`)
      .join('\n');

    const prompt = `Generate a realistic call center transcription as a JSON array of dialogue turns.

Business Type: ${businessContext}
Call Type: ${callType}
Call Outcome: ${outcome}
Approximate Duration: ${duration}

Participants:
- ${agentLabel}: ${agentName} (speaker 1)
- ${customerLabel}: ${customerName} (speaker 2)

Call Metadata:
${relevantFields}
${customInstructions ? `
Additional Instructions:
${customInstructions}
` : ''}

Generate a JSON object with:
{
  "turns": [
    { "speaker": 1, "text": "Hello, thank you for calling..." },
    { "speaker": 2, "text": "Hi, I'm calling about..." },
    ...
  ]
}

Requirements:
1. speaker 1 = ${agentLabel} (${agentName}), speaker 2 = ${customerLabel} (${customerName})
2. Create 10-20 natural dialogue turns
3. Include appropriate greeting, conversation flow, and closing
4. Make the conversation match the call type and outcome
5. Include realistic acknowledgments and natural language
6. Each turn should be a single speaker's complete statement
7. Make it feel authentic and professional

Return ONLY the JSON object, no other text.`;

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are an expert at creating realistic call center transcriptions. Generate natural, professional conversations as structured JSON. Always respond with valid JSON only.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    try {
      const response = await this.llmCaller.callWithJsonValidation<{ turns: { speaker: number; text: string }[] }>(
        messages,
        {
          useJsonMode: true,
          maxTokens: 2000,
        }
      );

      if (!response.parsed || !Array.isArray(response.parsed.turns)) {
        throw new Error('Invalid response format: expected { turns: [...] }');
      }

      const turns = response.parsed.turns;
      
      // Convert turns to TranscriptPhrase[] with simulated timing
      const averageTurnDuration = 5000; // 5 seconds per turn average
      let currentOffset = 0;
      const phrases: TranscriptPhrase[] = turns.map((turn, index) => {
        // Estimate duration based on text length (roughly 150 words per minute)
        const wordCount = turn.text.split(/\s+/).length;
        const estimatedDuration = Math.max(2000, Math.min(15000, (wordCount / 150) * 60 * 1000));
        
        const phrase: TranscriptPhrase = {
          text: turn.text,
          speaker: turn.speaker,
          offsetMilliseconds: currentOffset,
          durationMilliseconds: estimatedDuration,
          confidence: 0.95 + Math.random() * 0.05, // 95-100% confidence for synthetic
          locale: 'en-US', // Default locale for synthetic
        };
        
        currentOffset += estimatedDuration + 500; // Add 500ms gap between turns
        return phrase;
      });

      // Build full transcript string
      const transcript = turns.map(turn => {
        const speakerName = turn.speaker === 1 ? agentName : customerName;
        return `${speakerName}: ${turn.text}`;
      }).join('\n\n');

      const totalDuration = currentOffset;
      
      // Generate sentiment segments based on conversation content
      const sentimentSegments = this.generateSyntheticSentiment(phrases, totalDuration);
      const overallSentiment = this.calculateOverallSentiment(sentimentSegments);
      
      console.log(`✓ Generated synthetic transcription: ${turns.length} turns, ${totalDuration}ms duration, ${sentimentSegments.length} sentiment segments`);
      
      return {
        transcript,
        phrases,
        durationMilliseconds: totalDuration,
        speakerCount: 2,
        locale: 'en-US',
        sentimentSegments,
        overallSentiment,
      };
    } catch (error: any) {
      console.error('Synthetic transcription generation error:', error);
      throw new Error(`Failed to generate synthetic transcription: ${error.message}`);
    }
  }
  
  /**
   * Generate synthetic sentiment segments based on transcript phrases
   * Uses simple keyword-based sentiment analysis for simulation
   */
  private generateSyntheticSentiment(phrases: TranscriptPhrase[], totalDuration: number): CallSentimentSegment[] {
    const segments: CallSentimentSegment[] = [];
    
    // Positive indicators
    const positiveWords = [
      'thank', 'thanks', 'great', 'excellent', 'perfect', 'wonderful', 'happy', 'pleased',
      'appreciate', 'helpful', 'good', 'yes', 'sure', 'absolutely', 'definitely', 'agree',
      'understand', 'glad', 'nice', 'love', 'amazing', 'fantastic', 'resolved', 'solved'
    ];
    
    // Negative indicators
    const negativeWords = [
      'problem', 'issue', 'sorry', 'unfortunately', 'can\'t', 'cannot', 'won\'t', 'frustrated',
      'angry', 'upset', 'disappointed', 'complaint', 'wrong', 'error', 'fail', 'bad',
      'terrible', 'horrible', 'refuse', 'never', 'hate', 'annoyed', 'difficult', 'impossible'
    ];
    
    // Analyze each phrase
    for (const phrase of phrases) {
      const textLower = phrase.text.toLowerCase();
      
      let positiveScore = 0;
      let negativeScore = 0;
      
      positiveWords.forEach(word => {
        if (textLower.includes(word)) positiveScore++;
      });
      
      negativeWords.forEach(word => {
        if (textLower.includes(word)) negativeScore++;
      });
      
      // Determine sentiment
      let sentiment: SentimentLabel;
      if (positiveScore > negativeScore) {
        sentiment = 'positive';
      } else if (negativeScore > positiveScore) {
        sentiment = 'negative';
      } else {
        sentiment = 'neutral';
      }
      
      // Create segment
      segments.push({
        startMilliseconds: phrase.offsetMilliseconds,
        endMilliseconds: phrase.offsetMilliseconds + phrase.durationMilliseconds,
        speaker: phrase.speaker,
        sentiment,
        confidence: 0.85 + Math.random() * 0.15, // 85-100% confidence
      });
    }
    
    return segments;
  }
  
  /**
   * Calculate overall sentiment from segments
   */
  private calculateOverallSentiment(segments: CallSentimentSegment[]): SentimentLabel {
    if (segments.length === 0) return 'neutral';
    
    const counts = { positive: 0, neutral: 0, negative: 0 };
    segments.forEach(s => counts[s.sentiment]++);
    
    // Weight: positive counts more if it's the majority
    if (counts.positive > counts.negative && counts.positive >= counts.neutral) {
      return 'positive';
    } else if (counts.negative > counts.positive && counts.negative > counts.neutral) {
      return 'negative';
    }
    return 'neutral';
  }

  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.endpoint) {
      errors.push('Azure OpenAI endpoint is required');
    }

    if (!this.config.apiKey) {
      errors.push('Azure OpenAI API key is required');
    }

    if (!this.config.deploymentName) {
      errors.push('Deployment name is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const azureOpenAIService = new AzureOpenAIService();

/**
 * Standalone function to regenerate insights for call records
 * Wraps the azureOpenAIService.regenerateInsights method for easier imports
 */
export async function regenerateInsights(
  calls: CallRecord[],
  schema: SchemaDefinition,
  mode: 'missing' | 'all',
  onProgress?: (current: number, total: number, callId: string) => void
): Promise<CallRecord[]> {
  // Transform calls to include schema
  const callsWithSchema = calls.map((call) => ({
    ...call,
    schema,
  }));

  const results = await azureOpenAIService.regenerateInsights(callsWithSchema, mode, onProgress);
  
  // Merge results back into original calls array
  const updatedCalls = calls.map((call) => {
    const result = results.find((r) => r.id === call.id);
    if (result) {
      return { ...call, evaluation: result.evaluation };
    }
    return call;
  });

  return updatedCalls;
}
