import type { LucideIcon } from "lucide-react";
import { type ReactNode, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useOnOpen } from "@/hooks/use-on-open";
import { cn } from "@/lib/cn";

export type SettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type SettingsPage = {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  content: ReactNode;
};

type SettingsModalProps = SettingsDialogProps & {
  title: string;
  description: string;
  icon: LucideIcon;
  iconClassName?: string;
  pages: [SettingsPage, ...SettingsPage[]];
  footer?: ReactNode;
};

export function SettingsModal({
  open,
  onOpenChange,
  title,
  description,
  icon: Icon,
  iconClassName,
  pages,
  footer = "Changes are saved automatically.",
}: SettingsModalProps) {
  const [activePage, setActivePage] = useState(pages[0].id);
  const contentRef = useRef<HTMLDivElement>(null);
  const headingId = useId();
  useOnOpen(open, () => setActivePage(pages[0].id));
  const page = pages.find((item) => item.id === activePage) ?? pages[0];

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (
          !nextOpen &&
          document.activeElement instanceof HTMLElement &&
          contentRef.current?.contains(document.activeElement)
        )
          document.activeElement.blur();
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        ref={contentRef}
        onEscapeKeyDown={(event) => {
          if (
            event.target instanceof HTMLElement &&
            event.target.dataset.settingsDraft === "true"
          )
            event.preventDefault();
        }}
        className="flex h-[min(780px,calc(100dvh-1.5rem))] w-[calc(100%-1.5rem)] max-w-[1000px] flex-col gap-0 overflow-visible rounded-2xl p-0 sm:h-[min(780px,calc(100dvh-3rem))] sm:w-[calc(100%-3rem)] sm:rounded-[22px] [&>button:last-child]:top-5 [&>button:last-child]:right-5"
      >
        <header className="flex shrink-0 items-center gap-3.5 rounded-t-2xl sm:rounded-t-[22px] border-b border-border/60 bg-popover px-5 py-5 pr-16 sm:px-7 sm:py-6 sm:pr-16">
          <div
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary",
              iconClassName,
            )}
          >
            <Icon className="size-5" strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <DialogTitle className="text-lg tracking-[-0.025em]">
              {title}
            </DialogTitle>
            <DialogDescription className="mt-1 text-[13px] leading-5 [overflow-wrap:anywhere]">
              {description}
            </DialogDescription>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
          {pages.length > 1 ? (
            <nav
              aria-label={`${title} sections`}
              className="flex shrink-0 gap-1 overflow-x-auto border-b border-border/60 bg-muted/45 p-2 md:w-[204px] md:flex-col md:gap-1.5 md:overflow-x-hidden md:overflow-y-auto md:border-r md:border-b-0 md:p-3"
            >
              {pages.map((item) => {
                const PageIcon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={page.id === item.id ? "page" : undefined}
                    onClick={() => setActivePage(item.id)}
                    className={cn(
                      "flex min-h-10 shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] font-medium whitespace-nowrap outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
                      page.id === item.id
                        ? "bg-background text-primary shadow-[0_1px_3px_rgb(0_0_0/.07)]"
                        : "text-muted-foreground hover:bg-background/65 hover:text-foreground",
                    )}
                  >
                    <PageIcon className="size-4 shrink-0" strokeWidth={1.8} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          ) : null}

          <section
            key={page.id}
            aria-labelledby={headingId}
            className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain bg-background px-5 py-6 sm:px-8 sm:py-8"
          >
            <div className="mx-auto w-full max-w-[720px]">
              <div className="mb-7">
                <h2
                  id={headingId}
                  className="text-[22px] leading-7 font-semibold tracking-[-0.025em]"
                >
                  {page.label}
                </h2>
                <p className="mt-1.5 max-w-xl text-[13px] leading-5 text-muted-foreground">
                  {page.description}
                </p>
              </div>
              <div className="space-y-7">{page.content}</div>
            </div>
          </section>
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-4 rounded-b-2xl sm:rounded-b-[22px] border-t border-border/60 bg-popover px-5 py-4 sm:px-7">
          <div className="text-xs leading-5 text-muted-foreground">
            {footer}
          </div>
          <DialogClose asChild>
            <Button className="min-w-20">Done</Button>
          </DialogClose>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

export function SettingsSection({
  title,
  description,
  action,
  children,
  destructive = false,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  destructive?: boolean;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="space-y-3">
      <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <h3
            id={id}
            className={cn(
              "text-sm font-semibold",
              destructive && "text-destructive",
            )}
          >
            {title}
          </h3>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function SettingsGroup({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SettingsRow({
  title,
  description,
  children,
  controlId,
  inline = false,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  controlId?: string;
  inline?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex gap-x-6 gap-y-3 px-4 py-4 sm:px-5",
        inline ? "items-center" : "flex-col sm:flex-row sm:items-center",
      )}
    >
      <div className="min-w-0 flex-1">
        {controlId ? (
          <label
            htmlFor={controlId}
            className="block text-[13px] leading-5 font-medium"
          >
            {title}
          </label>
        ) : (
          <p className="text-[13px] leading-5 font-medium">{title}</p>
        )}
        {description ? (
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <div
        className={cn(
          "min-w-0 shrink-0 [&_[role=combobox]>span:first-child]:truncate",
          !inline && "w-full sm:w-[190px]",
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function SettingsToggle({
  title,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  title: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <SettingsRow title={title} description={description} controlId={id} inline>
      <Switch
        id={id}
        aria-label={title}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </SettingsRow>
  );
}
