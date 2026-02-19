'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TradeIdea } from '@/types/ai';
import { AIIdeaCard } from './AIIdeaCard';

interface AIIdeaStreamProps {
  ticker: string;
  cachedIdea?: TradeIdea | null;
}

export function AIIdeaStream({ ticker, cachedIdea }: AIIdeaStreamProps) {
  const [idea, setIdea] = useState<TradeIdea | null>(cachedIdea ?? null);
  const [streamText, setStreamText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!!cachedIdea);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const generate = async () => {
    if (isStreaming) {
      abortRef.current?.abort();
      setIsStreaming(false);
      return;
    }

    setIsStreaming(true);
    setStreamText('');
    setError(null);
    setIsExpanded(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const resp = await fetch('/api/ideas/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || resp.statusText);
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        setStreamText(fullText);
      }

      // Parse structured idea from full text
      setIdea(parseStreamedIdea(fullText, ticker));
      setStreamText('');
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError((err as Error).message || 'Failed to generate idea');
      }
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={idea && !isStreaming ? 'outline' : 'default'}
          className="gap-1.5 h-8 text-xs"
          onClick={generate}
        >
          {isStreaming ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              {idea ? 'Regenerate AI Idea' : 'Generate AI Trade Idea'}
            </>
          )}
        </Button>

        {idea && !isStreaming && (
          <Button
            size="sm"
            variant="ghost"
            className="gap-1 h-8 text-xs"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {isExpanded ? 'Hide' : 'Show idea'}
          </Button>
        )}

        {idea && (
          <span className={cn(
            'inline-flex items-center rounded px-2 py-0.5 text-xs font-bold',
            {
              BUY: 'bg-green-600 text-white',
              HOLD: 'bg-blue-600 text-white',
              AVOID: 'bg-amber-500 text-white',
              SELL: 'bg-red-600 text-white',
            }[idea.recommendation] ?? 'bg-muted'
          )}>
            {idea.recommendation}
          </span>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      {/* Streaming output */}
      {isStreaming && streamText && (
        <div className="rounded-md border bg-muted/30 p-3">
          <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed text-foreground">
            {streamText}
            <span className="animate-pulse">▊</span>
          </pre>
        </div>
      )}

      {/* Parsed idea card */}
      {!isStreaming && idea && isExpanded && (
        <AIIdeaCard idea={idea} showTicker={false} />
      )}
    </div>
  );
}

function parseStreamedIdea(text: string, ticker: string) {
  const jsonMatch = text.match(/\{[\s\S]*?\}/);
  let parsed: Record<string, unknown> = {};
  if (jsonMatch) {
    try { parsed = JSON.parse(jsonMatch[0]); } catch { /* ignore */ }
  }

  const narrativeMatch = text.match(/---NARRATIVE---\s*([\s\S]+)/);
  const summary = narrativeMatch
    ? narrativeMatch[1].trim()
    : (parsed.summary as string) ?? text.split('\n').filter(l => l.length > 20).pop() ?? '';

  return {
    ticker,
    recommendation: (parsed.recommendation as TradeIdea['recommendation']) ?? 'HOLD',
    conviction: (parsed.conviction as TradeIdea['conviction']) ?? 'LOW',
    targetPrice: (parsed.targetPrice as number) ?? null,
    keyRisks: (parsed.keyRisks as string[]) ?? [],
    keyOpportunities: (parsed.keyOpportunities as string[]) ?? [],
    callRisk: (parsed.callRisk as TradeIdea['callRisk']) ?? 'MEDIUM',
    creditRisk: (parsed.creditRisk as TradeIdea['creditRisk']) ?? 'MEDIUM',
    relativePricing: (parsed.relativePricing as TradeIdea['relativePricing']) ?? 'FAIR',
    summary,
    generatedAt: new Date().toISOString(),
    model: 'claude-sonnet-4-6',
  } satisfies TradeIdea;
}
