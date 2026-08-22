import { buildTsxDriverSource } from "./tsxDriver";
import { encodeBase64 } from "../preview/documentBuilder";

export interface BuildTsxDocumentInput {
  /** Compiled JS code (already transformed from TSX via Sucrase). */
  compiledJs: string;
  /** User CSS. */
  css: string;
  width: number;
  height: number;
}

/**
 * The virtual clock prelude — identical to the one in documentBuilder.ts.
 * Redirects requestAnimationFrame / setTimeout / setInterval / performance.now /
 * Date.now to the deterministic clock driven by the driver.
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
  var originalCreateElement = window.React.createElement;
  window.React.createElement = function(type, props) {
    var children = Array.prototype.slice.call(arguments, 2);
    if (type === 'style' && children.length > 0) {
      // React 18 has a known bug/quirk where text nodes inside <style> tags can cause 
      // "Failed to execute 'removeChild'" during re-renders. 
      // We automatically convert them to dangerouslySetInnerHTML to prevent this.
      var styleStr = children.join('');
      var newProps = Object.assign({}, props, {
        dangerouslySetInnerHTML: { __html: styleStr }
      });
      return originalCreateElement.call(window.React, type, newProps);
    }
    return originalCreateElement.apply(window.React, arguments);
  };

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

/**
 * Build the TSX preview iframe document.
 *
 * Structure:
 *   1. Load React + ReactDOM from esm.sh CDN (UMD builds for global scope)
 *   2. Load html-to-image from CDN (needed for frame capture)
 *   3. Install virtual clock prelude (deterministic animations)
 *   4. Inject user CSS via base64 decode
 *   5. Mount user's compiled JS which should call ReactDOM.createRoot + render
 *   6. Install the driver (postMessage bridge for frame capture)
 */
export function buildTsxDocument(input: BuildTsxDocumentInput): string {
  const { compiledJs, css, width, height } = input;

  const userCssB64 = encodeBase64(css);
  const userJsB64 = encodeBase64(compiledJs);

  const prelude = buildPreludeSource();
  const driver = buildTsxDriverSource();

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<!-- React + ReactDOM UMD (global scope) -->
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<!-- html-to-image for frame capture -->
<script src="https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.min.js"></script>
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
<div class="hmr-stage" data-hmr-stage id="tsx-root"></div>
<script id="hmr-user-script">
  (function () {
    var code = atob(${JSON.stringify(userJsB64)});

    // Provide a simple CommonJS environment for the compiled TSX
    window.exports = {};
    window.module = { exports: window.exports };
    window.require = function(moduleName) {
      if (moduleName === "react") return window.React;
      if (moduleName === "react-dom" || moduleName === "react-dom/client") return window.ReactDOM;
      throw new Error("Cannot resolve module '" + moduleName + "' in preview environment.\\nReact and ReactDOM are provided automatically.");
    };

    // Store the compiled user code globally so it can be re-executed on restart
    // Wrap in a CommonJS-like function scope
    window.__HMR_USER_CODE__ = '(function(exports, require, module){' + code + '\\n})(window.exports, window.require, window.module);';

    // Function to execute user code
    window.__HMR_EXECUTE_USER_CODE__ = function() {
      try {
        // Reset exports for each execution
        window.exports = {};
        window.module.exports = window.exports;

        (0, eval)(window.__HMR_USER_CODE__);

        // Auto-mount default export if it's a React component
        if (window.exports.default && window.React && window.ReactDOM) {
          var Component = window.exports.default;
          var stage = document.getElementById('tsx-root');
          if (stage) {
            if (!window.__HMR_REACT_ROOT__) {
              window.__HMR_REACT_ROOT__ = window.ReactDOM.createRoot(stage);
            }
            
            var element;
            if (Component && typeof Component === 'object' && Component.$$typeof === Symbol.for('react.element')) {
              element = Component;
            } else {
              element = window.React.createElement(Component);
            }

            // Wrap in ErrorBoundary to gracefully catch React commit/render phase errors
            class ErrorBoundary extends window.React.Component {
              constructor(props) { super(props); this.state = { error: null }; }
              static getDerivedStateFromError(error) { return { error: error }; }
              render() {
                if (this.state.error) {
                  return window.React.createElement('div', { 
                    style: { padding: '24px', color: '#f87171', fontFamily: 'monospace', fontSize: '12px', background: '#1c1917', border: '1px solid #7f1d1d', borderRadius: '12px', margin: '16px' } 
                  }, window.React.createElement('strong', { style: { fontSize: '13px' } }, 'React Runtime Error\\n\\n'), String(this.state.error.message || this.state.error));
                }
                return this.props.children;
              }
            }

            // Force a full unmount and remount on every EVAL by using a unique key
            var mountKey = 'mount_' + Date.now() + '_' + Math.random();
            var wrappedElement = window.React.createElement(ErrorBoundary, { key: mountKey }, element);
            
            window.__HMR_REACT_ROOT__.render(wrappedElement);
          }
        }
      } catch (e) {
        console.error('[HMR TSX] Failed to execute user code:', e);
        if (window.__HMR_REACT_ROOT__) {
          try { window.__HMR_REACT_ROOT__.unmount(); } catch(err) {}
          window.__HMR_REACT_ROOT__ = null;
        }
        var stage = document.getElementById('tsx-root');
        if (stage) {
          stage.innerHTML = '<div style="padding:24px;color:#f87171;font-family:monospace;font-size:12px;white-space:pre-wrap;background:#1c1917;border-radius:12px;margin:16px;border:1px solid #7f1d1d;">' +
            '<strong style="font-size:13px;">Evaluation Error</strong>\\n\\n' + String(e.message || e) + '</div>';
        }
      }
    };

    // Execute user code on initial load
    window.__HMR_EXECUTE_USER_CODE__();
  })();
</script>
<script>
${driver}
</script>
</body>
</html>`;
}
