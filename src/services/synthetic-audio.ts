/**
 * Synthetic Audio Service
 * Orchestrates TTS generation for call transcripts with intelligent voice assignment
 */

import { CallRecord, TranscriptPhrase } from '@/types/call';
import { SchemaDefinition } from '@/types/schema';
import { AzureServicesConfig } from '@/types/config';
import { TTSCaller, getTTSCaller, initializeTTSCaller, AzureTTSConfig, DEFAULT_VOICES } from '@/TTSCaller';
import { LLMCaller } from '@/llmCaller';

export type Gender = 'male' | 'female' | 'neutral';

export interface VoiceAssignment {
  speakerLabel: string;
  gender: Gender;
  voiceName: string;
}

export interface SyntheticAudioResult {
  audioBlob: Blob;
  audioUrl: string;
  durationEstimateMs: number;
  voiceAssignments: VoiceAssignment[];
}

export interface SyntheticAudioProgress {
  phase: 'detecting-gender' | 'synthesizing' | 'combining';
  current: number;
  total: number;
  message: string;
}

// Cache for gender detection results
const genderCache = new Map<string, Gender>();

/**
 * Detect gender from a name using LLM
 */
export async function detectGenderFromName(
  name: string,
  llmCaller: LLMCaller
): Promise<Gender> {
  // Check cache first
  const normalizedName = name.trim().toLowerCase();
  if (genderCache.has(normalizedName)) {
    const cachedGender = genderCache.get(normalizedName)!;
    console.log(`🎭 Gender cache hit: "${name}" = ${cachedGender}`);
    return cachedGender;
  }

  // Skip detection for empty/placeholder names
  if (!name || name.trim().length === 0 || name === 'Unknown' || name === 'N/A') {
    console.log(`🎭 Skipping gender detection for empty/placeholder name: "${name}"`);
    return 'neutral';
  }

  console.log(`🎭 Detecting gender for name: "${name}"`);

  try {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      {
        role: 'system',
        content: `You are a name analyzer. Given a person's name, determine the most likely gender.
Respond ONLY with a JSON object in this exact format: {"gender": "male"} or {"gender": "female"} or {"gender": "neutral"}
Use "neutral" only if the name is truly ambiguous or unrecognizable.
Do not include any other text.`,
      },
      {
        role: 'user',
        content: `Name: ${name}`,
      },
    ];

    const result = await llmCaller.callWithJsonValidation<{ gender: Gender }>(messages, {
      maxRetries: 1,
      maxTokens: 20,
    });

    console.log(`🎭 LLM response for "${name}":`, result);

    if (result.parsed?.gender) {
      const gender = result.parsed.gender;
      console.log(`🎭 Gender detected: "${name}" = ${gender}`);
      genderCache.set(normalizedName, gender);
      return gender;
    }
  } catch (error) {
    console.warn('🎭 Gender detection failed for name:', name, error);
  }

  // Default to neutral if detection fails
  console.log(`🎭 Defaulting to neutral for: "${name}"`);
  genderCache.set(normalizedName, 'neutral');
  return 'neutral';
}

/**
 * Extract participant names from call metadata using schema
 */
function extractParticipantNames(
  call: CallRecord,
  schema: SchemaDefinition
): { agentName: string; customerName: string } {
  const metadata = call.metadata || {};
  
  console.log(`📋 Extracting participant names from metadata:`, metadata);
  console.log(`📋 Schema fields:`, schema.fields.map(f => ({ id: f.id, name: f.name, semanticRole: f.semanticRole, participantLabel: f.participantLabel })));
  
  // Find participant fields from schema
  const participant1Field = schema.fields.find(f => f.semanticRole === 'participant_1');
  const participant2Field = schema.fields.find(f => f.semanticRole === 'participant_2');
  
  console.log(`📋 Participant fields found: P1=${participant1Field?.name || 'none'}, P2=${participant2Field?.name || 'none'}`);
  
  let agentName = 'Agent';
  let customerName = 'Customer';
  
  if (participant1Field) {
    agentName = metadata[participant1Field.id] || metadata[participant1Field.name] || participant1Field.participantLabel || 'Agent';
    console.log(`📋 Agent name extracted: "${agentName}" (field: ${participant1Field.id}/${participant1Field.name})`);
  }
  
  if (participant2Field) {
    customerName = metadata[participant2Field.id] || metadata[participant2Field.name] || participant2Field.participantLabel || 'Customer';
    console.log(`📋 Customer name extracted: "${customerName}" (field: ${participant2Field.id}/${participant2Field.name})`);
  }
  
  return { agentName, customerName };
}

