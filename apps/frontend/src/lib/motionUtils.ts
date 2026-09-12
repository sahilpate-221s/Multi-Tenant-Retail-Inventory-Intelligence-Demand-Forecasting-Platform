/**
 * Safe utility to check for prefers-reduced-motion across browsers,
 * jsdom test runners, and SSR environments.
 */
export function checkPrefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
