'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface StreamingTextProps {
  url: string;
  body: Record<string, unknown>;
  onChapter?: (chapter: string) => void;
  onComplete?: (data: Record<string, unknown>) => void;
  onError?: (message: string) => void;
  onStatus?: (message: string) => void;
  onWarning?: (message: string) => void;
  autoStart?: boolean;
}

export function StreamingText({
  url,
  body,
  onChapter,
  onComplete,
  onError,
  onStatus,
  onWarning,
  autoStart = false,
}: StreamingTextProps) {
  const [text, setText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const startedRef = useRef(false);

  const startStream = useCallback(async () => {
    if (isStreaming) return;

    abortRef.current = new AbortController();
    setIsStreaming(true);
    setText('');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: abortRef.current.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          if (line.startsWith('event: ')) {
            const eventType = line.slice(7).trim();
            const dataLine = lines[i + 1];

            if (dataLine?.startsWith('data: ')) {
              const rawData = dataLine.slice(6).trim();
              try {
                const data = JSON.parse(rawData) as Record<string, unknown>;

                switch (eventType) {
                  case 'chunk':
                    if (typeof data.text === 'string') {
                      setText((prev) => prev + data.text);
                    }
                    break;
                  case 'chapter':
                    if (typeof data.chapter === 'string') onChapter?.(data.chapter);
                    break;
                  case 'complete':
                    onComplete?.(data);
                    setIsStreaming(false);
                    break;
                  case 'error':
                    onError?.(typeof data.message === 'string' ? data.message : 'Errore sconosciuto');
                    setIsStreaming(false);
                    break;
                  case 'status':
                    if (typeof data.message === 'string') onStatus?.(data.message);
                    break;
                  case 'warning':
                    if (typeof data.message === 'string') onWarning?.(data.message);
                    break;
                  // ping: ignore
                }
              } catch {
                // Ignore malformed JSON
              }
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        onError?.(err.message);
      }
      setIsStreaming(false);
    }
  }, [url, body, onChapter, onComplete, onError, onStatus, onWarning, isStreaming]);

  // Auto-scroll
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [text]);

  useEffect(() => {
    if (autoStart && !startedRef.current) {
      startedRef.current = true;
      void startStream();
    }
    return () => {
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-y-auto p-4 font-mono text-sm leading-relaxed"
      style={{ backgroundColor: '#0d1117', color: '#e6edf3' }}
    >
      {text ? (
        <pre className="whitespace-pre-wrap break-words">{text}</pre>
      ) : (
        <span className="opacity-50">{isStreaming ? 'In elaborazione...' : 'In attesa...'}</span>
      )}
      {isStreaming && (
        <span className="inline-block w-2 h-4 bg-green-400 animate-pulse ml-1 align-middle" />
      )}
    </div>
  );
}
