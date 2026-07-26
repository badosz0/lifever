import { LoaderCircle, MessageCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type SocialProvider,
  signInWithProvider,
} from "@/lib/auth-client";

const providerLabels: Record<SocialProvider, string> = {
  discord: "Discord",
  google: "Google",
};

type SignInDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function GoogleMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-[18px]"
    >
      <path
        fill="#4285f4"
        d="M21.35 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h5.23a4.47 4.47 0 0 1-1.94 2.93v2.79h3.14c1.84-1.7 2.92-4.2 2.92-7.75Z"
      />
      <path
        fill="#34a853"
        d="M12 21.7c2.64 0 4.86-.88 6.48-2.38l-3.14-2.79c-.88.59-2 .94-3.34.94-2.56 0-4.73-1.73-5.51-4.05H3.25v2.88A9.78 9.78 0 0 0 12 21.7Z"
      />
      <path
        fill="#fbbc05"
        d="M6.49 13.42a5.89 5.89 0 0 1 0-3.84V6.7H3.25a9.72 9.72 0 0 0 0 9.6l3.24-2.88Z"
      />
      <path
        fill="#ea4335"
        d="M12 5.53c1.44 0 2.73.5 3.75 1.48l2.81-2.81C16.86 2.61 14.64 1.7 12 1.7a9.78 9.78 0 0 0-8.75 5l3.24 2.88C7.27 7.26 9.44 5.53 12 5.53Z"
      />
    </svg>
  );
}

export function SignInDialog({ open, onOpenChange }: SignInDialogProps) {
  const [signingInWith, setSigningInWith] = useState<SocialProvider | null>(
    null,
  );

  const signIn = async (provider: SocialProvider) => {
    setSigningInWith(provider);
    try {
      const result = await signInWithProvider(provider);
      if (result.error) {
        toast.error(`Couldn’t sign in with ${providerLabels[provider]}`, {
          description: result.error.message,
        });
        return;
      }
      onOpenChange(false);
    } catch {
      toast.error(`Couldn’t sign in with ${providerLabels[provider]}`, {
        description: "Please try again.",
      });
    } finally {
      setSigningInWith(null);
    }
  };

  const isSigningIn = signingInWith !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] p-0">
        <div className="border-b border-border/60 px-5 pt-5 pb-4">
          <DialogTitle>Sign in</DialogTitle>
          <DialogDescription className="mt-1">
            Choose a provider to sync Lifever across your devices.
          </DialogDescription>
        </div>

        <div className="space-y-2 px-5 py-4">
          <Button
            type="button"
            variant="outline"
            className="h-14 w-full justify-start gap-3 px-3 text-left"
            onClick={() => void signIn("discord")}
            disabled={isSigningIn}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#5865f2]/10 text-[#5865f2]">
              {signingInWith === "discord" ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <MessageCircle className="size-4" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold">
                Continue with Discord
              </span>
              <span className="mt-0.5 block text-[10px] text-muted-foreground">
                Sign in with your Discord account
              </span>
            </span>
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-14 w-full justify-start gap-3 px-3 text-left"
            onClick={() => void signIn("google")}
            disabled={isSigningIn}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background text-[#4285f4]">
              {signingInWith === "google" ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <GoogleMark />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold">
                Continue with Google
              </span>
              <span className="mt-0.5 block text-[10px] text-muted-foreground">
                Sign in with your Google account
              </span>
            </span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
