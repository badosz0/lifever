import {
  Component,
  Fragment,
  type ErrorInfo,
  type PropsWithChildren,
  useState,
} from "react";
import { Copy, RefreshCw, RotateCcw } from "lucide-react";

import { Titlebar } from "@/components/app-shell/titlebar";
import { Button } from "@/components/ui/button";

type AppErrorBoundaryState = {
  componentStack: string;
  error: Error | null;
  resetKey: number;
};

const initialState: AppErrorBoundaryState = {
  componentStack: "",
  error: null,
  resetKey: 0,
};

const normalizeError = (error: unknown) =>
  error instanceof Error ? error : new Error(String(error));

type AppErrorScreenProps = {
  componentStack: string;
  error: Error;
  onRetry: () => void;
};

function AppErrorScreen({
  componentStack,
  error,
  onRetry,
}: AppErrorScreenProps) {
  const [copied, setCopied] = useState(false);
  const copyDetails = async () => {
    const details = [
      `${error.name}: ${error.message}`,
      error.stack,
      componentStack,
    ]
      .filter(Boolean)
      .join("\n\n");

    try {
      await navigator.clipboard.writeText(details);
      setCopied(true);
    } catch (copyError) {
      console.warn("Could not copy crash details", copyError);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <Titlebar />
      <main className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto px-6 py-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-75"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(circle at 50% 42%, color-mix(in srgb, var(--primary) 7%, transparent), transparent 36%)",
          }}
        />
        <section
          className="relative flex w-full max-w-[390px] flex-col items-center text-center"
          role="alert"
          aria-live="assertive"
        >
          <img
            src="/icon-192.png"
            alt=""
            className="mb-7 size-[68px] rounded-[19px] shadow-[0_12px_32px_rgb(0_0_0/12%)]"
          />
          <h1 className="text-[27px] font-bold tracking-[-0.035em]">
            Lifever hit a snag.
          </h1>
          <p className="mt-2 max-w-[350px] text-[13px] leading-5 text-muted-foreground">
            This view stopped unexpectedly. Try opening it again, or reload the
            app if the problem keeps happening.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
            <Button className="h-10 rounded-xl px-4" onClick={onRetry}>
              <RotateCcw className="size-4" />
              Try again
            </Button>
            <Button
              variant="outline"
              className="h-10 rounded-xl px-4"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="size-4" />
              Reload Lifever
            </Button>
          </div>

          <details className="group mt-7 w-full border-t border-border pt-4 text-left">
            <summary className="cursor-pointer list-none text-center text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground">
              Technical details
            </summary>
            <div className="mt-3 rounded-xl bg-muted/70 p-3">
              <p className="max-h-24 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px] leading-4 text-muted-foreground">
                {error.name}: {error.message}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 h-7 px-2 text-[11px] text-muted-foreground"
                onClick={() => void copyDetails()}
              >
                <Copy className="size-3" />
                {copied ? "Copied" : "Copy details"}
              </Button>
            </div>
          </details>
        </section>
      </main>
    </div>
  );
}

export class AppErrorBoundary extends Component<
  PropsWithChildren,
  AppErrorBoundaryState
> {
  override state = initialState;

  static getDerivedStateFromError(error: unknown) {
    return { error: normalizeError(error) };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Lifever encountered an unrecoverable UI error", error, info);
    this.setState({ componentStack: info.componentStack ?? "" });
  }

  private retry = () => {
    this.setState((current) => ({
      componentStack: "",
      error: null,
      resetKey: current.resetKey + 1,
    }));
  };

  override render() {
    if (this.state.error) {
      return (
        <AppErrorScreen
          componentStack={this.state.componentStack}
          error={this.state.error}
          onRetry={this.retry}
        />
      );
    }

    return (
      <Fragment key={this.state.resetKey}>{this.props.children}</Fragment>
    );
  }
}
