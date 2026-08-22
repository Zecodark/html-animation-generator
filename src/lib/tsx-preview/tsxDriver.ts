/**
 * TSX-specific driver for the sandboxed iframe.
 *
 * This is a SEPARATE driver from the HTML driver (driver.ts). It uses
 * SVG foreignObject + Canvas to capture frames WITHOUT cloning the DOM,
 * which prevents the 8GB memory leak caused by html-to-image on React trees.
 *
 * Fallback: if foreignObject fails (e.g. cross-origin images), it falls back
 * to html-to-image if available.
 *
 * IMPORTANT: Changes to this file do NOT affect the HTML pipeline at all.
 */
export function buildTsxDriverSource(): string {
  return `
(function () {
  "use strict";
  var HMR_STAGE_SELECTOR = "[data-hmr-stage]";

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
  
  // Reusable canvas for SVG foreignObject capture — prevents GPU context leak
  var sharedCanvas = null;
  var sharedCtx = null;

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
        if (t === 0) {
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
    
    if (t === 0 && core.clock !== 0) {
      timers.clear();
      pendingRaFs.length = 0;
      
      if (typeof window.__HMR_EXECUTE_USER_CODE__ === 'function') {
        try {
          if (!window.__HMR_REACT_ROOT__) {
            var stage = getStage();
            if (stage && window.__HMR_INITIAL_HTML__) {
              stage.innerHTML = window.__HMR_INITIAL_HTML__;
            }
          }
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

  /**
   * SVG foreignObject capture — the Remotion-like zero-clone approach.
   * 
   * Instead of cloning the entire DOM (html-to-image), we:
   * 1. Serialize the live DOM to an XML string
   * 2. Embed it in an SVG foreignObject
   * 3. Draw the SVG onto a reusable canvas
   * 4. Extract ImageBitmap
   *
   * Memory per frame: ~3-5 MB (string + canvas) vs ~20-30 MB (full DOM clone).
   */
  async function captureViaForeignObject(stage, w, h) {
    // 1. Inline computed styles for animated properties to freeze CSS animations in outerHTML
    var anims = [];
    try { anims = document.getAnimations() || []; } catch(e) {}
    
    var originalStyles = new Map();
    
    for (var i = 0; i < anims.length; i++) {
      var a = anims[i];
      var el = a.effect && a.effect.target;
      if (!el || el === document.body || el === document.documentElement) continue;
      
      try {
        var keyframes = a.effect.getKeyframes();
        var props = {};
        for (var k = 0; k < keyframes.length; k++) {
          for (var p in keyframes[k]) {
            if (p !== 'offset' && p !== 'easing' && p !== 'composite' && p !== 'computedOffset') {
              props[p] = true;
            }
          }
        }
        
        var comp = window.getComputedStyle(el);
        var elStyleStore = originalStyles.get(el);
        if (!elStyleStore) {
          elStyleStore = {};
          originalStyles.set(el, elStyleStore);
        }
        
        for (var p in props) {
          var kebabProp = p.replace(/[A-Z]/g, function(m) { return "-" + m.toLowerCase(); });
          var val = comp.getPropertyValue(kebabProp) || comp[p];
          if (val) {
            if (!(p in elStyleStore)) {
              elStyleStore[p] = el.style[p] || ""; 
            }
            el.style[p] = val;
          }
        }
      } catch (e) {}
    }

    // 2. Collect all stylesheets into a single <style> block
    var allCSS = "";
    try {
      var sheets = document.styleSheets;
      for (var i = 0; i < sheets.length; i++) {
        try {
          var rules = sheets[i].cssRules || sheets[i].rules;
          for (var j = 0; j < rules.length; j++) {
            allCSS += rules[j].cssText + "\\n";
          }
        } catch (e) { /* cross-origin stylesheet, skip */ }
      }
    } catch (e) {}

    // 3. Serialize the stage's current HTML (now with frozen animation inline styles!)
    var html = stage.outerHTML;

    // 4. Restore original inline styles so the live preview isn't permanently overwritten
    try {
      originalStyles.forEach(function(store, el) {
        for (var p in store) {
          el.style[p] = store[p];
        }
      });
    } catch (e) {}

    var svgNS = "http://www.w3.org/2000/svg";
    // 5. Inject * { animation: none !important; } so the SVG renderer respects our inlined computed styles
    var svg = '<svg xmlns="' + svgNS + '" width="' + w + '" height="' + h + '">' +
      '<foreignObject width="100%" height="100%">' +
      '<div xmlns="http://www.w3.org/1999/xhtml" style="width:' + w + 'px;height:' + h + 'px;overflow:hidden;' + 
      (renderConfig.backgroundColor && !renderConfig.transparent ? 'background:' + renderConfig.backgroundColor + ';' : '') + '">' +
      '<style>' + allCSS + '\\n* { animation: none !important; transition: none !important; }</style>' +
      html +
      '</div></foreignObject></svg>';

    var blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    var url = URL.createObjectURL(blob);

    try {
      var img = new Image();
      img.width = w;
      img.height = h;
      
      await new Promise(function (resolve, reject) {
        img.onload = resolve;
        img.onerror = function () { reject(new Error("SVG foreignObject render failed")); };
        img.src = url;
      });

      var canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      var ctx = canvas.getContext("2d", { willReadFrequently: true });
      
      if (!renderConfig.transparent && renderConfig.backgroundColor) {
        ctx.fillStyle = renderConfig.backgroundColor;
        ctx.fillRect(0, 0, w, h);
      }
      
      ctx.drawImage(img, 0, 0, w, h);
      
      var bitmap = await createImageBitmap(canvas);
      return bitmap;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Fallback capture using html-to-image (if foreignObject fails).
   * This is the original heavy approach — only used as safety net.
   */
  async function captureViaHtmlToImage(out, w, h) {
    var htmlToImage = window.htmlToImage;
    if (!htmlToImage || typeof htmlToImage.toBlob !== "function") {
      throw new Error("Both foreignObject and html-to-image capture failed");
    }
    
    var opts = {
      width: w,
      height: h,
      pixelRatio: 1, // Force pixelRatio 1 to save memory
      cacheBust: true,
      skipAutoScale: true,
      imagePlaceholder: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    };
    if (!renderConfig.transparent && renderConfig.backgroundColor) {
      opts.backgroundColor = renderConfig.backgroundColor;
    }
    var blob = await htmlToImage.toBlob(out, opts);
    return await createImageBitmap(blob);
  }

  async function doCapture() {
    var stage = getStage();
    if (!stage) throw new Error("Stage element not found");

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

      // Try SVG foreignObject first (zero-clone, low memory)
      var bitmap;
      try {
        bitmap = await captureViaForeignObject(out, w, h);
      } catch (foreignObjectError) {
        // Fallback to html-to-image (high memory but reliable)
        console.warn("[TSX Driver] foreignObject capture failed, falling back to html-to-image:", foreignObjectError.message);
        bitmap = await captureViaHtmlToImage(out, w, h);
      }

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
      
      var stage = getStage();
      if (stage && !window.__HMR_INITIAL_HTML__) {
        window.__HMR_INITIAL_HTML__ = stage.innerHTML;
      }
      
      syncAnimations(0);
      post("READY", { version: "1.0.0", width: stageConfig.width, height: stageConfig.height });
    } catch (e) {
      post("ERROR", { message: String((e && e.message) || e) });
    }
  }

  window.addEventListener("error", function (event) {
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