/**
 * Get speaker name from speaker number
 */
function getSpeakerInfo(
  speaker: number | undefined,
  agentName: string,
  customerName: string
): { name: string; isAgent: boolean } {
  // Speaker 0 or 1 = Agent (first speaker)
  // Speaker 2+ = Customer
  if (speaker === 0 || speaker === 1) {
    return { name: agentName, isAgent: true };
  }
  return { name: customerName, isAgent: false };
}

/**
 * Initialize TTS caller with config
 */
export function initializeTTS(config: AzureTTSConfig): TTSCaller {
  return initializeTTSCaller(config);
}

/**
 * Get or initialize TTS caller from stored config
 */
export function getOrInitializeTTSCaller(azureConfig: AzureServicesConfig): TTSCaller {
  let ttsCaller = getTTSCaller();
  if (!ttsCaller) {
    if (!azureConfig.speech?.subscriptionKey || !azureConfig.speech?.region) {
      throw new Error('Azure Speech credentials not configured. Please configure Speech Services in the Configuration dialog.');
    }
    
    ttsCaller = initializeTTSCaller({
      region: azureConfig.speech.region,
      subscriptionKey: azureConfig.speech.subscriptionKey,
      defaultMaleVoice1: azureConfig.tts?.defaultMaleVoice1 || DEFAULT_VOICES.male1,
      defaultMaleVoice2: azureConfig.tts?.defaultMaleVoice2 || DEFAULT_VOICES.male2,
      defaultFemaleVoice1: azureConfig.tts?.defaultFemaleVoice1 || DEFAULT_VOICES.female1,
      defaultFemaleVoice2: azureConfig.tts?.defaultFemaleVoice2 || DEFAULT_VOICES.female2,
    });
  }
  return ttsCaller;
}

/**
 * Generate synthetic audio for a call from its transcript
 */
