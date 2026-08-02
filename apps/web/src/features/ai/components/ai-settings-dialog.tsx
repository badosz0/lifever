import {
  Database,
  Gauge,
  HardDrive,
  Minimize2,
  Settings2,
  ShieldCheck,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAI } from "@/features/ai/model/ai-provider";
import type { AIHistoryRange } from "@/features/ai/model/types";
import { cn } from "@/lib/cn";

type AISettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const historyOptions: { value: AIHistoryRange; label: string }[] = [
  { value: 14, label: "14 days" },
  { value: 30, label: "30 days" },
];

export function AISettingsDialog({
  open,
  onOpenChange,
}: AISettingsDialogProps) {
  const { dashboard, historyRange, setHistoryRange } = useAI();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(720px,calc(100vh-2rem))] max-w-[560px] flex-col overflow-hidden bg-popover p-0">
        <div className="border-b border-border/60 px-5 pt-5 pb-4">
          <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
            <Settings2 className="size-[18px]" />
          </div>
          <DialogTitle>AI settings</DialogTitle>
          <DialogDescription className="mt-1">
            Choose how local Codex and RTK activity is displayed.
          </DialogDescription>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <p className="mb-2 px-1 text-[9px] font-semibold tracking-[0.07em] text-muted-foreground uppercase">
            Dashboard
          </p>
          <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
            <div className="flex min-h-[58px] items-center gap-3 px-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
                <Gauge className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold">History range</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  The window shown in the token chart
                </p>
              </div>
              <div className="flex rounded-lg bg-muted p-0.5">
                {historyOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setHistoryRange(option.value)}
                    className={cn(
                      "h-7 rounded-md px-2.5 text-[10px] font-medium text-muted-foreground transition-[background-color,color,box-shadow] duration-150",
                      historyRange === option.value &&
                        "bg-card text-foreground shadow-sm",
                    )}
                    aria-pressed={historyRange === option.value}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="ml-11 h-px bg-border/55" />
            <div className="flex min-h-[58px] items-center gap-3 px-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                <HardDrive className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold">
                  Existing Codex sign-in
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  Reused securely for live OpenAI limits every 15 minutes
                </p>
              </div>
              <span
                className={cn(
                  "size-2 rounded-full",
                  dashboard?.source.codexConnected
                    ? "bg-emerald-500"
                    : "bg-muted-foreground/35",
                )}
              />
            </div>
            <div className="ml-11 h-px bg-border/55" />
            <div className="flex min-h-[58px] items-center gap-3 px-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <Minimize2 className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold">RTK compression</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {dashboard?.rtk.installed
                    ? `Reading RTK ${dashboard.rtk.version ?? "gain"} statistics locally`
                    : "Install RTK to see command-output savings"}
                </p>
              </div>
              <span
                className={cn(
                  "size-2 rounded-full",
                  dashboard?.rtk.installed
                    ? "bg-emerald-500"
                    : "bg-muted-foreground/35",
                )}
              />
            </div>
          </div>

          <p className="mt-5 mb-2 px-1 text-[9px] font-semibold tracking-[0.07em] text-muted-foreground uppercase">
            Data
          </p>
          <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
            <DataRow
              icon={Database}
              title="Local history"
              description="Aggregated from recent Codex sessions and RTK gain statistics"
            />
            <div className="ml-11 h-px bg-border/55" />
            <DataRow
              icon={ShieldCheck}
              title="Private by design"
              description="Lifever never receives prompts, messages, auth tokens, or full project paths"
            />
          </div>

          <p className="mt-4 px-1 text-[10px] leading-4 text-muted-foreground">
            Subscription limits and local token history are separate from
            organization-level OpenAI API billing. API spend requires an
            organization admin key and is not inferred from personal Codex
            usage.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DataRow({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Database;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[62px] items-center gap-3 px-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold">{title}</p>
        <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}
