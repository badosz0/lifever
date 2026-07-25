(function () {
  var root = document.documentElement;
  var theme = "system";

  try {
    var stored = localStorage.getItem("lifever-theme");
    if (stored === "light" || stored === "dark" || stored === "system") {
      theme = stored;
    }
  } catch {
    // Falling back to the system theme still gives the first paint a stable color.
  }

  var resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;

  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", resolved === "dark" ? "#1c1c1e" : "#f5f5f7");
})();
