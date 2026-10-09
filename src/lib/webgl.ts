/** Whether this browser can create a WebGL context — needed for the Three.js garden and lantern.
 *  Returns false when hardware acceleration is off, the GPU is blocklisted, or WebGL is disabled,
 *  so callers can show a graceful 2D fallback instead of a blank canvas. */
export function isWebGLAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    return Boolean(window.WebGLRenderingContext && gl);
  } catch {
    return false;
  }
}
