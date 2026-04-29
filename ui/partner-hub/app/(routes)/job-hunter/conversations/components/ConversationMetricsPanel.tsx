import type { ConversationDailyQuota, ConversationExecutionMetrics } from "@/lib/job-hunter/conversationMetrics";

type ConversationMetricsPanelProps = {
  metrics: ConversationExecutionMetrics;
  quota: ConversationDailyQuota;
  progressPercent: number;
};

export function ConversationMetricsPanel({ metrics, quota, progressPercent }: ConversationMetricsPanelProps) {
  return <section className="space-y-3 rounded-lg border border-border/60 p-4 text-sm">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">Daily Execution Metrics</h2>
      <p className="text-sm text-foreground/70">Daily progress: <span className="font-semibold text-foreground">{progressPercent}%</span></p>
    </div>
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(0, Math.min(progressPercent, 100))}%` }} />
    </div>
    <div className="grid gap-3 md:grid-cols-3">
      <article className="rounded border border-border/40 p-3"><p className="text-xs text-foreground/70">New outreach sent today</p><p className="text-2xl font-semibold">{metrics.newOutreachSentToday} / {quota.newOutreach}</p></article>
      <article className="rounded border border-border/40 p-3"><p className="text-xs text-foreground/70">Follow-ups sent today</p><p className="text-2xl font-semibold">{metrics.followUpsSentToday} / {quota.followUps}</p></article>
      <article className="rounded border border-border/40 p-3"><p className="text-xs text-foreground/70">Replies today</p><p className="text-2xl font-semibold">{metrics.repliesToday}</p></article>
      <article className="rounded border border-border/40 p-3"><p className="text-xs text-foreground/70">Active conversations</p><p className="text-2xl font-semibold">{metrics.activeConversations}</p></article>
      <article className="rounded border border-border/40 p-3"><p className="text-xs text-foreground/70">Stale sent / no reply</p><p className="text-2xl font-semibold">{metrics.staleSentNoReply}</p></article>
    </div>
  </section>;
}
