import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { CallSentimentSegment } from '@/types/call';

interface CallSentimentPlayerProps {
  audioUrl?: string;
  durationMilliseconds?: number;
  segments?: CallSentimentSegment[];
  sentimentSummary?: string;
}

const sentimentColors: Record<string, string> = {
  positive: 'bg-emerald-500/70 border-emerald-600',
  neutral: 'bg-amber-400/70 border-amber-500',
  negative: 'bg-red-500/70 border-red-600',
};

const sentimentLabels: Record<string, string> = {
  positive: 'Positive',
  neutral: 'Neutral',
  negative: 'Negative',
};

function formatTime(ms: number): string {
  const safe = Math.max(0, Math.round(ms));
  const totalSeconds = Math.floor(safe / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function CallSentimentPlayer({
  audioUrl,
  durationMilliseconds,
  segments,
  sentimentSummary,
}: CallSentimentPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isReady, setIsReady] = useState(false);

  const effectiveDuration = useMemo(() => {
    if (durationMilliseconds && durationMilliseconds > 0) {
      return durationMilliseconds;
    }

    if (!segments || segments.length === 0) {
      return 0;
    }

    return segments.reduce(
      (max, segment) => Math.max(max, segment.endMilliseconds || 0),
      0
    );
  }, [durationMilliseconds, segments]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime * 1000);
    const handleLoaded = () => setIsReady(true);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoaded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoaded);
    };
  }, []);

  const handleSeek = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || effectiveDuration <= 0) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const ratio = clickX / rect.width;
    const newTimeSeconds = (effectiveDuration * ratio) / 1000;
    audioRef.current.currentTime = newTimeSeconds;
  };

  const progressPercent = effectiveDuration
    ? Math.min(100, (currentTime / effectiveDuration) * 100)
    : 0;

  const legend = (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      {Object.entries(sentimentLabels).map(([key, label]) => (
        <div key={key} className="flex items-center gap-2">
          <span
            className={clsx('inline-block h-2 w-6 rounded-sm border', sentimentColors[key])}
          ></span>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <audio
          ref={audioRef}
          src={audioUrl}
          controls
          className="w-full"
          preload="metadata"
        />
        {!audioUrl && (
          <p className="text-sm text-muted-foreground">
            Audio file not available for playback.
          </p>
        )}
      </div>

      {/* Sentiment timeline - shown when segments exist */}
      {segments && segments.length > 0 && effectiveDuration > 0 && (
        <div className="space-y-3">
          <div
            className="relative h-4 w-full cursor-pointer overflow-hidden rounded-full bg-muted"
            onClick={handleSeek}
          >
            <div
              className="absolute inset-y-0 left-0 bg-primary/60"
              style={{ width: `${progressPercent}%` }}
            />
            {segments.map((segment, index) => {
              const start = Math.max(0, segment.startMilliseconds);
              const end = Math.max(start, segment.endMilliseconds);
              const widthPercent = ((end - start) / effectiveDuration) * 100;
              const leftPercent = (start / effectiveDuration) * 100;
              const color = sentimentColors[segment.sentiment] ?? sentimentColors.neutral;

              return (
                <div
                  key={`${segment.sentiment}-${index}-${start}`}
                  className={clsx(
                    'absolute inset-y-0 border opacity-80 transition-opacity hover:opacity-100',
                    color
                  )}
                  style={{
                    left: `${leftPercent}%`,
                    width: `${Math.max(widthPercent, 0.5)}%`,
                  }}
                  title={`${sentimentLabels[segment.sentiment] ?? segment.sentiment} (${formatTime(
                    start
                  )} - ${formatTime(end)})`}
                />
              );
            })}
          </div>
          {legend}
        </div>
      )}

      {/* Message when no sentiment but audio exists */}
      {(!segments || segments.length === 0) && audioUrl && (
        <p className="text-sm text-muted-foreground">
          Click "Re-analyze Sentiment" to generate the sentiment timeline overlay.
        </p>
      )}

      {/* Message when no audio and no sentiment */}
      {(!segments || segments.length === 0) && !audioUrl && (
        <p className="text-sm text-muted-foreground">
          Generate audio and analyze sentiment to see the timeline.
        </p>
      )}

      {segments && segments.length > 0 && (
        <div className="space-y-3">
          {sentimentSummary && (
            <p className="text-sm font-medium text-foreground">{sentimentSummary}</p>
          )}
          <div className="space-y-2 rounded-lg border bg-card p-3">
            {segments.map((segment, index) => {
              // Debug logging
              if (index === 0) {
                console.log('🔍 Sentiment segment structure:', segment);
                console.log('Has intensity?', segment.intensity);
                console.log('Has emotionalTriggers?', segment.emotionalTriggers);
                console.log('Has summary?', segment.summary);
                console.log('Has rationale?', segment.rationale);
              }
              const color = sentimentColors[segment.sentiment] ?? sentimentColors.neutral;
              return (
                <div
                  key={`${segment.sentiment}-${index}-${segment.startMilliseconds}`}
                  className="flex items-start justify-between gap-3 rounded-md border bg-background/60 p-3"
                >
                  <div className="space-y-1 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={clsx('inline-flex h-2 w-6 rounded-sm border', color)}></span>
                      <span className="font-medium text-foreground">
                        {sentimentLabels[segment.sentiment] ?? segment.sentiment}
                      </span>
                      {typeof segment.intensity === 'number' && (
                        <span className="text-xs font-medium text-foreground">
                          {segment.intensity}/10
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatTime(segment.startMilliseconds)} - {formatTime(segment.endMilliseconds)}
                      </span>
                      {typeof segment.speaker === 'number' && (
                        <span className="text-xs text-muted-foreground">Speaker {segment.speaker}</span>
                      )}
                      {typeof segment.confidence === 'number' && (
                        <span className="text-xs text-muted-foreground">
                          Confidence {(segment.confidence * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    {segment.summary && (
                      <p className="text-sm text-foreground">{segment.summary}</p>
                    )}
                    {segment.rationale && (
                      <p className="text-xs text-muted-foreground">{segment.rationale}</p>
                    )}
                    {segment.emotionalTriggers && segment.emotionalTriggers.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {segment.emotionalTriggers.map((trigger, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground"
                          >
                            "{trigger}"
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="text-xs text-primary underline-offset-2 hover:underline"
                    onClick={() => {
                      if (!audioRef.current || !isReady) return;
                      const target = segment.startMilliseconds / 1000;
                      audioRef.current.currentTime = target;
                      audioRef.current.play().catch(() => undefined);
                    }}
                  >
                    Jump
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
