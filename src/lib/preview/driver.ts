/**
 * The driver script is injected into the sandboxed iframe document.
 *
 * It virtualizes the animation clock so the parent can drive time
 * deterministically (frame-by-frame during render, real-time during preview):
 *
 *   - requestAnimationFrame / performance.now / Date.now are driven by a
 *     virtual clock controlled through `__HMR__.setTime(t)`.
 *   - CSS animations / transitions are paused and their `currentTime` is set
 *     from the same clock via the Web Animations API.
 *   - setTimeout / setInterval are virtualized so JS animations stay
 *     deterministic across renders.
 *   - `__HMR__.capture()` renders the stage to a PNG blob through html-to-image
 *     while applying the selected fit/crop alignment inside an output wrapper.
 *
 * The virtual clock is installed by a small prelude injected BEFORE the user
 * script (see documentBuilder), so user code scheduled with requestAnimationFrame
 * / setTimeout already observes virtual time. This driver reads the shared state
 * from `window.__HMR_CORE__`.
 *
 * The parent communicates only via postMessage. The parent DOM is never
 * exposed to user code.
 */
export function buildDriverSource(): string {
  return `
(function () {
  "use strict";
  var HMR_STAGE_SELECTOR = "[data-hmr-stage]";
  
  // DEBUG: Log library status at driver initialization
  console.log("[HMR Driver Init] window.htmlToImage:", window.htmlToImage);
  console.log("[HMR Driver Init] typeof window.htmlToImage:", typeof window.htmlToImage);
  if (window.htmlToImage) {
    console.log("[HMR Driver Init] window.htmlToImage.toBlob:", typeof window.htmlToImage.toBlob);
  }

  var core = window.__HMR_CORE__;
  if (!core || typeof core !== "object") {
    core = window.__HMR_CORE__ = { clock: 0, pendingRaFs: [], timers: new Map(), timerSeq: 0, rafSeq: 0 };
  }
  if (!core.pendingRaFs) core.pendingRaFs = [];
  if (!core.timers) core.timers = new Map();
  if (!core.timerSeq) core.timerSeq = 0;
  if (!core.rafSeq) core.rafSeq = 0;

  var nativeRaf = core.nativeRaf || (core.nativeRaf = window.requestAnimationFrame.bind(window));
  var nativeSetTimeout = core.nativeSetTimeout || (core.nativeSetTimeout = window.setTimeout.bind(window));
  var nativeClearTimeout = core.nativeClearTimeout || (core.nativeClearTimeout = window.clearTimeout.bind(window));
  var nativeDateNow = core.nativeDateNow || (core.nativeDateNow = Date.now.bind(Date.now));

  var pendingRaFs = core.pendingRaFs;
  var timers = core.timers;

  // Install the virtual clock if the prelude did not run (e.g. calling the
  // driver directly during development).
  if (!core.patched) {
    core.patched = true;
    window.requestAnimationFrame = function (cb) { pendingRaFs.push(cb); return ++core.rafSeq; };
    window.cancelAnimationFrame = function () {};
    window.setTimeout = function (fn, delay) {
      var id = ++core.timerSeq;
      timers.set(id, { fn: fn, at: core.clock * 1000 + (delay || 0), interval: 0 });
      return id;
    };
    window.clearTimeout = function (id) { timers.delete(id); };
    window.setInterval = function (fn, delay) {
      var id = ++core.timerSeq;
      timers.set(id, { fn: fn, at: core.clock * 1000 + (delay || 0), interval: delay || 0 });
      return id;
    };
    window.clearInterval = function (id) { timers.delete(id); };
    if (window.performance) {
      try { window.performance.now = function () { return core.clock * 1000; }; } catch (e) {}
    }
    Date.now = function () { return core.clock * 1000; };
  }

  var autoCapture = false;
  var frameSeq = 0;
  var renderConfig = {
    width: 1920,
    height: 1080,
    transparent: true,
    backgroundColor: null,
    sourceWidth: 1920,
    sourceHeight: 1080,
    fit: "contain",
    alignX: "center",
    alignY: "center",
    scale: 1,
    panX: 0,
    panY: 0
  };
  var stageConfig = { width: 1920, height: 1080, scale: 1, panX: 0, panY: 0 };
  // Live export framing: when enabled, the preview shows the output frame
  // (selected export resolution) with the content laid out exactly as the
  // render will produce — a responsive WYSIWYG preview.
  var frameConfig = {
    enabled: false,
    width: 1920,
    height: 1080,
    fit: "contain",
    alignX: "center",
    alignY: "center",
    objectScale: 1
  };
  var outputEl = null;
  var frameOverlay = null;

  function post(type, payload, transfer) {
    try {
      var msg = { type: type, hmr: "1.0.0" };
      if (payload) for (var k in payload) msg[k] = payload[k];
      (window.parent || {}).postMessage(msg, "*", transfer || []);
    } catch (e) {}
  }

  function getStage() {
    return document.querySelector(HMR_STAGE_SELECTOR);
  }

  function getOutput() {
    if (outputEl) return outputEl;
    var stage = getStage();
    outputEl = document.createElement("div");
    outputEl.id = "hmr-output";
    outputEl.style.position = "absolute";
    outputEl.style.top = "0px";
    outputEl.style.left = "0px";
    outputEl.style.overflow = "hidden";
    document.body.insertBefore(outputEl, document.body.firstChild);
    if (stage) outputEl.appendChild(stage);
    return outputEl;
  }

  function getFrameOverlay() {
    if (frameOverlay) return frameOverlay;
    frameOverlay = document.createElement("div");
    frameOverlay.id = "hmr-frame";
    frameOverlay.style.position = "absolute";
    frameOverlay.style.pointerEvents = "none";
    frameOverlay.style.boxSizing = "border-box";
    frameOverlay.style.border = "1px dashed rgba(255,140,20,0.9)";
    frameOverlay.style.zIndex = "999999";
    frameOverlay.style.display = "none";
    document.body.appendChild(frameOverlay);
    return frameOverlay;
  }

  function syncAnimations(t) {
    var ms = t * 1000;
    var anims = [];
    try { anims = document.getAnimations() || []; } catch (e) { return; }
    for (var i = 0; i < anims.length; i++) {
      var a = anims[i];
      try {
        // If seeking to time 0, restart the animation completely
        // This ensures animations with fill-mode:forwards reset properly
        if (t === 0) {
          // Cancel and restart the animation
          var effect = a.effect;
          var timeline = a.timeline;
          a.cancel();
          a.effect = effect;
          a.timeline = timeline;
          if (!a.pending) { a.pause(); }
          a.currentTime = 0;
        } else {
          if (!a.pending) { a.pause(); }
          a.currentTime = ms;
        }
      } catch (e) {
        // Fallback if cancel/restart fails
        try {
          if (!a.pending) { a.pause(); }
          a.currentTime = ms;
        } catch (e2) {}
      }
    }
  }

  function fireTimers(t) {
    var now = t * 1000;
    var entries = Array.from(timers.entries());
    for (var i = 0; i < entries.length; i++) {
      var id = entries[i][0];
      var tm = entries[i][1];
      if (now >= tm.at) {
        try { tm.fn(); } catch (e) {}
        if (tm.interval > 0) { tm.at += tm.interval; }
        else timers.delete(id);
      }
    }
  }

  function flushRaFs(t) {
    var cbs = pendingRaFs.splice(0);
    for (var i = 0; i < cbs.length; i++) {
      try { cbs[i](t * 1000); } catch (e) {}
    }
  }

  function setTime(t) {
    if (typeof t !== "number" || !isFinite(t)) return;
    
    // If seeking back to time 0, we need to reset the entire animation state
    if (t === 0 && core.clock !== 0) {
      // Clear all pending timers and RAF callbacks
      timers.clear();
      pendingRaFs.length = 0;
      
      // Reset DOM to initial state by re-executing user code
      if (typeof window.__HMR_EXECUTE_USER_CODE__ === 'function') {
        try {
          // Reset stage HTML to initial state ONLY for non-React environments.
          // For React, __HMR_EXECUTE_USER_CODE__ will trigger a render with a new key,
          // cleanly remounting the component. Touching innerHTML breaks React's virtual DOM!
          if (!window.__HMR_REACT_ROOT__) {
            var stage = getStage();
            if (stage && window.__HMR_INITIAL_HTML__) {
              stage.innerHTML = window.__HMR_INITIAL_HTML__;
            }
          }
          
          // Re-execute user JavaScript (this will remount React with a fresh key)
          window.__HMR_EXECUTE_USER_CODE__();
        } catch (e) {
          console.error('[HMR] Failed to reset user code:', e);
        }
      }
    }
    
    core.clock = t;
    syncAnimations(t);
    fireTimers(t);
    flushRaFs(t);
    if (autoCapture) {
      doCapture().catch(function (err) {
        post("ERROR", { message: String((err && err.message) || err) });
      });
    }
  }

  function nextNativeTick() {
    return new Promise(function (resolve) { nativeSetTimeout(resolve, 10); });
  }

  // Compute how the source canvas (sw x sh) is placed into an output frame
  // (outW x outH) given fit/zoom/pan. Shared by preview framing and render.
  function computePlacement(outW, outH, opt) {
    var cs = opt.scale || 1;
    var sw = opt.sw, sh = opt.sh;
    var fx = outW / sw;
    var fy = outH / sh;
    var scaleX, scaleY;
    if (opt.fit === "cover") {
      var F = Math.max(fx, fy);
      scaleX = scaleY = F * cs;
    } else if (opt.fit === "fill") {
      scaleX = fx * cs;
      scaleY = fy * cs;
    } else {
      var F2 = Math.min(fx, fy);
      scaleX = scaleY = F2 * cs;
    }
    var cw = sw * scaleX;
    var ch = sh * scaleY;
    var ox = opt.alignX === "left" ? 0 : opt.alignX === "right" ? outW - cw : (outW - cw) / 2;
    var oy = opt.alignY === "top" ? 0 : opt.alignY === "bottom" ? outH - ch : (outH - ch) / 2;
    ox += ((opt.panX || 0) / 100) * sw * scaleX;
    oy += ((opt.panY || 0) / 100) * sh * scaleY;
    return { scaleX: scaleX, scaleY: scaleY, ox: ox, oy: oy };
  }

  function fitTransform(w, h) {
    // Object/content zoom (cs) MULTIPLIES the fit scale — this is the
    // "fixed base viewport + CSS transform scale" approach from the plan:
    // the base canvas is first fit into the output frame, then cs zooms in/out
    // around the frame center so bigger resolutions can show the object bigger.
    var sw = renderConfig.sourceWidth || stageConfig.width;
    var sh = renderConfig.sourceHeight || stageConfig.height;
    var p = computePlacement(w, h, {
      fit: renderConfig.fit || "contain",
      alignX: renderConfig.alignX || "center",
      alignY: renderConfig.alignY || "center",
      scale: renderConfig.scale || stageConfig.scale || 1,
      panX: renderConfig.panX !== undefined ? renderConfig.panX : stageConfig.panX || 0,
      panY: renderConfig.panY !== undefined ? renderConfig.panY : stageConfig.panY || 0,
      sw: sw,
      sh: sh
    });
    var transform = "scale(" + p.scaleX + (p.scaleX !== p.scaleY ? "," + p.scaleY : "") + ")";
    if (p.ox !== 0 || p.oy !== 0) {
      transform = "translate(" + p.ox + "px," + p.oy + "px) " + transform;
    }
    return { transform: transform, sw: sw, sh: sh };
  }

  async function doCapture() {
    var stage = getStage();
    if (!stage) throw new Error("Stage element not found");
    
    // Always read htmlToImage from window at capture time, not at initialization time
    var htmlToImage = window.htmlToImage;
    console.log("[HMR Capture] window.htmlToImage:", htmlToImage);
    console.log("[HMR Capture] typeof htmlToImage:", typeof htmlToImage);
    
    if (!htmlToImage || typeof htmlToImage.toBlob !== "function") {
      console.error("[HMR Capture] Library check failed:");
      console.error("  - window.htmlToImage exists:", !!window.htmlToImage);
      console.error("  - htmlToImage exists:", !!htmlToImage);
      console.error("  - typeof htmlToImage.toBlob:", htmlToImage ? typeof htmlToImage.toBlob : "N/A");
      throw new Error("html-to-image capture library failed to load");
    }
    var out = getOutput();
    var w = renderConfig.width, h = renderConfig.height;
    var sw = renderConfig.sourceWidth || stageConfig.width;
    var sh = renderConfig.sourceHeight || stageConfig.height;
    var prev = {
      transform: stage.style.transform,
      transformOrigin: stage.style.transformOrigin,
      width: stage.style.width,
      height: stage.style.height,
      left: stage.style.left,
      top: stage.style.top
    };
    var prevOutW = out.style.width;
    var prevOutH = out.style.height;
    var prevBodyTransform = document.body.style.transform;
    var prevRaf = window.requestAnimationFrame;
    var prevPerf = (window.performance && window.performance.now);
    try {
      // Hide the stage from the live viewport by translating the BODY, not the
      // stage: html-to-image clones the node WITH its computed styles, so an
      // off-screen "left" on the stage itself would be copied into every
      // exported frame and produce empty (black) output.
      document.body.style.transform = "translateX(-20000px)";
      out.style.width = w + "px";
      out.style.height = h + "px";
      stage.style.left = "0px";
      stage.style.top = "0px";
      stage.style.width = sw + "px";
      stage.style.height = sh + "px";
      var ft = fitTransform(w, h);
      stage.style.transform = ft.transform;
      stage.style.transformOrigin = "0 0";
      window.requestAnimationFrame = nativeRaf;
      if (window.performance) {
        try { window.performance.now = function () { return nativeDateNow(); }; } catch (e) {}
      }
      await nextNativeTick();
      
      // Use higher pixelRatio for better quality, but bound the total capture
      // pixels so large (4K) exports don't allocate enormous canvases.
      var devicePixelRatio = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
      var targetPixelRatio = Math.min(devicePixelRatio, 3);
      var captureBudget = 4096 * 2160;
      if (w * h * targetPixelRatio * targetPixelRatio > captureBudget) {
        targetPixelRatio = Math.max(1, Math.sqrt(captureBudget / (w * h)));
      }
      
      var opts = {
        width: w,
        height: h,
        pixelRatio: targetPixelRatio,
        cacheBust: true,
        skipAutoScale: true,
        // Failed images render as a transparent pixel instead of aborting the capture.
        imagePlaceholder: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
      };
      if (!renderConfig.transparent && renderConfig.backgroundColor) {
        opts.backgroundColor = renderConfig.backgroundColor;
      }
      var blob = await htmlToImage.toBlob(out, opts);
      var bitmap = await createImageBitmap(blob);
      frameSeq += 1;
      post("FRAME", { index: frameSeq, bitmap: bitmap }, [bitmap]);
    } finally {
      window.requestAnimationFrame = prevRaf;
      if (window.performance && prevPerf) {
        try { window.performance.now = prevPerf; } catch (e) {}
      }
      document.body.style.transform = prevBodyTransform;
      stage.style.transform = prev.transform;
      stage.style.transformOrigin = prev.transformOrigin;
      stage.style.width = prev.width;
      stage.style.height = prev.height;
      stage.style.left = prev.left;
      stage.style.top = prev.top;
      out.style.width = prevOutW;
      out.style.height = prevOutH;
      layout();
    }
  }

  function layout() {
    var stage = getStage();
    if (!stage) return;
    var vw = window.innerWidth || 1;
    var vh = window.innerHeight || 1;
    var out = getOutput();
    var overlay = getFrameOverlay();

    if (frameConfig.enabled && frameConfig.width > 0 && frameConfig.height > 0) {
      // Responsive WYSIWYG: fit the selected export frame into the panel, then
      // place the content inside it exactly as the render will (fit/zoom/pan).
      var ds = Math.min(vw / frameConfig.width, vh / frameConfig.height);
      if (!isFinite(ds) || ds <= 0) ds = 1;
      var fw = frameConfig.width * ds;
      var fh = frameConfig.height * ds;
      var fx = (vw - fw) / 2;
      var fy = (vh - fh) / 2;
      var p = computePlacement(frameConfig.width, frameConfig.height, {
        fit: frameConfig.fit,
        alignX: frameConfig.alignX,
        alignY: frameConfig.alignY,
        scale: (stageConfig.scale || 1) * (frameConfig.objectScale || 1),
        panX: stageConfig.panX || 0,
        panY: stageConfig.panY || 0,
        sw: stageConfig.width,
        sh: stageConfig.height
      });
      var sx = p.scaleX * ds;
      var sy = p.scaleY * ds;
      var tx = fx + p.ox * ds;
      var ty = fy + p.oy * ds;
      stage.style.transform = "translate(" + tx + "px," + ty + "px) scale(" + sx + (sx !== sy ? "," + sy : "") + ")";
      stage.style.transformOrigin = "0 0";
      out.style.left = fx + "px";
      out.style.top = fy + "px";
      out.style.width = fw + "px";
      out.style.height = fh + "px";
      overlay.style.left = fx + "px";
      overlay.style.top = fy + "px";
      overlay.style.width = fw + "px";
      overlay.style.height = fh + "px";
      overlay.style.display = "block";
    } else {
      var cs = stageConfig.scale || 1;
      var w = stageConfig.width, h = stageConfig.height;
      var fitScale = Math.min(vw / w, vh / h);
      if (!isFinite(fitScale) || fitScale <= 0) fitScale = 1;
      var sx2 = fitScale * cs;
      var cw = w * sx2, ch = h * sx2;
      var tx2 = (vw - cw) / 2 + ((stageConfig.panX || 0) / 100) * w * sx2;
      var ty2 = (vh - ch) / 2 + ((stageConfig.panY || 0) / 100) * h * sx2;
      stage.style.transform = "translate(" + tx2 + "px," + ty2 + "px) scale(" + sx2 + ")";
      stage.style.transformOrigin = "0 0";
      out.style.left = "0px";
      out.style.top = "0px";
      out.style.width = vw + "px";
      out.style.height = vh + "px";
      overlay.style.display = "none";
    }
  }

  function configure(cfg) {
    if (cfg && cfg.width && cfg.height) {
      stageConfig.width = cfg.width;
      stageConfig.height = cfg.height;
    }
    if (cfg && typeof cfg.scale === "number" && isFinite(cfg.scale)) {
      stageConfig.scale = cfg.scale;
    }
    if (cfg && typeof cfg.panX === "number" && isFinite(cfg.panX)) {
      stageConfig.panX = cfg.panX;
    }
    if (cfg && typeof cfg.panY === "number" && isFinite(cfg.panY)) {
      stageConfig.panY = cfg.panY;
    }
    if (cfg && "backgroundColor" in cfg) {
      // Show a preview backdrop for solid-color backgrounds (e.g. green/blue
      // screen presets) so the user sees it, not only in the exported render.
      document.body.style.background =
        cfg.backgroundColor && cfg.backgroundColor !== "transparent"
          ? cfg.backgroundColor
          : "transparent";
    }
    var stage = getStage();
    if (stage) {
      stage.style.width = stageConfig.width + "px";
      stage.style.height = stageConfig.height + "px";
      layout();
    }
  }

  window.__HMR__ = {
    setTime: setTime,
    getTime: function () { return core.clock; },
    get width() { return stageConfig.width; },
    get height() { return stageConfig.height; },
    configure: configure,
    capture: doCapture
  };

  window.addEventListener("resize", function () { layout(); });

  window.addEventListener("message", function (event) {
    var data = event.data;
    if (!data || typeof data !== "object" || !data.type) return;
    switch (data.type) {
      case "SET_TIME":
        setTime(data.time);
        break;
      case "RENDER_START":
        autoCapture = true;
        renderConfig = {
          width: data.width || 1920,
          height: data.height || 1080,
          transparent: data.transparent !== false,
          backgroundColor: data.backgroundColor || null,
          sourceWidth: data.sourceWidth || stageConfig.width,
          sourceHeight: data.sourceHeight || stageConfig.height,
          fit: data.fit || "contain",
          alignX: data.alignX || "center",
          alignY: data.alignY || "center",
          scale: typeof data.scale === "number" ? data.scale : stageConfig.scale || 1,
          panX: typeof data.panX === "number" ? data.panX : stageConfig.panX || 0,
          panY: typeof data.panY === "number" ? data.panY : stageConfig.panY || 0
        };
        break;
      case "RENDER_END":
        autoCapture = false;
        break;
      case "SET_BACKGROUND":
        renderConfig.backgroundColor = data.color || null;
        break;
      case "CONFIGURE":
        configure(data);
        break;
      case "PREVIEW_FRAME":
        frameConfig.enabled = data.enabled !== false;
        if (data.width && data.height) {
          frameConfig.width = data.width;
          frameConfig.height = data.height;
        }
        if (typeof data.fit === "string") frameConfig.fit = data.fit;
        if (typeof data.alignX === "string") frameConfig.alignX = data.alignX;
        if (typeof data.alignY === "string") frameConfig.alignY = data.alignY;
        if (typeof data.objectScale === "number") frameConfig.objectScale = data.objectScale;
        layout();
        break;
    }
  });

  function boot() {
    try {
      getOutput();
      configure(stageConfig);
      
      // Backup initial HTML for restart functionality
      var stage = getStage();
      if (stage && !window.__HMR_INITIAL_HTML__) {
        window.__HMR_INITIAL_HTML__ = stage.innerHTML;
      }
      
      // Drive all CSS animations off the virtual clock immediately.
      syncAnimations(0);
      post("READY", { version: "1.0.0", width: stageConfig.width, height: stageConfig.height });
    } catch (e) {
      post("ERROR", { message: String((e && e.message) || e) });
    }
  }

  window.addEventListener("error", function (event) {
    // Resource load errors (broken images/fonts/stylesheets) are non-fatal and
    // fire with event.error unset. Only report uncaught script errors.
    if (!event || !event.error) return;
    var err = event.error || {};
    post("ERROR", { message: String(err.message || event.message || "Unknown script error") });
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
`;
}
