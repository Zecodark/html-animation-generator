import type { MotionProject } from "@/types/project";

/**
 * The Halloween Pumpkin Loader demo (spec §30).
 *
 * Pure CSS/SVG, transparent background, smooth 5s loop, subtle glow and
 * rotating elements. No external assets, no watermark, no audio.
 * Everything is CSS keyframe / Web Animations driven so it renders
 * deterministically.
 */
export const DEMO_HTML = `<div class="scene">
  <div class="halo"></div>
  <div class="orbit orbit-outer"></div>
  <div class="orbit orbit-inner"></div>

  <div class="bob">
    <div class="pumpkin">
      <div class="stem"></div>
      <svg class="body" viewBox="0 0 220 180" width="220" height="180">
        <ellipse cx="110" cy="92" rx="34" ry="70" fill="#f25b00"/>
        <ellipse cx="110" cy="92" rx="58" ry="78" fill="#ff7a12"/>
        <ellipse cx="110" cy="92" rx="84" ry="82" fill="#ff9224"/>
        <path d="M110 10 C101 34 100 152 110 172 C120 152 119 34 110 10 Z" fill="#ffb04a" opacity="0.6"/>
        <path d="M110 10 C104 30 104 154 110 172" stroke="#d94f00" stroke-width="3" fill="none" opacity="0.55"/>
        <path d="M110 10 C116 30 116 154 110 172" stroke="#d94f00" stroke-width="3" fill="none" opacity="0.55"/>
        <ellipse cx="80" cy="16" rx="10" ry="4" fill="#ffc06a" opacity="0.4"/>
      </svg>
      <svg class="face" viewBox="0 0 220 180" width="220" height="180">
        <path d="M56 66 L78 50 L78 84 Z" fill="#250d00"/>
        <path d="M164 66 L142 50 L142 84 Z" fill="#250d00"/>
        <path d="M60 118 Q110 152 160 118 L148 130 Q110 158 72 130 Z" fill="#250d00"/>
        <path d="M56 66 L78 50 L78 84 Z" fill="#ffb121" opacity="0.35"/>
        <path d="M164 66 L142 50 L142 84 Z" fill="#ffb121" opacity="0.35"/>
      </svg>
    </div>
  </div>

  <div class="bat bat-a"></div>
  <div class="bat bat-b"></div>

  <div class="spark spark-1"></div>
  <div class="spark spark-2"></div>
  <div class="spark spark-3"></div>
  <div class="spark spark-4"></div>
</div>`;

