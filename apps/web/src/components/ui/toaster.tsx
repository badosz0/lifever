import { Toaster as Sonner } from "sonner";

import { useTheme } from "@/providers/theme-provider";

export function Toaster() {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={resolvedTheme}
      position="bottom-center"
      duration={6000}
      toastOptions={{
        classNames: {
          toast: "lifever-toast",
          title: "font-medium",
          description: "text-muted-foreground",
          actionButton: "lifever-toast-action",
        },
      }}
    />
  );
}
