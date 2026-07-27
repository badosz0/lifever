const demoBuildEnabled =
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_MODE === "true";

const demoRequested =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("__lifever_demo") ===
    "showcase";

/**
 * A deterministic, in-memory fixture used only for product screenshots.
 *
 * Normal production builds cannot enter this mode. A screenshot build must
 * opt in explicitly and still provide the private URL switch.
 */
export const isDemoMode = demoBuildEnabled && demoRequested;
