export type AzureAuthType = 'apiKey' | 'entraId' | 'managedIdentity';

export interface AzureSpeechConfig {
  region: string;
  subscriptionKey: string;
  apiVersion?: string; // Default: '2025-10-15' (latest GA)
  selectedLanguages?: string[]; // Array of locale codes for transcription
  diarizationEnabled?: boolean;
  minSpeakers?: number;
  maxSpeakers?: number;
  /** Authentication method: 'apiKey' (default), 'entraId' for Azure AD, 'managedIdentity' for Container App */
  authType?: AzureAuthType;
  /** Azure AD tenant ID (required when authType is 'entraId') */
  tenantId?: string;
  /** Pre-fetched access token for Entra ID auth (optional, will be fetched if not provided) */
  accessToken?: string;
}

export interface WordTiming {
  word: string;
  offsetMilliseconds: number;
  durationMilliseconds: number;
  confidence?: number;
}

export interface TranscriptPhrase {
  text: string;
  lexical?: string;
  speaker?: number;
  channel?: number;
  offsetMilliseconds: number;
  durationMilliseconds: number;
  confidence?: number;
  words?: WordTiming[];
  locale?: string;
}

export type SentimentLabel = 'positive' | 'neutral' | 'negative';

export interface CallSentimentSegment {
  startMilliseconds: number;
  endMilliseconds: number;
  speaker?: number;
  sentiment: SentimentLabel;
  intensity?: number; // 1-10 scale
  confidence?: number;
  summary?: string;
  rationale?: string;
  emotionalTriggers?: string[]; // Key phrases/words that drove this sentiment
}

export interface TranscriptionResult {
  transcript: string;
  confidence: number;
  words?: WordTiming[];
  phrases?: TranscriptPhrase[];
  locale?: string;
  durationMilliseconds?: number;
  speakerCount?: number;
}

export interface CallMetadata {
  time?: string;
  billId?: string;
  orderId?: string;
  userId?: string;
  fileTag?: string;
  audioUrl?: string; // Azure Blob Storage URL from fileTag
  agentName: string;
  product: string;
  customerType?: string;
  borrowerName: string;
  nationality: string;
  daysPastDue: number;
  dueAmount: number;
  followUpStatus: string;
}

export interface EvaluationCriterion {
  id: number;
  type: 'Must Do' | 'Must Not Do';
  name: string;
  definition: string;
  evaluationCriteria: string;
  scoringStandard: {
    passed: number;
    failed: number;
    partial?: number;
  };
  examples: string[];
}

export interface EvaluationResult {
  criterionId: number;
  score: number;
  passed: boolean;
  evidence: string;
  reasoning: string;
}

export type CategorizedOutcome = 'success' | 'promise-to-pay' | 'refused' | 'no-contact' | 'callback-needed' | 'other';

export type RiskTier = 'Low' | 'Medium' | 'High' | 'Critical';

export interface ProductInsight {
  productType: string;
  performanceFactors: string[];
  recommendedApproach: string;
}

export interface RiskInsight {
  riskTier: RiskTier;
  riskScore: number;
  paymentProbability: number;
  escalationRecommended: boolean;
  detailedAnalysis: string;
}

export interface NationalityInsight {
  culturalFactors: string[];
  languageEffectiveness: string;
  recommendedAdjustments: string;
}

export interface OutcomeInsight {
  categorizedOutcome: CategorizedOutcome;
  successProbability: number;
  keyFactors: string[];
  reasoning: string;
}

export interface BorrowerInsight {
  interactionQuality: string;
  relationshipIndicators: string[];
  futureStrategy: string;
}

/**
 * Topic classification insight for a call
 */
export interface TopicInsight {
  topicId: string;                 // Reference to TopicDefinition.id
  topicName: string;               // Topic name (denormalized for display)
  confidence: number;              // 0-1 confidence score
  sentiment: SentimentLabel;       // Sentiment for this topic in this call
}

/**
 * Topics and key phrases extracted from call
 */
export interface TopicsAndPhrasesInsight {
  topics: TopicInsight[];          // Multiple topics per call allowed
  keyPhrases: string[];            // Important phrases from the conversation
}

export interface CallEvaluation {
  id: string;
  callId: string;
  evaluatedAt: string;
  totalScore: number;
  maxScore: number;
  percentage: number;
  results: EvaluationResult[];
  overallFeedback: string;
  productInsight?: ProductInsight;
  riskInsight?: RiskInsight;
  nationalityInsight?: NationalityInsight;
  outcomeInsight?: OutcomeInsight;
  borrowerInsight?: BorrowerInsight;
  topicsInsight?: TopicsAndPhrasesInsight;  // Topics and key phrases
  schemaInsights?: Record<string, Record<string, any>>;  // Dynamic insights keyed by category ID
}

export interface CallRecord {
  id: string;
  schemaId: string; // Schema identifier this call belongs to
  schemaVersion: string; // Schema version (e.g., "1.0.0")
  metadata: Record<string, any>; // Dynamic metadata based on active schema
  audioFile?: File | Blob;
  audioUrl?: string; // URL for fetching audio
  transcript?: string;
  transcriptConfidence?: number;
  transcriptWords?: WordTiming[];
  transcriptLocale?: string;
  transcriptDuration?: number;
  transcriptPhrases?: TranscriptPhrase[];
  transcriptSpeakerCount?: number;
  transcriptionId?: string; // Azure Speech transcription job ID
  evaluation?: CallEvaluation;
  sentimentSegments?: CallSentimentSegment[];
  sentimentSummary?: string;
  overallSentiment?: SentimentLabel; // Overall sentiment for the entire call (for analytics)
  status: 'pending audio' | 'uploaded' | 'processing' | 'transcribed' | 'evaluated' | 'failed';
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentPerformance {
  agentName: string;
  totalCalls: number;
  averageScore: number;
  averagePercentage: number;
  criteriaScores: Record<number, number>;
  trend: 'up' | 'down' | 'stable';
  topStrengths: number[];
  topWeaknesses: number[];
  sentimentDistribution?: Record<SentimentLabel, number>;
  dominantSentiment?: SentimentLabel;
  
  // Enhanced metrics
  avgCallDuration?: number;           // Average call duration in ms
  totalCallDuration?: number;         // Total time spent on calls
  passRate?: number;                  // Percentage of criteria passed
  perfectScoreCalls?: number;         // Calls with 100% score
  failedCalls?: number;               // Calls below threshold (e.g., <60%)
  
  // Topic/Category performance
  topTopics?: Array<{ topic: string; count: number; avgScore: number }>;
  
  // AI Insights aggregation (from schemaInsights)
  insightSummary?: Record<string, {
    categoryName: string;
    avgNumericValue?: number;
    mostCommonValue?: string;
    distribution?: Record<string, number>;
  }>;
  
  // Time-based analysis
  performanceByPeriod?: Array<{
    period: string;
    avgScore: number;
    callCount: number;
  }>;
  
  // Comparison metrics
  rankAmongAgents?: number;           // Rank (1 = best)
  percentileRank?: number;            // Percentile (0-100)
  aboveAverage?: boolean;             // Above team average?
  
  // Consistency metrics
  scoreStdDev?: number;               // Standard deviation of scores
  consistencyRating?: 'consistent' | 'variable' | 'inconsistent';
  
  // Recent performance
  recentCalls?: Array<{
    callId: string;
    score: number;
    date: string;
  }>;
}

export interface CriteriaAnalytics {
  criterionId: number;
  totalEvaluations: number;
  passRate: number;
  averageScore: number;
  commonIssues: string[];
}
