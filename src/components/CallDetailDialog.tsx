import { useState, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CallRecord } from '@/types/call';
import { SchemaDefinition } from '@/types/schema';
import { AzureServicesConfig } from '@/types/config';
import { azureOpenAIService, getActiveEvaluationCriteria, getEvaluationCriteriaForSchema } from '@/services/azure-openai';
import { STTCaller } from '../STTCaller';
import { DynamicDetailView, DynamicDetailSummary } from '@/components/DynamicDetailView';
import { toast } from 'sonner';
import { CheckCircle, XCircle, MinusCircle, Sparkle, Microphone, SpeakerHigh } from '@phosphor-icons/react';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import { CallSentimentPlayer } from '@/components/call-player/CallSentimentPlayer';
import { TranscriptConversation } from '@/components/TranscriptConversation';
import { DynamicInsightGrid } from '@/components/DynamicInsightCard';
import { DEFAULT_CALL_CENTER_LANGUAGES } from '@/lib/speech-languages';
import { generateSyntheticAudio, SyntheticAudioProgress } from '@/services/synthetic-audio';
import { LLMCaller } from '@/llmCaller';
import { BrowserConfigManager } from '@/services/browser-config-manager';
import { storeAudioFile } from '@/lib/audio-storage';

interface CallDetailDialogProps {
  call: CallRecord;
  schema: SchemaDefinition;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (call: CallRecord) => void;
}