export const DEMO_CSS = `* { box-sizing: border-box; }

.scene {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: transparent;
}

.halo {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 560px;
  height: 560px;
  margin: -280px 0 0 -280px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 140, 0, 0.5) 0%, rgba(255, 140, 0, 0.22) 40%, rgba(255, 140, 0, 0) 72%);
  animation: haloPulse 2.5s ease-in-out infinite;
}

@keyframes haloPulse {
  0%, 100% { transform: scale(0.94); opacity: 0.75; }
  50% { transform: scale(1.08); opacity: 1; }
}

.orbit {
  position: absolute;
  left: 50%;
  top: 50%;
  border: 2px dashed rgba(255, 160, 40, 0.55);
  border-radius: 50%;
}

.orbit::after {
  content: "";
  position: absolute;
  top: -5px;
  left: 50%;
  width: 10px;
  height: 10px;
  margin-left: -5px;
  border-radius: 50%;
  background: #ffc36a;
  box-shadow: 0 0 12px 3px rgba(255, 170, 60, 0.8);
}

.orbit-outer {
  width: 520px;
  height: 520px;
  margin: -260px 0 0 -260px;
  animation: spin 5s linear infinite;
}

.orbit-inner {
  width: 340px;
  height: 340px;
  margin: -170px 0 0 -170px;
  border-style: dotted;
  animation: spin 5s linear infinite reverse;
}

.orbit-inner::after {
  width: 8px;
  height: 8px;
  margin-left: -4px;
  background: #ffa62b;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.bob {
  position: absolute;
  left: 50%;
  top: 50%;
  animation: bob 5s ease-in-out infinite;
}

@keyframes bob {
  0%, 100% { margin-top: -18px; }
  50% { margin-top: 16px; }
}

.pumpkin {
  position: relative;
  width: 220px;
  height: 190px;
  margin: -95px 0 0 -110px;
  transform-origin: 50% 100%;
  animation: wobble 5s ease-in-out infinite;
}

@keyframes wobble {
  0%, 100% { transform: rotate(-3deg); }
  25% { transform: rotate(1.5deg); }
  50% { transform: rotate(3deg); }
  75% { transform: rotate(-1.5deg); }
}

.body {
  position: absolute;
  inset: 0;
}

.face {
  position: absolute;
  inset: 0;
  animation: flicker 5s ease-in-out infinite;
}

@keyframes flicker {
  0%, 72%, 77%, 84%, 90%, 100% { opacity: 1; }
  74% { opacity: 0.55; }
  80% { opacity: 0.85; }
  94% { opacity: 0.7; }
}

.stem {
  position: absolute;
  left: 50%;
  top: -14px;
  width: 16px;
  height: 38px;
  margin-left: -8px;
  border-radius: 6px 6px 4px 4px;
  background: linear-gradient(90deg, #4a5d1e, #7a9c2f, #4a5d1e);
  z-index: 2;
}

.bat {
  position: absolute;
  width: 64px;
  height: 40px;
  background: #241008;
  clip-path: polygon(0 50%, 22% 42%, 30% 12%, 46% 34%, 54% 34%, 70% 12%, 78% 42%, 100% 50%, 76% 62%, 68% 88%, 50% 58%, 32% 88%, 24% 62%);
  animation: flit 5s ease-in-out infinite;
}

.bat-a { left: 16%; top: 18%; }
.bat-b { right: 14%; top: 14%; animation-delay: 0.6s; transform: scale(1.15); }

@keyframes flit {
  0%, 100% {
    transform: translate(0, 0) rotate(6deg) scaleX(1);
    opacity: 0.85;
  }
  12% { transform: translate(46px, -34px) rotate(-8deg) scaleX(0.72); }
  24% { transform: translate(90px, 6px) rotate(4deg) scaleX(1); }
  36% { transform: translate(130px, -22px) rotate(-6deg) scaleX(0.78); }
  48% { transform: translate(170px, 12px) rotate(6deg) scaleX(1); }
  60% { transform: translate(120px, 34px) rotate(-4deg) scaleX(0.8); }
  72% { transform: translate(60px, 52px) rotate(5deg) scaleX(1); }
  84% { transform: translate(20px, 22px) rotate(-7deg) scaleX(0.75); }
}

.spark {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: radial-gradient(circle, #ffe9b0 0%, rgba(255, 190, 70, 0) 70%);
}

.spark-1 { left: 34%; top: 60%; animation: rise 5s linear infinite; }
.spark-2 { left: 60%; top: 64%; animation: rise 5s linear infinite reverse; animation-delay: 1.2s; }
.spark-3 { left: 44%; top: 74%; animation: rise 5s linear infinite; animation-delay: 2.2s; }
.spark-4 { left: 52%; top: 30%; animation: rise 5s linear infinite reverse; animation-delay: 3.4s; }

@keyframes rise {
  0% { transform: translateY(0) scale(1); opacity: 0; }
  15% { opacity: 1; }
  50% { transform: translateY(-90px) scale(0.7); opacity: 0.9; }
  100% { transform: translateY(-190px) scale(0.1); opacity: 0; }
}`;

export const DEMO_JAVASCRIPT = ``;

export function createDemoProject(): MotionProject {
  return {
    version: "1.0.0",
    name: "Halloween Pumpkin Loader",
    html: DEMO_HTML,
    css: DEMO_CSS,
    javascript: DEMO_JAVASCRIPT,
    settings: {
      width: 1920,
      height: 1080,
      fps: 30,
      duration: 5,
      scale: 1,
      panX: 0,
      panY: 0,
      background: "transparent",
      backgroundColor: "#FF6B00",
    },
  };
}