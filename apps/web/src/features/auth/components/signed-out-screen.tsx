import { LoaderCircle, LogIn } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Titlebar } from "@/components/app-shell/titlebar";
import { Button } from "@/components/ui/button";
import { signInWithDiscord } from "@/lib/auth-client";

export function SignedOutScreen() {
  const [isSigningIn, setIsSigningIn] = useState(false);

  const signIn = async () => {
    setIsSigningIn(true);
    try {
      const result = await signInWithDiscord();
      if (result.error) {
        toast.error("Couldn’t sign in with Discord", {
          description: result.error.message,
        });
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <Titlebar />
      <main className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-6">
        <div
          className="pointer-events-none absolute inset-0 opacity-75"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(circle at 50% 42%, color-mix(in srgb, var(--primary) 7%, transparent), transparent 36%)",
          }}
        />
        <div className="relative flex w-full max-w-[360px] flex-col items-center text-center">
          <img
            src="/icon-192.png"
            alt=""
            className="mb-7 size-[72px] rounded-[20px] shadow-[0_12px_32px_rgb(0_0_0/12%)]"
          />
          <h1 className="text-[28px] font-bold tracking-[-0.035em] text-foreground">
            Your life, in one place.
          </h1>
          <p className="mt-2 max-w-[330px] text-[13px] leading-5 text-muted-foreground">
            Sign in to keep reminders, calendars, notes, and projects in sync
            across your devices.
          </p>
          <Button
            className="mt-7 h-10 min-w-[190px] gap-2 rounded-xl"
            onClick={() => void signIn()}
            disabled={isSigningIn}
          >
            {isSigningIn ? (
              <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />
            ) : (
              <LogIn className="size-4" />
            )}
            Continue with Discord
          </Button>
        </div>
      </main>
    </div>
  );
}