export function CallDetailDialog({
  call,
  schema,
  open,
  onOpenChange,
  onUpdate,
}: CallDetailDialogProps) {
  const [config] = useLocalStorage<AzureServicesConfig>('azure-services-config', {
    openAI: { endpoint: '', apiKey: '', deploymentName: '', apiVersion: '2024-12-01-preview' },
    speech: { region: '', subscriptionKey: '', apiVersion: '2025-10-15', selectedLanguages: [] },
  });
  
  const [transcribing, setTranscribing] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [analyzingSentiment, setAnalyzingSentiment] = useState(false);
  const [audioGenerationProgress, setAudioGenerationProgress] = useState<SyntheticAudioProgress | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | undefined>(undefined);

  const isProcessing = call.status === 'processing' || transcribing;

  // Create blob URL for audio file
  useEffect(() => {
    if (call.audioFile && call.audioFile instanceof Blob) {
      const url = URL.createObjectURL(call.audioFile);
      setAudioUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (call.metadata?.audioUrl) {
      setAudioUrl(call.metadata.audioUrl);
    }
  }, [call.audioFile, call.metadata?.audioUrl]);

  const handleTranscribe = async () => {
    if (!call.audioFile) {
      toast.error('No audio file available for transcription');
      return;
    }

    if (!config?.speech.region || !config?.speech.subscriptionKey) {
      toast.error('Azure Speech service not configured. Please configure in Settings.');
      return;
    }

    setTranscribing(true);
    
    // Update status to transcribing
    onUpdate({
      ...call,
      status: 'processing',
      updatedAt: new Date().toISOString(),
    });

    try {
      // Get selected languages from config first
      const selectedLanguages = config?.speech?.selectedLanguages !== undefined
        ? config.speech.selectedLanguages
        : DEFAULT_CALL_CENTER_LANGUAGES;
      
      console.log(`🌍 Config has selectedLanguages:`, config?.speech?.selectedLanguages);
      console.log(`🌍 Will use these languages:`, selectedLanguages);

      const sttCaller = new STTCaller({
        region: config.speech.region,
        subscriptionKey: config.speech.subscriptionKey,
        apiVersion: config.speech.apiVersion,
        selectedLanguages: selectedLanguages, // ✅ PASS IT TO STTCaller!
      });

      // Convert audio file to File object if needed
      let audioBlob: File | Blob;
      if (typeof call.audioFile === 'string') {
        // If it's a URL or path, we'd need to fetch it
        // For now, throw an error
        throw new Error('Audio file must be a File object');
      } else {
        audioBlob = call.audioFile;
      }

      toast.info('Transcribing audio... This may take a few moments.');
      
      const result = await sttCaller.transcribeAudioFile(audioBlob, {
        // Languages are already set in STTCaller config above
        candidateLocales: selectedLanguages,
        wordLevelTimestampsEnabled: true,
        diarizationEnabled: config.speech.diarizationEnabled ?? false,
        minSpeakers: config.speech.minSpeakers ?? 1,
        maxSpeakers: config.speech.maxSpeakers ?? 2,
      });

      let sentimentSegments = call.sentimentSegments;
      let sentimentSummary = call.sentimentSummary;
      let overallSentiment = call.overallSentiment;
      
      // Attempt sentiment analysis if we have phrases and Azure OpenAI is configured
      if (result.phrases && result.phrases.length > 0) {
        // Ensure Azure OpenAI service has the latest config
        if (config?.openAI.endpoint && config?.openAI.apiKey && config?.openAI.deploymentName) {
          azureOpenAIService.updateConfig({
            endpoint: config.openAI.endpoint,
            apiKey: config.openAI.apiKey,
            deploymentName: config.openAI.deploymentName,
            apiVersion: config.openAI.apiVersion,
          });
        }
        
        const configValidation = azureOpenAIService.validateConfig();
        if (configValidation.valid) {
          try {
            toast.info('Analyzing sentiment...');
            const businessContext = schema.businessContext || schema.name || 'call center';
            const sentiment = await azureOpenAIService.analyzeSentimentTimeline(
              call.id,
              result.phrases,
              result.locale || 'en-US',
              ['positive', 'neutral', 'negative'],
              businessContext
            );
            sentimentSegments = sentiment.segments;
            sentimentSummary = sentiment.summary;
            
            // Second pass: Analyze overall sentiment for analytics
            if (result.transcript && result.transcript.trim().length > 0) {
              overallSentiment = await azureOpenAIService.analyzeOverallSentiment(
                call.id,
                result.transcript,
                call.metadata,
                schema
              );
            }
            
            toast.success('Sentiment analysis complete!');
          } catch (error) {
            console.error('Sentiment analysis failed:', error);
            toast.warning('Sentiment analysis failed. Check Azure OpenAI configuration.');
          }
        } else {
          console.log('Azure OpenAI not configured, skipping sentiment analysis');
          toast.info('Sentiment analysis skipped. Configure Azure OpenAI in Settings to enable.');
        }
      }

      const updatedCall: CallRecord = {
        ...call,
        transcript: result.transcript,
        transcriptConfidence: result.confidence,
        transcriptWords: result.words,
        transcriptLocale: result.locale,
        transcriptDuration: result.durationMilliseconds,
        transcriptPhrases: result.phrases,
        transcriptSpeakerCount: result.speakerCount,
        sentimentSegments,
        sentimentSummary,
        overallSentiment,
        status: 'transcribed',
        updatedAt: new Date().toISOString(),
      };

      onUpdate(updatedCall);
      
      const detectedLanguages = result.phrases
        ? [...new Set(result.phrases.map(p => p.locale).filter(Boolean))]
        : [];

      toast.success(
        detectedLanguages.length > 1
          ? `Transcription complete! ${detectedLanguages.length} languages detected • Confidence: ${(result.confidence * 100).toFixed(1)}%`
          : `Transcription complete! Language: ${result.locale || 'Unknown'} • Confidence: ${(result.confidence * 100).toFixed(1)}%`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Transcription failed: ${errorMessage}`);
      
      onUpdate({
        ...call,
        status: 'failed',
        error: errorMessage,
        updatedAt: new Date().toISOString(),
      });
    } finally {
      setTranscribing(false);
    }
  };

  const handleEvaluate = async () => {
    if (!call.transcript) {
      toast.error('No transcript available for evaluation');
      return;
    }

    if (!config?.openAI.endpoint || !config?.openAI.apiKey) {
      toast.error('Azure OpenAI not configured. Please configure in Settings.');
      return;
    }

    setEvaluating(true);
    try {
      // Update service configuration
      azureOpenAIService.updateConfig({
        endpoint: config.openAI.endpoint,
        apiKey: config.openAI.apiKey,
        deploymentName: config.openAI.deploymentName,
        apiVersion: config.openAI.apiVersion,
      });

      const evaluation = await azureOpenAIService.evaluateCall(
        call.transcript,
        call.metadata,
        schema,
        call.id
      );

      let sentimentSegments = call.sentimentSegments;
      let sentimentSummary = call.sentimentSummary;
      let overallSentiment = call.overallSentiment;

      // Always run sentiment analysis if we have transcript phrases (to get updated analysis with new prompts)
      if (call.transcriptPhrases && call.transcriptPhrases.length > 0) {
        try {
          toast.info('Analyzing sentiment...');
          const businessContext = schema.businessContext || schema.name || 'call center';
          const sentiment = await azureOpenAIService.analyzeSentimentTimeline(
            call.id,
            call.transcriptPhrases,
            call.transcriptLocale || 'en-US',
            ['positive', 'neutral', 'negative'],
            businessContext
          );
          sentimentSegments = sentiment.segments;
          sentimentSummary = sentiment.summary;

          // Also analyze overall sentiment for analytics
          overallSentiment = await azureOpenAIService.analyzeOverallSentiment(
            call.id,
            call.transcript,
            call.metadata,
            schema
          );
          
          console.log('✓ Sentiment analysis completed during evaluation');
        } catch (error) {
          console.warn('Sentiment analysis failed during evaluation:', error);
          toast.warning('Sentiment analysis failed, but evaluation completed');
          // Don't fail the whole evaluation if sentiment fails
        }
      }

      const updatedCall: CallRecord = {
        ...call,
        evaluation,
        sentimentSegments,
        sentimentSummary,
        overallSentiment,
        status: 'evaluated',
        updatedAt: new Date().toISOString(),
      };

      onUpdate(updatedCall);
      toast.success(sentimentSegments ? 'Call evaluated with sentiment analysis!' : 'Call evaluated successfully!');
    } catch (error) {
      toast.error(
        `Evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setEvaluating(false);
    }
  };

  const handleGenerateSyntheticAudio = async () => {
    if (!call.transcriptPhrases || call.transcriptPhrases.length === 0) {
      toast.error('No transcript available. Please transcribe the call first.');
      return;
    }

    if (!config?.speech?.region || !config?.speech?.subscriptionKey) {
      toast.error('Azure Speech credentials not configured. Please configure in Settings.');
      return;
    }

    if (!config?.openAI?.endpoint || !config?.openAI?.apiKey) {
      toast.error('Azure OpenAI not configured. Needed for gender detection from names.');
      return;
    }

    if (config.tts?.enabled === false) {
      toast.error('Synthetic audio generation is disabled. Enable it in Configuration.');
      return;
    }

    setGeneratingAudio(true);
    setAudioGenerationProgress(null);

    try {
      // Create LLM caller for gender detection using shared BrowserConfigManager
      const llmCaller = new LLMCaller(new BrowserConfigManager({
        endpoint: config.openAI.endpoint,
        apiKey: config.openAI.apiKey,
        deploymentName: config.openAI.deploymentName,
        apiVersion: config.openAI.apiVersion,
        reasoningEffort: config.openAI.reasoningEffort,
        authType: config.openAI.authType || 'apiKey',
        tenantId: config.openAI.tenantId,
      }));

      toast.info('Generating synthetic audio from transcript...');

      const result = await generateSyntheticAudio(
        call,
        schema,
        llmCaller,
        config,
        (progress) => {
          setAudioGenerationProgress(progress);
          if (progress.phase === 'detecting-gender') {
            toast.info(progress.message);
          }
        }
      );

      // Store the generated audio in IndexedDB
      await storeAudioFile(call.id, result.audioBlob);

      // Update the call with the synthetic audio
      const updatedCall: CallRecord = {
        ...call,
        audioFile: result.audioBlob,
        metadata: {
          ...call.metadata,
          syntheticAudioGenerated: true,
          syntheticAudioVoices: result.voiceAssignments.map(v => `${v.speakerLabel}: ${v.voiceName}`).join(', '),
        },
        updatedAt: new Date().toISOString(),
      };

      onUpdate(updatedCall);

      // Update the audio URL for playback
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      setAudioUrl(result.audioUrl);

      toast.success(
        `Synthetic audio generated! Voices: ${result.voiceAssignments.map(v => v.voiceName.replace('en-US-', '').replace('Neural', '')).join(' & ')}`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to generate synthetic audio: ${errorMessage}`);
    } finally {
      setGeneratingAudio(false);
      setAudioGenerationProgress(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[80vw] w-[80vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl">Call Details</DialogTitle>
              <DialogDescription className="sr-only">
                View and manage call transcript, evaluation, and metadata
              </DialogDescription>
              <div className="mt-2">
                <DynamicDetailSummary metadata={call.metadata} schema={schema} />
              </div>
            </div>
            {call.evaluation && (
              <div className="text-right">
                <div className="text-3xl font-bold">{call.evaluation.percentage}%</div>
                <div className="text-sm text-muted-foreground">
                  {call.evaluation.totalScore} / {call.evaluation.maxScore} points
                </div>
              </div>
            )}
          </div>
        </DialogHeader>

        <Tabs defaultValue="metadata" className="mt-4">
          <TabsList>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
            <TabsTrigger value="evaluation">
              Evaluation {call.evaluation && '✓'}
            </TabsTrigger>
            <TabsTrigger value="insights">
              AI Insights {call.evaluation?.productInsight && '✓'}
            </TabsTrigger>
            <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
          </TabsList>

          <TabsContent value="metadata" className="space-y-4">
            <DynamicDetailView metadata={call.metadata} schema={schema} />
            
            {/* Calculated Metrics Section */}
            {schema.relationships && schema.relationships.length > 0 && (() => {
              const calculatedMetrics = schema.relationships
                .filter(rel => rel.type === 'complex' && rel.formula)
                .map(rel => ({
                  relationship: rel,
                  value: call.metadata[`calc_${rel.id}`]
                }))
                .filter(item => item.value !== undefined);
              
              if (calculatedMetrics.length === 0) return null;
              
              return (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <span className="text-lg">🧮</span>
                      Calculated Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {calculatedMetrics.map(({ relationship, value }) => (
                      <div key={relationship.id} className="border-b border-border last:border-0 pb-3 last:pb-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">
                              {relationship.displayName || relationship.id}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {relationship.description}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-sm font-semibold">
                              {typeof value === 'number' ? value.toFixed(2) : String(value)}
                            </div>
                            {relationship.outputType && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {relationship.outputType}
                              </div>
                            )}
                          </div>
                        </div>
                        {relationship.formula && (
                          <details className="mt-2">
                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                              Show formula
                            </summary>
                            <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                              {relationship.formula}
                            </pre>
                          </details>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })()}
          </TabsContent>

          <TabsContent value="transcript">
            {!call.transcript ? (
              <Card className="p-8 text-center">
                <div className="space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Microphone size={32} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      {isProcessing ? 'Processing...' : 'No Transcript Yet'}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {isProcessing
                        ? 'Azure Speech is processing your audio file. This may take a few moments.'
                        : 'Use Azure Speech-to-Text to automatically transcribe this call'}
                    </p>
                  </div>
                  {call.audioFile && !isProcessing && (
                    <Button onClick={handleTranscribe} disabled={isProcessing}>
                      {isProcessing ? 'Processing...' : 'Transcribe Audio'}
                    </Button>
                  )}
                  {!call.audioFile && (
                    <p className="text-sm text-muted-foreground">No audio file available</p>
                  )}
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                {call.transcriptConfidence !== undefined && (
                  <Card>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Transcription Confidence</p>
                        <p className="text-xs text-muted-foreground">
                          {call.transcriptLocale && `Locale: ${call.transcriptLocale}`}
                          {call.transcriptDuration && 
                            ` • Duration: ${(call.transcriptDuration / 1000).toFixed(1)}s`}
                          {call.transcriptSpeakerCount && ` • ${call.transcriptSpeakerCount} speakers`}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {(call.transcriptConfidence * 100).toFixed(1)}%
                      </Badge>
                    </CardContent>
                  </Card>
                )}
                
                {call.transcriptPhrases && call.transcriptPhrases.length > 0 ? (
                  <TranscriptConversation
                    phrases={call.transcriptPhrases}
                    agentName={(() => {
                      const agentField = schema.fields.find(f => f.semanticRole === 'participant_1');
                      return agentField ? String(call.metadata[agentField.id] || agentField.participantLabel || 'Agent') : 'Agent';
                    })()}
                    borrowerName={(() => {
                      const borrowerField = schema.fields.find(f => f.semanticRole === 'participant_2');
                      return borrowerField ? String(call.metadata[borrowerField.id] || borrowerField.participantLabel || 'Customer') : 'Customer';
                    })()}
                    locale={call.transcriptLocale}
                    duration={call.transcriptDuration}
                  />
                ) : (
                  <ScrollArea className="h-[450px] border border-border rounded-lg p-4">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {call.transcript}
                    </div>
                  </ScrollArea>
                )}
                
                <div className="flex justify-end gap-2">
                  <Button
                    onClick={handleGenerateSyntheticAudio}
                    variant="outline"
                    size="sm"
                    disabled={generatingAudio || !call.transcriptPhrases || call.transcriptPhrases.length === 0}
                  >
                    <SpeakerHigh className="mr-2 h-4 w-4" />
                    {generatingAudio 
                      ? audioGenerationProgress 
                        ? `${audioGenerationProgress.message}`
                        : 'Generating...'
                      : 'Generate Synthetic Audio'
                    }
                  </Button>
                  <Button
                    onClick={handleTranscribe}
                    variant="outline"
                    size="sm"
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Processing...' : 'Re-transcribe'}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="evaluation" className="space-y-4">
            {!call.evaluation ? (
              <Card className="p-8 text-center">
                <div className="space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center">
                    <Sparkle size={32} className="text-accent" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Ready to Evaluate</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Use AI to evaluate this call against {getEvaluationCriteriaForSchema(schema.id).length} quality criteria
                    </p>
                  </div>
                  <Button onClick={handleEvaluate} disabled={evaluating}>
                    {evaluating ? 'Evaluating...' : 'Evaluate Call'}
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Overall Feedback</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed">
                      {call.evaluation.overallFeedback}
                    </p>
                  </CardContent>
                </Card>

                <div className="space-y-3">
                  {call.evaluation.results.map((result) => {
                    // Get criteria for this call's schema
                    const schemaCriteria = getEvaluationCriteriaForSchema(schema.id);
                    
                    // The AI returns criterionId as 1-based sequential numbers (1, 2, 3...)
                    // but the actual IDs in storage are like "rule_1765352460817_0" (0-based suffix)
                    // So we match by index position: criterionId 1 -> index 0, criterionId 2 -> index 1, etc.
                    const criterionIndex = typeof result.criterionId === 'number' 
                      ? result.criterionId - 1 
                      : parseInt(String(result.criterionId), 10) - 1;
                    const criterion = schemaCriteria[criterionIndex] || schemaCriteria.find(c => c.id === result.criterionId);
                    
                    // Show fallback if criterion not found
                    const criterionName = criterion?.name || `Criterion #${result.criterionId}`;
                    const criterionType = criterion?.type || 'Unknown';
                    const maxScore = criterion?.scoringStandard?.passed || 10;

                    return (
                      <Card key={result.criterionId}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 mt-1">
                              {result.passed ? (
                                <CheckCircle
                                  size={24}
                                  weight="fill"
                                  className="text-success"
                                />
                              ) : result.score > 0 ? (
                                <MinusCircle
                                  size={24}
                                  weight="fill"
                                  className="text-warning"
                                />
                              ) : (
                                <XCircle
                                  size={24}
                                  weight="fill"
                                  className="text-destructive"
                                />
                              )}
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="font-semibold">{criterionName}</h4>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {criterionType}
                                  </p>
                                </div>
                                <Badge
                                  variant={result.passed ? 'default' : 'destructive'}
                                >
                                  {result.score} pts
                                </Badge>
                              </div>
                              <Progress
                                value={(result.score / maxScore) * 100}
                                className="h-2"
                              />
                              <div className="text-sm">
                                <p className="font-medium text-muted-foreground">Evidence:</p>
                                <p className="mt-1 italic">"{result.evidence}"</p>
                              </div>
                              <div className="text-sm">
                                <p className="font-medium text-muted-foreground">Reasoning:</p>
                                <p className="mt-1">{result.reasoning}</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleEvaluate} variant="outline" disabled={evaluating}>
                    {evaluating ? 'Re-evaluating...' : 'Re-evaluate'}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            {/* Check if we have any insights (either schema-driven or legacy) */}
            {!call.evaluation?.productInsight && !call.evaluation?.riskInsight && !call.evaluation?.schemaInsights ? (
              <Card className="p-8 text-center">
                <div className="space-y-4">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/20">
                    <Sparkle size={32} className="text-accent" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold">AI Insights Not Generated</h3>
                    <p className="text-sm text-muted-foreground">
                      Evaluate the call to generate detailed analytical insights
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="pr-4 space-y-3">
                  {/* Dynamic Schema-Driven Insights */}
                  {schema.insightCategories && schema.insightCategories.length > 0 && call.evaluation?.schemaInsights && (
                    <DynamicInsightGrid
                      categories={schema.insightCategories}
                      insightData={call.evaluation.schemaInsights}
                    />
                  )}

                  {/* Legacy Insights (for backward compatibility with existing data) */}
                  {/* Only show legacy insights when schema has NO dynamic insight categories */}
                  {(!schema.insightCategories || schema.insightCategories.length === 0) && (
                    <>
                  {/* Risk Insight - Compact View */}
                  {call.evaluation?.riskInsight && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center justify-between text-base">
                          <span>Risk Assessment</span>
                          <Badge
                            variant={
                              call.evaluation.riskInsight.riskTier === 'Low'
                                ? 'default'
                                : call.evaluation.riskInsight.riskTier === 'Medium'
                                ? 'secondary'
                                : call.evaluation.riskInsight.riskTier === 'High'
                                ? 'destructive'
                                : 'destructive'
                            }
                            className={
                              call.evaluation.riskInsight.riskTier === 'Low'
                                ? 'bg-green-500'
                                : call.evaluation.riskInsight.riskTier === 'Medium'
                                ? 'bg-yellow-500'
                                : call.evaluation.riskInsight.riskTier === 'High'
                                ? 'bg-orange-500'
                                : 'bg-red-500'
                            }
                          >
                            {call.evaluation.riskInsight.riskTier} Risk
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Payment Probability</p>
                            <div className="flex items-baseline gap-2">
                              <span className="text-xl font-bold">
                                {call.evaluation.riskInsight.paymentProbability}%
                              </span>
                            </div>
                            <Progress value={call.evaluation.riskInsight.paymentProbability} className="h-1.5 mt-1" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Risk Score</p>
                            <div className="flex items-baseline gap-2">
                              <span className="text-xl font-bold">
                                {call.evaluation.riskInsight.riskScore}
                              </span>
                            </div>
                            <Progress value={call.evaluation.riskInsight.riskScore} className="h-1.5 mt-1" />
                          </div>
                        </div>
                        {call.evaluation.riskInsight.escalationRecommended && (
                          <Badge variant="destructive" className="w-full justify-center py-1">
                            ⚠ Escalation Recommended
                          </Badge>
                        )}
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Detailed Analysis:</p>
                          <div className="text-xs leading-relaxed prose prose-sm max-w-none">
                            <ReactMarkdown>{call.evaluation.riskInsight.detailedAnalysis}</ReactMarkdown>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Two-column layout for Product and Outcome */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Product Insight */}
                    {call.evaluation.productInsight && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Product: {call.evaluation.productInsight.productType}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2.5">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1.5">Performance Factors:</p>
                            <div className="flex flex-wrap gap-1.5">
                              {call.evaluation.productInsight.performanceFactors.map((factor, idx) => (
                                <Badge key={idx} variant="outline" className="text-[11px] px-2 py-1 whitespace-normal break-words">
                                  {factor}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1.5">Recommended Approach:</p>
                            <div className="text-xs leading-relaxed prose prose-sm max-w-none">
                              <ReactMarkdown>{call.evaluation.productInsight.recommendedApproach}</ReactMarkdown>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Outcome Insight */}
                    {call.evaluation.outcomeInsight && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center justify-between text-sm gap-2">
                            <span>Outcome Analysis</span>
                            <Badge
                              variant={
                                call.evaluation.outcomeInsight.categorizedOutcome === 'success'
                                  ? 'default'
                                  : call.evaluation.outcomeInsight.categorizedOutcome === 'promise-to-pay'
                                  ? 'secondary'
                                  : 'outline'
                              }
                              className="text-[10px] px-2 py-0.5 whitespace-nowrap"
                            >
                              {call.evaluation.outcomeInsight.categorizedOutcome.replace(/-/g, ' ').toUpperCase()}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2.5">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Success Probability</p>
                            <div className="flex items-baseline gap-2">
                              <span className="text-lg font-bold">
                                {call.evaluation.outcomeInsight.successProbability}%
                              </span>
                            </div>
                            <Progress value={call.evaluation.outcomeInsight.successProbability} className="h-1.5 mt-1" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1.5">Key Factors:</p>
                            <div className="flex flex-wrap gap-1.5">
                              {call.evaluation.outcomeInsight.keyFactors.map((factor, idx) => (
                                <Badge key={idx} variant="outline" className="text-[11px] px-2 py-1 whitespace-normal break-words">
                                  {factor}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1.5">Reasoning:</p>
                            <div className="text-xs leading-relaxed prose prose-sm max-w-none">
                              <ReactMarkdown>{call.evaluation.outcomeInsight.reasoning}</ReactMarkdown>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Two-column layout for Nationality and Borrower */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Nationality Insight */}
                    {call.evaluation.nationalityInsight && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Cultural & Language</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2.5">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1.5">Cultural Factors:</p>
                            <div className="flex flex-wrap gap-1.5">
                              {call.evaluation.nationalityInsight.culturalFactors.map((factor, idx) => (
                                <Badge key={idx} variant="outline" className="text-[11px] px-2 py-1 whitespace-normal break-words">
                                  {factor}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1.5">Language Effectiveness:</p>
                            <div className="text-xs leading-relaxed prose prose-sm max-w-none">
                              <ReactMarkdown>{call.evaluation.nationalityInsight.languageEffectiveness}</ReactMarkdown>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1.5">Recommended Adjustments:</p>
                            <div className="text-xs leading-relaxed prose prose-sm max-w-none">
                              <ReactMarkdown>{call.evaluation.nationalityInsight.recommendedAdjustments}</ReactMarkdown>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Borrower Insight */}
                    {call.evaluation.borrowerInsight && (
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center justify-between text-sm gap-2">
                            <span>Borrower Interaction</span>
                            <Badge
                              variant={
                                call.evaluation.borrowerInsight.interactionQuality === 'excellent'
                                  ? 'default'
                                  : call.evaluation.borrowerInsight.interactionQuality === 'good'
                                  ? 'secondary'
                                  : 'outline'
                              }
                              className="text-[10px] px-2 py-0.5"
                            >
                              {call.evaluation.borrowerInsight.interactionQuality.toUpperCase()}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2.5">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1.5">Relationship Indicators:</p>
                            <div className="flex flex-wrap gap-1.5">
                              {call.evaluation.borrowerInsight.relationshipIndicators.map((indicator, idx) => (
                                <Badge key={idx} variant="outline" className="text-[11px] px-2 py-1 whitespace-normal break-words">
                                  {indicator}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1.5">Future Strategy:</p>
                            <div className="text-xs leading-relaxed prose prose-sm max-w-none">
                              <ReactMarkdown>{call.evaluation.borrowerInsight.futureStrategy}</ReactMarkdown>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                    </>
                  )}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="sentiment" className="space-y-4">
            {call.transcript && call.transcriptPhrases && (
              <div className="flex justify-end">
                <Button
                  onClick={async () => {
                    if (!call.transcriptPhrases) {
                      toast.error('No transcript phrases available');
                      return;
                    }
                    
                    setAnalyzingSentiment(true);
                    try {
                      toast.info('Re-analyzing sentiment...');
                      const businessContext = schema.businessContext || schema.name || 'call center';
                      const sentiment = await azureOpenAIService.analyzeSentimentTimeline(
                        call.id,
                        call.transcriptPhrases,
                        call.transcriptLocale || 'en-US',
                        ['positive', 'neutral', 'negative'],
                        businessContext
                      );
                      
                      const updatedCall = {
                        ...call,
                        sentimentSegments: sentiment.segments,
                        sentimentSummary: sentiment.summary,
                        updatedAt: new Date().toISOString(),
                      };
                      
                      onUpdate(updatedCall);
                      toast.success('Sentiment analysis updated!');
                    } catch (error) {
                      console.error('Sentiment re-analysis failed:', error);
                      toast.error(error instanceof Error ? error.message : 'Failed to re-analyze sentiment');
                    } finally {
                      setAnalyzingSentiment(false);
                    }
                  }}
                  variant="outline"
                  size="sm"
                  disabled={analyzingSentiment}
                >
                  {analyzingSentiment ? 'Analyzing...' : 'Re-analyze Sentiment'}
                </Button>
              </div>
            )}
            
            {(!call.sentimentSegments || call.sentimentSegments.length === 0) && (
              <Card className="p-8 text-center">
                <div className="space-y-4">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <Microphone size={28} className="text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold">Sentiment pending</h3>
                    <p className="text-sm text-muted-foreground">
                      Transcribe the call (and ensure Azure OpenAI is configured) to generate the
                      sentiment timeline.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {call.sentimentSegments && call.sentimentSegments.length > 0 && (
              <CallSentimentPlayer
                audioUrl={audioUrl}
                durationMilliseconds={call.transcriptDuration}
                segments={call.sentimentSegments}
                sentimentSummary={call.sentimentSummary}
              />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
