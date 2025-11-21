export interface AzureSpeechConfig {
  region: string;
  subscriptionKey: string;
  apiVersion?: string; // Default: '2025-10-15' (latest GA)
  selectedLanguages?: string[]; // Array of locale codes for transcription
  diarizationEnabled?: boolean;
  minSpeakers?: number;
  maxSpeakers?: number;
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
  confidence?: number;
  summary?: string;
  rationale?: string;
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

export interface CallEvaluation {
  id: string;
  callId: string;
  evaluatedAt: string;
  totalScore: number;
  maxScore: number;
  percentage: number;
  results: EvaluationResult[];
  overallFeedback: string;
}

export interface CallRecord {
  id: string;
  metadata: CallMetadata;
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
  status: 'uploaded' | 'processing' | 'transcribed' | 'evaluated' | 'failed';
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
}

export interface CriteriaAnalytics {
  criterionId: number;
  totalEvaluations: number;
  passRate: number;
  averageScore: number;
  commonIssues: string[];
}
