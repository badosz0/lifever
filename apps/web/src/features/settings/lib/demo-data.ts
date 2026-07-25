export const RESET_DEMO_DATA_EVENT = "lifever:reset-demo-data";

export function resetDemoData() {
  window.dispatchEvent(new Event(RESET_DEMO_DATA_EVENT));
}
