import { getRecentIdeas, getBatchScreenerIdeas } from '@/lib/data/ideas-store';
import { redis } from '@/lib/redis';
import { CACHE_KEYS } from '@/lib/cache-keys';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScreenerIdeas, RecentIdeasFeed } from '@/components/ai/AIIdeaFeed';
import { RunScreenerButton } from '@/components/ai/RunScreenerButton';

export const revalidate = 300;

export default async function IdeasPage() {
  const [recentIdeas, screenerIdeas, lastAIRefresh] = await Promise.all([
    getRecentIdeas(20),
    getBatchScreenerIdeas(),
    redis.get<string>(CACHE_KEYS.metaLastAIRefresh),
  ]);

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">AI Trade Ideas</h1>
          {lastAIRefresh && (
            <span className="text-xs text-muted-foreground">
              Last run: {new Date(lastAIRefresh).toLocaleString('en-US', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
              })}
            </span>
          )}
        </div>
        <RunScreenerButton />
      </div>

      <Tabs defaultValue="screener">
        <TabsList className="h-8">
          <TabsTrigger value="screener" className="text-xs h-7">
            AI Screener Top 10
          </TabsTrigger>
          <TabsTrigger value="recent" className="text-xs h-7">
            Recently Generated ({recentIdeas.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="screener" className="mt-4">
          <p className="text-xs text-muted-foreground mb-4">
            The AI screener identifies the top 10 trade ideas across all preferred stocks, categorised
            by Best YTC, Overvalued, Deep Value, Call Risk, and Income Quality.
          </p>
          <ScreenerIdeas ideas={screenerIdeas} />
        </TabsContent>

        <TabsContent value="recent" className="mt-4">
          <p className="text-xs text-muted-foreground mb-4">
            Individual trade ideas generated from stock detail pages. Click any ticker link to view full analysis.
          </p>
          <RecentIdeasFeed ideas={recentIdeas} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
