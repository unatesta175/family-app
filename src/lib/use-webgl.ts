"use client";

import { useSyncExternalStore } from "react";
import { isWebGLAvailable } from "@/lib/webgl";

// WebGL support is a fixed property of the device/browser, so it's checked once and cached.
let cached: boolean | null = null;
const noopSubscribe = () => () => {};
function clientSnapshot(): boolean | null {
  if (cached === null) cached = isWebGLAvailable();
  return cached;
}
function serverSnapshot(): boolean | null {
  return null; // unknown during SSR / first paint
}

/**
 * Whether the browser can run WebGL: `null` while unknown (SSR/first paint), then `true`/`false` once
 * checked on the client. Uses useSyncExternalStore so the check runs without setState-in-effect and
 * without a hydration mismatch warning.
 */
export function useWebGLSupported(): boolean | null {
  return useSyncExternalStore(noopSubscribe, clientSnapshot, serverSnapshot);
}
