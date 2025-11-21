import { TranscriptPhrase } from '@/types/call';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Headset, Globe } from '@phosphor-icons/react';

interface TranscriptConversationProps {
  phrases: TranscriptPhrase[];
  agentName: string;
  borrowerName: string;
  locale?: string;
  duration?: number;
}

export function TranscriptConversation({
  phrases,
  agentName,
  borrowerName,
  locale,
  duration,
}: TranscriptConversationProps) {
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getSpeakerName = (speaker?: number): { name: string; isAgent: boolean } => {
    // Azure Speech assigns speakers starting from 0 or 1 depending on API version
    // If speaker is undefined/null, use alternating pattern based on index
    if (speaker === undefined || speaker === null) {
      return { name: agentName, isAgent: true }; // Default to agent if no speaker info
    }
    
    // Speaker 0 or 1 is typically the agent (first speaker)
    if (speaker === 0 || speaker === 1) {
      return { name: agentName, isAgent: true };
    } else {
      return { name: borrowerName, isAgent: false };
    }
  };

  const getLanguageName = (localeCode?: string): string => {
    if (!localeCode) return '';
    
    const languageMap: Record<string, string> = {
      'en-US': '🇺🇸 English',
      'en-GB': '🇬🇧 English',
      'es-ES': '🇪🇸 Spanish',
      'es-MX': '🇲🇽 Spanish',
      'ar-SA': '🇸🇦 Arabic',
      'ar-EG': '🇪🇬 Arabic',
      'ur-PK': '🇵🇰 Urdu',
      'hi-IN': '🇮🇳 Hindi',
      'fil-PH': '🇵🇭 Filipino',
      'fr-FR': '🇫🇷 French',
      'de-DE': '🇩🇪 German',
      'it-IT': '🇮🇹 Italian',
      'pt-BR': '🇧🇷 Portuguese',
      'zh-CN': '🇨🇳 Chinese',
      'ja-JP': '🇯🇵 Japanese',
      'ko-KR': '🇰🇷 Korean',
      'ru-RU': '🇷🇺 Russian',
      'tr-TR': '🇹🇷 Turkish',
      'nl-NL': '🇳🇱 Dutch',
      'pl-PL': '🇵🇱 Polish',
      'sv-SE': '🇸🇪 Swedish',
      'id-ID': '🇮🇩 Indonesian',
      'ms-MY': '🇲🇾 Malay',
      'th-TH': '🇹🇭 Thai',
      'vi-VN': '🇻🇳 Vietnamese',
    };
    
    return languageMap[localeCode] || localeCode;
  };

  // Sort phrases by timestamp to ensure chronological order
  const sortedPhrases = [...phrases].sort((a, b) => 
    a.offsetMilliseconds - b.offsetMilliseconds
  );

  // Detect if conversation has multiple languages
  const uniqueLanguages = new Set(sortedPhrases.map(p => p.locale).filter(Boolean));
  const isMultiLingual = uniqueLanguages.size > 1;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Conversation Details</p>
            <p className="text-xs text-muted-foreground">
              {duration && `Duration: ${formatTime(duration)}`}
              {sortedPhrases.length > 0 && ` • ${sortedPhrases.length} messages`}
              {isMultiLingual && (
                <span className="ml-1 inline-flex items-center gap-1">
                  • <Globe size={12} weight="fill" /> {uniqueLanguages.size} languages detected
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Headset size={16} className="text-primary" />
              </div>
              <span className="text-xs font-medium">{agentName}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                <User size={16} className="text-accent" />
              </div>
              <span className="text-xs font-medium">{borrowerName}</span>
            </div>
          </div>
        </div>
      </Card>

      <ScrollArea className="h-[450px] border border-border rounded-lg p-6 bg-muted/20">
        <div className="space-y-4">
          {sortedPhrases.map((phrase, index) => {
            const speaker = getSpeakerName(phrase.speaker);
            const isAgent = speaker.isAgent;
            const timestamp = formatTime(phrase.offsetMilliseconds ?? 0);
            const phraseLocale = phrase.locale || locale;
            const languageName = getLanguageName(phraseLocale);
            // Always show badge if we have a language name (detected locale)
            const showBadge = !!languageName;

            return (
              <div
                key={index}
                className={`flex gap-3 ${isAgent ? 'flex-row' : 'flex-row-reverse'}`}
              >
                <Avatar className={`flex-shrink-0 ${isAgent ? 'bg-primary/10' : 'bg-accent/20'}`}>
                  <AvatarFallback className={isAgent ? 'text-primary' : 'text-accent'}>
                    {isAgent ? (
                      <Headset size={18} />
                    ) : (
                      <User size={18} />
                    )}
                  </AvatarFallback>
                </Avatar>

                <div className={`flex-1 space-y-1 ${isAgent ? 'items-start' : 'items-end'} flex flex-col`}>
                  <div className={`flex items-center gap-2 ${isAgent ? 'flex-row' : 'flex-row-reverse'}`}>
                    <span className="text-xs font-semibold">{speaker.name}</span>
                    <Badge variant="outline" className="text-[10px] h-4 px-1">
                      {timestamp}
                    </Badge>
                    {phrase.confidence !== undefined && phrase.confidence < 0.8 && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1">
                        {(phrase.confidence * 100).toFixed(0)}%
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1">
                    {showBadge && (
                      <Badge 
                        variant="secondary" 
                        className={`text-[10px] h-5 px-2 shadow-sm w-fit ${isAgent ? '' : 'ml-auto'}`}
                      >
                        {languageName}
                      </Badge>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-2.5 max-w-[85%] ${
                        isAgent
                          ? 'bg-primary/10 text-foreground rounded-tl-sm'
                          : 'bg-accent/30 text-foreground rounded-tr-sm'
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{phrase.text || phrase.lexical}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
