import { CallMetadata, CallEvaluation, EvaluationResult, EvaluationCriterion, TranscriptPhrase, CallSentimentSegment, SentimentLabel, ProductInsight, RiskInsight, NationalityInsight, OutcomeInsight, BorrowerInsight, RiskTier, CategorizedOutcome, CallRecord } from '@/types/call';
import { EVALUATION_CRITERIA, getMaxScore } from '@/lib/evaluation-criteria';
import type { AzureOpenAIConfig } from '@/configManager';
import { LLMCaller, ChatMessage, LLMCallOptions } from '../llmCaller';

// Global rules cache - can be updated by UI
let CUSTOM_EVALUATION_CRITERIA: EvaluationCriterion[] | null = null;

export function setCustomEvaluationCriteria(criteria: EvaluationCriterion[] | null): void {
  CUSTOM_EVALUATION_CRITERIA = criteria;
}

export function getActiveEvaluationCriteria(): EvaluationCriterion[] {
  return CUSTOM_EVALUATION_CRITERIA || EVALUATION_CRITERIA;
}

/**
 * Simple ConfigManager adapter for browser environment
 * Bridges AzureOpenAIConfig with ConfigManager interface expected by LLMCaller
 */
class BrowserConfigManager {
  constructor(private config: AzureOpenAIConfig) {
    console.log('📦 BrowserConfigManager created with reasoningEffort:', config.reasoningEffort);
  }

  async getConfig(): Promise<AzureOpenAIConfig | null> {
    console.log('📖 BrowserConfigManager.getConfig() returning reasoningEffort:', this.config.reasoningEffort);
    return this.config;
  }

  async getEntraIdToken(_tenantId?: string): Promise<string | null> {
    // In browser environment, Entra ID auth would require different implementation
    // For now, we only support API key authentication
    throw new Error('Entra ID authentication not supported in browser environment');
  }

