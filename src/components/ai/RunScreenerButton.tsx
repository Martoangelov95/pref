'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export function RunScreenerButton() {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const run = async () => {
    setState('running');
    setMessage('');
    try {
      const res = await fetch('/api/cron/refresh-ai-ideas');
      const data = await res.json();
      if (!res.ok || !data.success) {
        setState('error');
        setMessage(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setState('done');
      setMessage(`Generated ${data.ideasGenerated} ideas from ${data.stocksAnalyzed} stocks`);
      router.refresh();
    } catch (err) {
      setState('error');
      setMessage((err as Error).message ?? 'Network error');
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Button
        size="sm"
        variant={state === 'done' ? 'outline' : 'default'}
        className="gap-1.5 h-8 text-xs"
        onClick={run}
        disabled={state === 'running'}
      >
        {state === 'running' ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin" />Running screener…</>
        ) : state === 'done' ? (
          <><CheckCircle className="h-3.5 w-3.5 text-green-600" />Run again</>
        ) : (
          <><Sparkles className="h-3.5 w-3.5" />Run AI Screener</>
        )}
      </Button>

      {state === 'done' && message && (
        <span className="text-xs text-green-600 dark:text-green-400">{message}</span>
      )}
      {state === 'error' && (
        <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
          <AlertCircle className="h-3.5 w-3.5" />
          {message || 'Something went wrong'}
        </span>
      )}
    </div>
  );
}
