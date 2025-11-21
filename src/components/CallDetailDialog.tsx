import { useState } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CallRecord } from '@/types/call';
import { AzureServicesConfig } from '@/types/config';
import { azureOpenAIService, getActiveEvaluationCriteria } from '@/services/azure-openai';
import { STTCaller } from '../STTCaller';
import { getCriterionById } from '@/lib/evaluation-criteria';
import { toast } from 'sonner';
import { CheckCircle, XCircle, MinusCircle, Sparkle, Microphone } from '@phosphor-icons/react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CallSentimentPlayer } from '@/components/call-player/CallSentimentPlayer';
import { TranscriptConversation } from '@/components/TranscriptConversation';
import { DEFAULT_CALL_CENTER_LANGUAGES } from '@/lib/speech-languages';

interface CallDetailDialogProps {
  call: CallRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (call: CallRecord) => void;
}

export function CallDetailDialog({
  call,
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

  const isProcessing = call.status === 'processing' || transcribing;

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
            const sentiment = await azureOpenAIService.analyzeSentimentTimeline(
              call.id,
              result.phrases,
              result.locale || 'en-US'
            );
            sentimentSegments = sentiment.segments;
            sentimentSummary = sentiment.summary;
            
            // Second pass: Analyze overall sentiment for analytics
            if (result.transcript && result.transcript.trim().length > 0) {
              overallSentiment = await azureOpenAIService.analyzeOverallSentiment(
                call.id,
                result.transcript,
                call.metadata
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
        call.id
      );

      const updatedCall: CallRecord = {
        ...call,
        evaluation,
        status: 'evaluated',
        updatedAt: new Date().toISOString(),
      };

      onUpdate(updatedCall);
      toast.success('Call evaluated successfully!');
    } catch (error) {
      toast.error(
        `Evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl">Call Details</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {call.metadata.agentName} → {call.metadata.borrowerName}
              </p>
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
            <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
          </TabsList>

          <TabsContent value="metadata" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Agent</h4>
                <p className="font-medium">{call.metadata.agentName}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Product</h4>
                <p className="font-medium">{call.metadata.product}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Borrower</h4>
                <p className="font-medium">{call.metadata.borrowerName}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Nationality</h4>
                <p className="font-medium">{call.metadata.nationality}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">
                  Days Past Due
                </h4>
                <p className="font-medium">{call.metadata.daysPastDue}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Due Amount</h4>
                <p className="font-medium">{call.metadata.dueAmount.toFixed(2)}</p>
              </div>
              <div className="col-span-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Follow-up Status
                </h4>
                <p className="font-medium">{call.metadata.followUpStatus}</p>
              </div>
            </div>
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
                    agentName={call.metadata.agentName}
                    borrowerName={call.metadata.borrowerName}
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
                
                <div className="flex justify-end">
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
                      Use AI to evaluate this call against {getActiveEvaluationCriteria().length} quality criteria
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
                    const criterion = getCriterionById(result.criterionId);
                    if (!criterion) return null;

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
                                  <h4 className="font-semibold">{criterion.name}</h4>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {criterion.type}
                                  </p>
                                </div>
                                <Badge
                                  variant={result.passed ? 'default' : 'destructive'}
                                >
                                  {result.score} pts
                                </Badge>
                              </div>
                              <Progress
                                value={(result.score / criterion.scoringStandard.passed) * 100}
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

          <TabsContent value="sentiment" className="space-y-4">
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
                audioUrl={call.metadata.audioUrl}
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