export async function generateSyntheticAudio(
  call: CallRecord,
  schema: SchemaDefinition,
  llmCaller: LLMCaller,
  azureConfig: AzureServicesConfig,
  onProgress?: (progress: SyntheticAudioProgress) => void
): Promise<SyntheticAudioResult> {
  // Validate transcript exists
  if (!call.transcriptPhrases || call.transcriptPhrases.length === 0) {
    throw new Error('No transcript phrases available. Please transcribe the call first.');
  }

  // Get TTS caller
  const ttsCaller = getOrInitializeTTSCaller(azureConfig);

  // Extract participant names
  const { agentName, customerName } = extractParticipantNames(call, schema);

  // Phase 1: Detect genders
  onProgress?.({
    phase: 'detecting-gender',
    current: 0,
    total: 2,
    message: 'Detecting speaker genders...',
  });

  const agentGender = await detectGenderFromName(agentName, llmCaller);
  onProgress?.({
    phase: 'detecting-gender',
    current: 1,
    total: 2,
    message: `Agent "${agentName}" detected as ${agentGender}`,
  });

  const customerGender = await detectGenderFromName(customerName, llmCaller);
  onProgress?.({
    phase: 'detecting-gender',
    current: 2,
    total: 2,
    message: `Customer "${customerName}" detected as ${customerGender}`,
  });

  console.log(`🎤 Gender detection results: Agent "${agentName}" = ${agentGender}, Customer "${customerName}" = ${customerGender}`);

  // Assign voices based on gender
  // Agent always gets the primary voice for their gender
  // Customer gets the secondary voice if same gender, or primary if different gender
  const agentVoice = ttsCaller.getVoiceForGender(agentGender, true); // primary voice
  
  let customerVoice: string;
  if (agentGender === customerGender) {
    // Same gender - use secondary voice for customer
    customerVoice = ttsCaller.getVoiceForGender(customerGender, false); // secondary voice
    console.log(`🔊 Same gender (${agentGender}) - using different voices: Agent=${agentVoice}, Customer=${customerVoice}`);
  } else {
    // Different genders - both get primary voices
    customerVoice = ttsCaller.getVoiceForGender(customerGender, true); // primary voice
    console.log(`🔊 Different genders - using primary voices: Agent (${agentGender})=${agentVoice}, Customer (${customerGender})=${customerVoice}`);
  }

  const voiceAssignments: VoiceAssignment[] = [
    { speakerLabel: agentName, gender: agentGender, voiceName: agentVoice },
    { speakerLabel: customerName, gender: customerGender, voiceName: customerVoice },
  ];

  // Phase 2: Synthesize each phrase
  const phrases = call.transcriptPhrases.map((phrase) => {
    const speakerInfo = getSpeakerInfo(phrase.speaker, agentName, customerName);
    const voice = speakerInfo.isAgent ? agentVoice : customerVoice;
    
    return {
      text: phrase.text,
      voice: voice,
      pauseAfterMs: 400, // Natural pause between speakers
    };
  });

  onProgress?.({
    phase: 'synthesizing',
    current: 0,
    total: phrases.length,
    message: 'Synthesizing audio...',
  });

  const audioBlob = await ttsCaller.synthesizeConversation(
    phrases,
    (current, total) => {
      onProgress?.({
        phase: 'synthesizing',
        current,
        total,
        message: `Synthesizing phrase ${current} of ${total}...`,
      });
    }
  );

  // Create object URL for playback
  const audioUrl = URL.createObjectURL(audioBlob);

  // Estimate duration from phrases
  const totalWords = call.transcriptPhrases.reduce((sum, p) => sum + p.text.split(/\s+/).length, 0);
  const durationEstimateMs = (totalWords / 150) * 60 * 1000; // 150 WPM average

  return {
    audioBlob,
    audioUrl,
    durationEstimateMs,
    voiceAssignments,
  };
}

/**
 * Generate synthetic audio for multiple calls (batch processing)
 */
export async function generateSyntheticAudioBatch(
  calls: CallRecord[],
  schema: SchemaDefinition,
  llmCaller: LLMCaller,
  azureConfig: AzureServicesConfig,
  onProgress?: (callIndex: number, totalCalls: number, callId: string, status: 'processing' | 'completed' | 'skipped' | 'failed') => void
): Promise<Map<string, SyntheticAudioResult | null>> {
  const results = new Map<string, SyntheticAudioResult | null>();

  // Filter to only calls with transcripts
  const callsWithTranscripts = calls.filter(c => 
    c.transcriptPhrases && c.transcriptPhrases.length > 0
  );

  for (let i = 0; i < callsWithTranscripts.length; i++) {
    const call = callsWithTranscripts[i];
    
    onProgress?.(i + 1, callsWithTranscripts.length, call.id, 'processing');

    try {
      const result = await generateSyntheticAudio(call, schema, llmCaller, azureConfig);
      results.set(call.id, result);
      onProgress?.(i + 1, callsWithTranscripts.length, call.id, 'completed');
    } catch (error) {
      console.error(`Failed to generate synthetic audio for call ${call.id}:`, error);
      results.set(call.id, null);
      onProgress?.(i + 1, callsWithTranscripts.length, call.id, 'failed');
    }

    // Small delay between calls to avoid rate limiting
    if (i < callsWithTranscripts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  // Mark calls without transcripts as skipped
  for (const call of calls) {
    if (!results.has(call.id)) {
      results.set(call.id, null);
      onProgress?.(calls.indexOf(call) + 1, calls.length, call.id, 'skipped');
    }
  }

  return results;
}

/**
 * Clear the gender detection cache
 */
export function clearGenderCache(): void {
  genderCache.clear();
}