  getMaxRetries(): number {
    return 3; // Default retry count
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
   * Build evaluation prompt with criteria and insights generation
   */
  private buildEvaluationPrompt(transcript: string, metadata: CallMetadata): string {
    const activeCriteria = getActiveEvaluationCriteria();
    const criteriaText = activeCriteria.map((criterion) => {
      return `${criterion.id}. ${criterion.name} [${criterion.type}]
   Definition: ${criterion.definition}
   Evaluation: ${criterion.evaluationCriteria}
   Scoring: ${criterion.scoringStandard.passed} points if passed, ${criterion.scoringStandard.failed} if failed${criterion.scoringStandard.partial ? `, ${criterion.scoringStandard.partial} if partially met` : ''}
   Examples: ${criterion.examples.join(' | ')}`;
    }).join('\n\n');

    return `You are an expert call center quality assurance evaluator. Analyze the following call transcript and evaluate it against the ${activeCriteria.length} quality criteria below. Additionally, generate detailed analytical insights for business intelligence.

**IMPORTANT: You MUST provide ALL responses, insights, analysis, reasoning, feedback, and recommendations in ENGLISH language only, regardless of the language used in the transcript.**

CALL METADATA:
- Agent Name: ${metadata.agentName}
- Product: ${metadata.product}
- Customer Type: ${metadata.customerType || 'N/A'}
- Borrower Name: ${metadata.borrowerName}
- Nationality: ${metadata.nationality}
- Days Past Due: ${metadata.daysPastDue}
- Due Amount: $${metadata.dueAmount}
- Follow-up Status: ${metadata.followUpStatus}

TRANSCRIPT:
${transcript}

EVALUATION CRITERIA:
${criteriaText}

For each criterion, provide:
1. criterionId (number 1-${activeCriteria.length})
2. score (exactly 0, 5, or 10 based on the scoring standard)
3. passed (true if score >= 10, false otherwise)
4. evidence (exact quote from transcript if found, or "Not found" if missing)
5. reasoning (brief explanation IN ENGLISH of why this score was given)

Also provide an overallFeedback string (2-3 sentences IN ENGLISH) highlighting key strengths and areas for improvement.

IMPORTANT: Additionally, generate detailed analytical insights IN ENGLISH based on the call metadata and transcript:

1. PRODUCT INSIGHT (ALL IN ENGLISH, use markdown with **bold** for key points):
   - Analyze how the product type (${metadata.product}) affects the call dynamics
   - Identify 2-3 specific performance factors related to this product
   - Recommend specific collection approach for this product type (use **bold** for critical action items)

2. RISK INSIGHT (ALL IN ENGLISH, use markdown with **bold** for critical findings):
   - Calculate risk tier based on Days Past Due: 0-30=Low, 31-60=Medium, 61-90=High, 90+=Critical
   - Assign risk score (0-100) considering DPD (${metadata.daysPastDue}), amount ($${metadata.dueAmount}), sentiment, and evaluation performance
   - Calculate payment probability percentage (0-100) based on all factors
   - Determine if escalation is recommended (boolean)
   - Provide detailed analysis IN ENGLISH explaining the risk assessment and payment likelihood (use **bold** for warnings or critical metrics)

3. NATIONALITY INSIGHT (ALL IN ENGLISH, use markdown with **bold** for key recommendations):
   - Identify 2-3 cultural factors affecting communication with ${metadata.nationality} customers
   - Assess language effectiveness (rate agent's communication clarity and cultural awareness)
   - Recommend specific adjustments IN ENGLISH for better engagement with this demographic (use **bold** for most important adjustments)

4. OUTCOME INSIGHT (ALL IN ENGLISH, use markdown with **bold** for key factors):
   - Categorize the follow-up status "${metadata.followUpStatus}" into one of: "success", "promise-to-pay", "refused", "no-contact", "callback-needed", or "other"
   - Calculate success probability percentage (0-100) for positive resolution
   - Identify 2-3 key factors that influenced this outcome
   - Provide reasoning IN ENGLISH for the outcome classification and probability (use **bold** for most impactful factors)

5. BORROWER INSIGHT (ALL IN ENGLISH, use markdown with **bold** for critical strategies):
   - Rate interaction quality (excellent/good/fair/poor) based on borrower engagement and agent rapport
   - Identify 2-3 relationship indicators (positive or negative signals about future interactions)
   - Recommend future strategy IN ENGLISH for handling this borrower (use **bold** for highest priority actions)

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
    "product": {
      "productType": "${metadata.product}",
      "performanceFactors": ["factor 1", "factor 2"],
      "recommendedApproach": "detailed approach description"
    },
    "risk": {
      "riskTier": "Low" | "Medium" | "High" | "Critical",
      "riskScore": 0-100,
      "paymentProbability": 0-100,
      "escalationRecommended": true | false,
      "detailedAnalysis": "comprehensive risk analysis with reasoning"
    },
    "nationality": {
      "culturalFactors": ["factor 1", "factor 2"],
      "languageEffectiveness": "assessment of communication effectiveness",
      "recommendedAdjustments": "specific recommendations"
    },
    "outcome": {
      "categorizedOutcome": "success" | "promise-to-pay" | "refused" | "no-contact" | "callback-needed" | "other",
      "successProbability": 0-100,
      "keyFactors": ["factor 1", "factor 2"],
      "reasoning": "explanation for categorization"
    },
    "borrower": {
      "interactionQuality": "excellent" | "good" | "fair" | "poor",
      "relationshipIndicators": ["indicator 1", "indicator 2"],
      "futureStrategy": "recommended approach for future calls"
    }
  }
}

Be thorough, fair, and specific in your evaluation. Quote exact phrases when possible. Provide detailed, actionable insights IN ENGLISH LANGUAGE ONLY for all five insight categories. All text fields (reasoning, evidence, feedback, analysis, recommendations, summaries) MUST be written in English.`;
  }

  /**
   * Evaluate a call transcript against quality criteria with retry logic
   * 
   * @param transcript - The call transcript text
   * @param metadata - Call metadata (agent, product, borrower info, etc.)
   * @param callId - Unique identifier for this call
   * @returns CallEvaluation with validated structure
   */
  async evaluateCall(
    transcript: string,
    metadata: CallMetadata,
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
        content: 'You are an expert call center quality assurance evaluator. You must return valid JSON only.',
      },
      {
        role: 'user',
        content: this.buildEvaluationPrompt(transcript, metadata),
      },
    ];

