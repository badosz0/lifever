import { CheckCircle2, Clock3, HardDrive, ShieldCheck } from "lucide-react";

import { formatPlanName } from "@/features/ai/lib/ai-usage";
import { useAI } from "@/features/ai/model/ai-provider";
import { cn } from "@/lib/cn";

export function AIInspector({ className }: { className?: string }) {
  const { dashboard, loading } = useAI();

  return (
    <aside
      className={cn(
        "flex h-full w-[340px] shrink-0 flex-col overflow-hidden border-l border-border bg-card",
        className,
      )}
      aria-label="AI usage details"
    >
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <p className="text-[9px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          Account
        </p>
        <h2 className="mt-2 text-[18px] font-semibold tracking-[-0.025em]">
          {formatPlanName(dashboard?.plan ?? null)}
        </h2>
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span
            className={cn(
              "size-1.5 rounded-full",
              dashboard?.source.codexConnected
                ? "bg-emerald-500"
                : "bg-muted-foreground/35",
            )}
          />
          {loading
            ? "Connecting to OpenAI…"
            : dashboard?.source.codexConnected
              ? dashboard.source.accountSource === "codex-auth"
                ? "Live from OpenAI"
                : "Live through Codex"
              : "Live limits unavailable"}
        </div>

        <div className="my-5 h-px bg-border/60" />

        <p className="text-[9px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          Data sources
        </p>
        <div className="mt-3 space-y-3">
          <SourceRow
            icon={CheckCircle2}
            label="OpenAI account"
            value={
              dashboard?.source.codexConnected ? "Connected" : "Unavailable"
            }
          />
          <SourceRow
            icon={HardDrive}
            label="Local sessions"
            value={dashboard?.source.sessionsFound ? "Found" : "Not found"}
          />
          <SourceRow
            icon={Clock3}
            label="Last refresh"
            value={
              dashboard
                ? new Date(dashboard.collectedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—"
            }
          />
        </div>

        <div className="mt-6 flex items-start gap-2.5 border-t border-border/60 pt-4">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <p className="text-[10px] leading-4 text-muted-foreground">
            Aggregation happens on this Mac. Lifever reuses Codex’s saved
            sign-in in memory and never stores or displays credentials.
          </p>
        </div>
      </div>
    </aside>
  );
}

function SourceRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="size-3.5 text-muted-foreground" />
      <span className="min-w-0 flex-1 text-[11px] font-medium">{label}</span>
      <span className="text-[10px] text-muted-foreground">{value}</span>
    </div>
  );
}
