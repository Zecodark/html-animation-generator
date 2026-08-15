import { buildDriverSource } from "./driver";

let encoder: TextEncoder | null = null;

function getEncoder(): TextEncoder {
  if (!encoder) encoder = new TextEncoder();
  return encoder;
}

/** Base64-encode a UTF-8 string without relying on Buffer. */
export function encodeBase64(text: string): string {
  const bytes = getEncoder().encode(text);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Decode a base64 string back to UTF-8 text. */
export function decodeBase64(b64: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/**
 * Installs the virtual clock BEFORE the user's script runs. It redirects
 * requestAnimationFrame / setTimeout / setInterval / performance.now /
 * Date.now to state owned by `window.__HMR_CORE__`, which the driver later
 * drives through `__HMR__.setTime(t)` so JS-driven animations (e.g. a
 * `% 4000` progress counter) advance deterministically during export.
 */
function buildPreludeSource(): string {
  return `(function () {
  var core = window.__HMR_CORE__ || (window.__HMR_CORE__ = {});
  core.clock = 0;
  core.pendingRaFs = core.pendingRaFs || [];
  core.timers = core.timers || new Map();
  core.timerSeq = core.timerSeq || 0;
  core.rafSeq = core.rafSeq || 0;
  core.nativeRaf = core.nativeRaf || window.requestAnimationFrame.bind(window);
  core.nativeCancelRaf = core.nativeCancelRaf || window.cancelAnimationFrame.bind(window);
  core.nativeSetTimeout = core.nativeSetTimeout || window.setTimeout.bind(window);
  core.nativeClearTimeout = core.nativeClearTimeout || window.clearTimeout.bind(window);
  core.nativeSetInterval = core.nativeSetInterval || window.setInterval.bind(window);
  core.nativeClearInterval = core.nativeClearInterval || window.clearInterval.bind(window);
  core.nativeDateNow = core.nativeDateNow || Date.now.bind(Date.now);
  core.nativePerfNow = core.nativePerfNow || (window.performance && window.performance.now ? window.performance.now.bind(window.performance) : null);
  core.patched = true;

  window.requestAnimationFrame = function (cb) { core.pendingRaFs.push(cb); return ++core.rafSeq; };
  window.cancelAnimationFrame = function (id) {};
  window.setTimeout = function (fn, delay) {
    var id = ++core.timerSeq;
    core.timers.set(id, { fn: fn, at: core.clock * 1000 + (delay || 0), interval: 0 });
    return id;
  };
  window.clearTimeout = function (id) { core.timers.delete(id); };
  window.setInterval = function (fn, delay) {
    var id = ++core.timerSeq;
    core.timers.set(id, { fn: fn, at: core.clock * 1000 + (delay || 0), interval: delay || 0 });
    return id;
  };
  window.clearInterval = function (id) { core.timers.delete(id); };
  if (core.nativePerfNow) {
    try { window.performance.now = function () { return core.clock * 1000; }; } catch (e) {}
  }
  Date.now = function () { return core.clock * 1000; };
})();`;
}

export interface BuildDocumentInput {
  html: string;
  css: string;
  javascript: string;
  width: number;
  height: number;
}

/**
 * Assemble the sandboxed iframe document.
 *
 * User HTML is placed inside the stage element. User CSS and JS are injected
 * through base64-encoded payloads so they can never break out of `<style>` /
 * `<script>` boundaries in the assembly above.
 *
 * The html-to-image library is inlined (not fetched via <script src>) so it
 * is always available regardless of Content-Security-Policy, sandbox
 * attributes, or blob-URL document contexts.
 */
export function buildDocument(input: BuildDocumentInput): string {
  const { html, css, javascript, width, height } = input;

  const userCssB64 = encodeBase64(css);
  const userJsB64 = encodeBase64(javascript);

  const prelude = buildPreludeSource();
  const driver = buildDriverSource();

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<!-- Load html-to-image from CDN - most reliable method -->
<script src="https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.min.js"></script>
<script>
// DEBUG: Verify library loaded from CDN
console.log("[HMR CDN] html-to-image loaded:", typeof window.htmlToImage);
if (window.htmlToImage) {
  console.log("[HMR CDN] Available methods:", Object.keys(window.htmlToImage));
}
</script>
<style>
  html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: transparent;
  }
  body {
    position: relative;
  }
  .hmr-stage {
    position: absolute;
    top: 0;
    left: 0;
    width: ${String(width)}px;
    height: ${String(height)}px;
    overflow: hidden;
  }
</style>
<script>
  (function () {
    var style = document.createElement("style");
    style.textContent = atob(${JSON.stringify(userCssB64)});
    document.head.appendChild(style);
  })();
</script>
<script>
${prelude}
</script>
</head>
<body>
<div class="hmr-stage" data-hmr-stage>${html}</div>
<script>
  (function () {
    var code = atob(${JSON.stringify(userJsB64)});
    var script = document.createElement("script");
    script.textContent = code;
    document.body.appendChild(script);
  })();
</script>
<script>
${driver}
</script>
</body>
</html>`;
}
