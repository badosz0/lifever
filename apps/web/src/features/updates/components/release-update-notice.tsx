import { ArrowUpRight, Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useReleaseUpdate } from "@/features/updates/model/use-release-update";
import { isTauri } from "@/lib/runtime";

export function ReleaseUpdateNotice() {
  const update = useReleaseUpdate();
  const [isOpening, setIsOpening] = useState(false);

  if (!update) {
    return null;
  }

  const updateUrl = update.downloadUrl ?? update.releaseUrl;

  const openUpdate = async () => {
    setIsOpening(true);

    try {
      if (isTauri) {
        const { openUrl } = await import("@tauri-apps/plugin-opener");
        await openUrl(updateUrl);
      } else {
        window.open(updateUrl, "_blank", "noopener,noreferrer");
      }
    } catch {
      toast.error("Couldn’t open the Lifever update");
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => void openUpdate()}
        disabled={isOpening}
        className="group flex min-h-11 w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left outline-none transition-[background-color,transform] duration-150 ease-[cubic-bezier(.23,1,.32,1)] hover:bg-sidebar-accent/65 active:scale-[.985] focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60 motion-reduce:transition-colors motion-reduce:active:scale-100"
        aria-label={`Download Lifever ${update.version}`}
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-sidebar-primary/10 text-sidebar-primary">
          <Download className="size-3.5" strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] leading-4 font-medium text-sidebar-foreground">
            Update available
          </span>
          <span className="block truncate text-[11px] leading-4 text-muted-foreground">
            Lifever {update.version}
          </span>
        </span>
        <ArrowUpRight
          className="size-3.5 shrink-0 text-muted-foreground/70 transition-colors group-hover:text-sidebar-primary"
          strokeWidth={1.9}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}