    try {
      // Use LLMCaller's JSON validation with retry logic
      // Do NOT use structuredOutputSchema - Azure Responses API doesn't support it the same way
      const response = await this.llmCaller.callWithJsonValidation<{
        results: EvaluationResult[];
        overallFeedback: string;
        insights?: {
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

      // Calculate totals using active criteria
      const activeCriteria = getActiveEvaluationCriteria();

      if (parsed.results.length !== activeCriteria.length) {
        console.warn(`⚠ Expected ${activeCriteria.length} results, got ${parsed.results.length}`);
      }

      // Validate each result has required fields
      for (const result of parsed.results) {
        if (!result.criterionId || result.score === undefined || result.passed === undefined) {
          throw new Error(`Invalid result structure: ${JSON.stringify(result)}`);
        }
      }
      const totalScore = parsed.results.reduce((sum, r) => sum + r.score, 0);
      const maxScore = activeCriteria.reduce((sum, c) => sum + c.scoringStandard.passed, 0);
      const percentage = Math.round((totalScore / maxScore) * 100);

      // Parse and validate insights if present
      let productInsight: ProductInsight | undefined;
      let riskInsight: RiskInsight | undefined;
      let nationalityInsight: NationalityInsight | undefined;
      let outcomeInsight: OutcomeInsight | undefined;
      let borrowerInsight: BorrowerInsight | undefined;

      if (parsed.insights) {
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
        results: parsed.results,
        overallFeedback: parsed.overallFeedback || 'Evaluation completed.',
        productInsight,
        riskInsight,
        nationalityInsight,
        outcomeInsight,
        borrowerInsight,
      };

      console.log(`✓ Evaluation complete: ${percentage}% (${totalScore}/${maxScore} points)`);
      
      return evaluation;
    } catch (error) {
      console.error('Error evaluating call:', error);
      throw new Error(
        `Failed to evaluate call: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async batchEvaluate(
    calls: Array<{ transcript: string; metadata: CallMetadata; callId: string }>
  ): Promise<CallEvaluation[]> {
    const results: CallEvaluation[] = [];

    for (const call of calls) {
      try {
        const evaluation = await this.evaluateCall(
          call.transcript,
          call.metadata,
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

  private buildSentimentPrompt(
    phrases: TranscriptPhrase[],
    locale: string,
    allowedSentiments: SentimentLabel[]
  ): string {
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

    return `You are a senior contact-center sentiment analyst. Given the conversation below (language ${locale}), identify contiguous segments where sentiment is consistent. Use only the following discrete labels: ${allowedSentiments.join(
      ', '
    )}. Keep the number of segments reasonable (no more than 12).

**IMPORTANT: All summary, rationale, and text fields MUST be written in ENGLISH language only.**

Return strict JSON with the shape:
{
  "summary": "short overview highlighting key mood shifts",
  "segments": [
    {
      "startMilliseconds": number,
      "endMilliseconds": number,
      "speaker": number | null,
      "sentiment": "positive" | "neutral" | "negative",
      "confidence": number (0-1),
      "summary": "one sentence",
      "rationale": "brief explanation"
    }
  ]
}
- start/end are inclusive-exclusive millisecond offsets.
- Merge consecutive sentences with similar mood.
- Do not overlap segments.
- If unsure, use "neutral" with low confidence.
- ALL text output (summary, rationale) MUST be in English.

Conversation timeline:\n${timeline}${omittedSuffix}

Analyze carefully and ensure the returned JSON is valid. Remember: ALL TEXT IN ENGLISH.`;
  }

  async analyzeSentimentTimeline(
    callId: string,
    phrases: TranscriptPhrase[],
    locale = 'en-US',
    allowedSentiments: SentimentLabel[] = ['positive', 'neutral', 'negative']
  ): Promise<{ segments: CallSentimentSegment[]; summary: string }> {
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

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content:
          'You are an experienced contact-center sentiment analyst. Return valid JSON only using the specified schema and sentiment labels.',
      },
      {
        role: 'user',
        content: this.buildSentimentPrompt(phrases, locale, allowedSentiments),
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
        segments?: Array<{
          startMilliseconds?: number;
          endMilliseconds?: number;
          start?: number;
          end?: number;
          speaker?: number | null;
          sentiment?: string;
          confidence?: number;
          summary?: string;
          rationale?: string;
        }>;
      }>(messages, {
        useJsonMode: false,
        maxRetries: 3,
        retryDelay: 1000,
      });

      const { parsed } = response;
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

          const sentiment = normalizeSentiment(raw.sentiment || 'neutral');

          const segment: CallSentimentSegment = {
            startMilliseconds,
            endMilliseconds,
            speaker:
              typeof raw.speaker === 'number' && Number.isFinite(raw.speaker)
                ? raw.speaker
                : undefined,
            sentiment,
            confidence,
            summary: raw.summary,
            rationale: raw.rationale,
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

      return {
        segments,
        summary,
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
    metadata: CallMetadata
  ): Promise<SentimentLabel> {
    if (!transcript || transcript.trim().length === 0) {
      return 'neutral';
    }

    if (!this.llmCaller) {
      throw new Error('Azure OpenAI is not configured.');
    }

    console.log(`🔍 Analyzing overall sentiment for call ${callId}...`);

    const prompt = `You are an expert call center sentiment analyst. Analyze the overall sentiment of this entire call conversation.

**IMPORTANT: Your response must be in ENGLISH language only.**

CALL METADATA:
- Agent Name: ${metadata.agentName}
- Product: ${metadata.product}
- Borrower Name: ${metadata.borrowerName}
- Days Past Due: ${metadata.daysPastDue}
- Due Amount: ${metadata.dueAmount}

TRANSCRIPT:
${transcript}

Based on the complete conversation, classify the OVERALL sentiment of this call as one of:
- positive: The call went well, customer was satisfied, issues resolved positively
- neutral: The call was routine, professional, no strong emotions
- negative: The call was tense, customer was unhappy, unresolved complaints

Return ONLY a single word: positive, neutral, or negative`;

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
    calls: Array<{ id: string; transcript?: string; metadata: CallMetadata; evaluation?: CallEvaluation }>,
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
  mode: 'missing' | 'all',
  onProgress?: (current: number, total: number, callId: string) => void
): Promise<CallRecord[]> {
  const results = await azureOpenAIService.regenerateInsights(calls, mode, onProgress);
  
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
