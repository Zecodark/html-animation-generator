# HTML Motion Renderer — Next.js Technical Specification

## Tujuan

Bangun web application bernama **HTML Motion Renderer** menggunakan **Next.js + React + TypeScript**.

Fungsi utama:

```text
HTML/CSS/JavaScript Animation
        ↓
Live Preview
        ↓
Deterministic Frame Rendering
        ↓
Video/Image Encoder
        ↓
MP4 / WebM / GIF / MOV / PNG Sequence
```

Aplikasi ditujukan untuk creator/designer yang ingin membuat motion graphic berbasis HTML, CSS, SVG, Canvas, dan JavaScript lalu mengekspornya sebagai asset video.

Jangan membuat mockup UI saja. Prototype harus memiliki rendering/export pipeline yang benar-benar bekerja sejauh kemampuan browser.

---

## 1. Stack

Gunakan:

- Next.js
- React
- TypeScript
- Tailwind CSS
- Zustand
- Zod
- WebCodecs API
- Canvas API
- OffscreenCanvas jika tersedia
- Web Workers
- FFmpeg.wasm
- MP4 muxer
- GIF encoder
- JSZip
- Monaco Editor atau CodeMirror

Gunakan Next.js App Router.

---

# 2. Library / Dependencies

## Editor

Pilih salah satu.

### Monaco

```bash
npm install @monaco-editor/react
```

atau:

### CodeMirror

```bash
npm install @codemirror/view @codemirror/state
npm install @codemirror/lang-html
npm install @codemirror/lang-css
npm install @codemirror/lang-javascript
```

Jangan memasang Monaco dan CodeMirror sekaligus.

---

## State Management

```bash
npm install zustand
```

Gunakan untuk:

- editor state
- project state
- timeline
- export settings
- render queue
- render progress

---

## Validation

```bash
npm install zod
```

Gunakan untuk validasi project dan export configuration.

---

## DOM / HTML Capture

Evaluasi:

```bash
npm install modern-screenshot
```

Alternatif:

```bash
npm install html-to-image
```

Gunakan salah satu saja.

Pahami bahwa DOM-to-image memiliki keterbatasan terhadap:

- cross-origin images
- iframe
- video
- WebGL
- external fonts
- complex filters

Untuk rendering paling konsisten, prioritaskan:

- inline HTML
- CSS
- SVG
- Canvas
- data URI
- local assets

---

## MP4 Muxing

WebCodecs dapat menghasilkan encoded video chunks, tetapi tidak otomatis membuat container MP4.

Gunakan:

```bash
npm install mp4-muxer
```

Pipeline:

```text
VideoEncoder
    ↓
H.264 Encoded Chunks
    ↓
MP4 Muxer
    ↓
MP4 Blob
```

Jangan hanya mengganti extension file.

---

## FFmpeg

Gunakan:

```bash
npm install @ffmpeg/ffmpeg @ffmpeg/util
```

FFmpeg.wasm digunakan sebagai fallback dan untuk format yang lebih kompleks:

- MP4
- MOV
- WebM
- GIF
- image sequence
- resizing
- codec conversion
- frame rate conversion

FFmpeg harus **lazy-loaded**, jangan dimasukkan ke initial bundle jika belum diperlukan.

---

## GIF

Gunakan:

```bash
npm install gifenc
```

Pipeline:

```text
Canvas Frame
    ↓
RGBA
    ↓
gifenc
    ↓
GIF
```

---

## PNG Sequence / ZIP

PNG dapat dibuat dengan:

```javascript
canvas.toBlob()
```

Kemudian gunakan:

```bash
npm install jszip
```

untuk:

```text
frame_00001.png
frame_00002.png
...
        ↓
JSZip
        ↓
animation_frames.zip
```

PNG sequence harus menjadi fallback paling reliable.

---

# 3. Preview Architecture

Gunakan sandboxed iframe.

```text
Editor
   ↓
Build HTML Document
   ↓
iframe.srcDoc
   ↓
Sandboxed Preview
```

Gunakan:

```html
<iframe sandbox="allow-scripts">
```

Jangan menjalankan arbitrary user JavaScript langsung di halaman utama Next.js.

Komunikasi parent ↔ iframe menggunakan:

```javascript
postMessage()
```

Command:

```text
PLAY
PAUSE
RESTART
SET_TIME
```

Event:

```text
READY
ERROR
TIME_UPDATE
ANIMATION_COMPLETE
```

Jangan memberikan akses parent DOM kepada animation user.

---

# 4. Deterministic Rendering

Ini adalah bagian paling penting.

Jangan hanya menggunakan:

```javascript
requestAnimationFrame()
```

untuk final rendering.

Renderer harus dapat menentukan waktu secara eksplisit:

```typescript
renderer.setTime(time)
renderer.captureFrame()
```

Contoh:

```typescript
for (let frame = 0; frame < totalFrames; frame++) {
    const time = frame / fps

    await renderer.setTime(time)

    const image = await renderer.captureFrame()

    await encoder.encode(image)
}
```

Pada 30 FPS:

```text
Frame 0 = 0.000 sec
Frame 1 = 0.033 sec
Frame 2 = 0.066 sec
Frame 3 = 0.100 sec
...
```

Tujuan utamanya adalah memastikan setiap render menghasilkan frame yang konsisten.

---

# 5. Render Engine

Buat:

```text
src/lib/renderer/
├── RenderEngine.ts
├── FrameRenderer.ts
├── FrameCapture.ts
├── AnimationController.ts
└── RenderScheduler.ts
```

Interface:

```typescript
export interface RenderOptions {
    width: number
    height: number
    fps: number
    duration: number
    transparent: boolean
}
```

Render engine:

```typescript
class RenderEngine {
    async render(options: RenderOptions) {
        // rendering pipeline
    }
}
```

---

# 6. Browser APIs

Gunakan browser APIs jika tersedia:

- Canvas
- OffscreenCanvas
- WebCodecs
- VideoEncoder
- VideoFrame
- ImageBitmap
- MediaRecorder
- Web Worker
- WebAssembly
- Blob
- File API

Capability detection wajib dilakukan.

Contoh:

```typescript
const capabilities = {
    webCodecs: "VideoEncoder" in window,
    mediaRecorder: "MediaRecorder" in window,
    offscreenCanvas: "OffscreenCanvas" in window,
}
```

---

# 7. Encoder Architecture

Pisahkan renderer dan encoder.

Buat:

```text
src/lib/encoders/
├── EncoderManager.ts
├── WebCodecsMp4Encoder.ts
├── WebCodecsWebmEncoder.ts
├── MediaRecorderEncoder.ts
├── FFmpegEncoder.ts
├── GifEncoder.ts
└── PngSequenceEncoder.ts
```

Interface:

```typescript
interface VideoEncoderAdapter {
    name: string

    isSupported(): Promise<boolean>

    initialize(options: EncoderOptions): Promise<void>

    encode(frame: VideoFrame | ImageBitmap): Promise<void>

    finalize(): Promise<Blob>

    cancel(): Promise<void>
}
```

---

# 8. Encoder Priority

## MP4

Prioritas:

```text
WebCodecs H.264
        ↓
MP4 muxer
        ↓
FFmpeg.wasm
        ↓
PNG Sequence fallback
```

## WebM

Prioritas:

```text
WebCodecs VP9
        ↓
MediaRecorder VP9
        ↓
FFmpeg.wasm
        ↓
PNG Sequence
```

## GIF

```text
gifenc
        ↓
FFmpeg.wasm
```

## MOV

```text
FFmpeg.wasm
        ↓
Backend/native FFmpeg pada production
```

## PNG

```text
Canvas.toBlob()
        ↓
JSZip
```

---

# 9. MP4

Target utama:

```text
Container: MP4
Video codec: H.264
Audio: none pada versi pertama
```

Gunakan WebCodecs jika browser mendukung H.264.

Deteksi codec:

```typescript
await VideoEncoder.isConfigSupported({
    codec: "avc1.42E01E",
    width,
    height,
    bitrate,
    framerate: fps
})
```

Setelah mendapatkan encoded chunks, gunakan MP4 muxer.

Jangan menganggap WebCodecs sendiri menghasilkan `.mp4`.

---

# 10. WebM

Gunakan VP8/VP9 jika tersedia.

Contoh capability detection:

```typescript
MediaRecorder.isTypeSupported(
    "video/webm;codecs=vp9"
)
```

Berikan fallback VP8.

---

# 11. MOV

MOV tidak selalu dapat dibuat secara native oleh browser.

Jangan:

```text
file.webm → rename → file.mov
```

Itu tidak valid.

Gunakan FFmpeg.wasm jika pipeline codec/container tersedia.

Jika tidak tersedia:

```text
MOV encoder unavailable
```

Berikan fallback:

- MP4
- WebM
- PNG Sequence

Untuk production, siapkan arsitektur:

```text
Next.js
   ↓
Render API
   ↓
Docker
   ↓
Native FFmpeg
   ↓
MOV
```

---

# 12. Transparent Background

Sediakan:

```text
Transparent
Solid Color
Gradient
```

Penting:

**H.264 MP4 biasa tidak boleh dijanjikan mendukung alpha transparency.**

Jika user membutuhkan transparency, arahkan ke:

- PNG sequence
- WebM alpha jika browser/codec mendukung
- format alpha khusus
- production backend pipeline

---

# 13. GIF

Settings:

```text
FPS
Width
Quality
Loop
```

Tampilkan warning jika:

```text
resolution tinggi
+
duration panjang
+
FPS tinggi
```

karena GIF dapat menghasilkan file yang sangat besar.

---

# 14. PNG Sequence

Harus selalu tersedia sebagai fallback.

Output:

```text
frame_00001.png
frame_00002.png
frame_00003.png
...
```

User dapat mengimpor sequence tersebut ke:

- Adobe After Effects
- Adobe Premiere Pro
- Adobe Media Encoder

Tambahkan:

```text
Download PNG Sequence
```

dan:

```text
Download ZIP
```

---

# 15. Export Settings

Buat modal:

```text
EXPORT

Format
[ MP4 ]

Resolution
[ 1920 × 1080 ]

FPS
[ 30 ]

Duration
[ 5 sec ]

Quality
[ High ]

Background
[ Transparent ]

Estimated Frames
150

[ Cancel ] [ Render ]
```

TypeScript:

```typescript
interface ExportSettings {
    format:
        | "mp4"
        | "webm"
        | "gif"
        | "mov"
        | "png-sequence"

    codec?: string

    width: number
    height: number
    fps: number
    duration: number

    quality: "low" | "medium" | "high" | "very-high"

    transparent: boolean

    filename: string
}
```

---

# 16. Resolution Presets

Sediakan:

```text
1920 × 1080
1080 × 1920
1080 × 1080
3840 × 2160
4096 × 2160
Custom
```

FPS:

```text
24
25
30
50
60
```

Duration:

```text
1 sec
2 sec
3 sec
5 sec
10 sec
Custom
```

---

# 17. Timeline

Timeline versi pertama tidak perlu menjadi clone After Effects.

Fitur:

- ruler
- current time
- playhead
- duration
- FPS
- play
- pause
- restart
- loop
- zoom

State:

```typescript
interface TimelineState {
    currentTime: number
    duration: number
    fps: number
    playing: boolean
    zoom: number
}
```

---

# 18. Render Progress

Tampilkan progress nyata:

```text
Rendering Animation...

Frame 82 / 150

54.6%

Elapsed: 00:03
Estimated remaining: 00:02

[ Cancel Render ]
```

Jangan menggunakan progress palsu.

Update UI jangan dilakukan setiap frame. Throttle sekitar 10–20 update per detik.

---

# 19. Render Queue

Buat:

```text
Render Queue

01  MP4       1920×1080   30fps   Waiting
02  WebM      1080×1080   30fps   Waiting
03  GIF       1080×1080   24fps   Waiting
04  PNG ZIP   1920×1080   30fps   Waiting

[ Render All ]
```

Status:

```text
queued
rendering
completed
failed
cancelled
```

---

# 20. Project System

Project extension:

```text
.htmlmotion
```

Isi sebenarnya berupa JSON.

Contoh:

```json
{
    "version": "1.0.0",
    "name": "Halloween Pumpkin Loader",
    "html": "<div class=\"scene\"></div>",
    "css": ".scene { ... }",
    "javascript": "...",
    "settings": {
        "width": 1920,
        "height": 1080,
        "fps": 30,
        "duration": 5,
        "background": "transparent"
    }
}
```

Gunakan Zod untuk validasi.

Fitur:

- New Project
- Save Project
- Load Project
- Import HTML
- Export Project

---

# 21. Suggested Folder Structure

Gunakan:

```text
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
│
├── components/
│   ├── editor/
│   │   ├── CodeEditor.tsx
│   │   ├── EditorTabs.tsx
│   │   └── EditorToolbar.tsx
│   │
│   ├── preview/
│   │   ├── PreviewFrame.tsx
│   │   ├── PreviewControls.tsx
│   │   └── PreviewViewport.tsx
│   │
│   ├── timeline/
│   │   ├── Timeline.tsx
│   │   ├── Playhead.tsx
│   │   └── TimeRuler.tsx
│   │
│   ├── export/
│   │   ├── ExportModal.tsx
│   │   ├── FormatSelector.tsx
│   │   ├── ExportSettings.tsx
│   │   └── RenderProgress.tsx
│   │
│   ├── project/
│   │   ├── ProjectMenu.tsx
│   │   └── ProjectManager.tsx
│   │
│   └── system/
│       ├── CompatibilityPanel.tsx
│       └── ErrorBoundary.tsx
│
├── hooks/
│   ├── usePreview.ts
│   ├── useRenderer.ts
│   ├── useExport.ts
│   └── useCompatibility.ts
│
├── lib/
│   ├── renderer/
│   ├── encoders/
│   ├── project/
│   ├── ffmpeg/
│   └── utils/
│
├── stores/
│   ├── editorStore.ts
│   ├── projectStore.ts
│   ├── timelineStore.ts
│   └── renderStore.ts
│
├── workers/
│   ├── renderer.worker.ts
│   └── ffmpeg.worker.ts
│
└── types/
    ├── project.ts
    ├── renderer.ts
    └── encoder.ts
```

---

# 22. Next.js Browser-only Rules

WebCodecs, Canvas, MediaRecorder, Worker, `window`, dan `document` hanya tersedia di browser.

Komponen yang menggunakannya harus menggunakan:

```tsx
"use client"
```

Jangan mengakses:

```typescript
window
document
navigator
VideoEncoder
```

di module scope yang dieksekusi saat SSR.

Gunakan `useEffect()` atau dynamic import.

Untuk Monaco:

```typescript
const Editor = dynamic(
    () => import("@monaco-editor/react"),
    { ssr: false }
)
```

---

# 23. FFmpeg Lazy Loading

Jangan load FFmpeg saat initial page load.

Gunakan dynamic import ketika user membutuhkan FFmpeg:

```typescript
const loadFFmpeg = async () => {
    const { FFmpeg } = await import("@ffmpeg/ffmpeg")
    const { fetchFile } = await import("@ffmpeg/util")

    // initialize only when required
}
```

Idealnya FFmpeg diproses melalui Web Worker agar UI tidak freeze.

---

# 24. Worker Architecture

Buat:

```text
src/workers/
├── renderer.worker.ts
└── ffmpeg.worker.ts
```

Konsep:

```text
React UI
   ↓
Worker
   ↓
Heavy rendering / encoding
   ↓
Progress
   ↓
React UI
```

Gunakan transferable objects jika memungkinkan.

---

# 25. Memory Management

Rendering resolusi tinggi membutuhkan memory besar.

Jangan menyimpan seluruh frame di React state.

Gunakan streaming/chunk processing.

Setelah selesai menggunakan:

```typescript
videoFrame.close()
```

Untuk Blob URL:

```typescript
URL.revokeObjectURL(url)
```

Setelah worker selesai:

```typescript
worker.terminate()
```

Jika menggunakan ImageBitmap, release resource setelah selesai.

---

# 26. External Assets

Untuk rendering konsisten, prioritaskan:

- inline SVG
- inline CSS
- data URI
- local assets

External image seperti:

```html
<img src="https://example.com/image.png">
```

dapat gagal karena CORS.

Tampilkan warning:

```text
External resource may fail during rendering because of CORS.
```

---

# 27. Security

User dapat memasukkan JavaScript arbitrary.

Jangan menjalankan JavaScript user pada origin aplikasi utama.

Gunakan sandbox iframe:

```html
<iframe sandbox="allow-scripts">
```

Jangan menambahkan:

```text
allow-same-origin
```

kecuali memang dibutuhkan.

Jangan berikan akses terhadap:

- parent DOM
- cookies aplikasi utama
- authentication context
- localStorage utama

---

# 28. Compatibility Panel

Saat aplikasi dibuka, cek:

```text
WebCodecs
H.264
VP9
MediaRecorder
OffscreenCanvas
Web Worker
WebAssembly
```

Contoh:

```text
System Compatibility

WebCodecs          ✓
H.264              ✓
VP9                ✓
MediaRecorder      ✓
OffscreenCanvas    ✓
Web Worker         ✓
WebAssembly        ✓
```

Jika tidak tersedia:

```text
H.264              ✕
```

Jelaskan fallback yang tersedia.

---

# 29. Stock Footage Mode

Buat mode:

```text
STOCK MODE
```

Preset:

```text
1920 × 1080
30 FPS
5 seconds
No audio
No watermark
No external assets
```

Checklist:

```text
✓ No watermark
✓ No logo
✓ No audio
✓ No text
✓ Clean background
✓ Seamless loop
```

Tambahkan disclaimer bahwa tool tidak menjamin file memenuhi seluruh persyaratan marketplace stock.

---

# 30. Initial Demo

Buat demo:

**Halloween Pumpkin Loader**

Karakteristik:

- pure CSS/SVG
- transparent background
- smooth looping
- subtle glow
- rotating elements
- 5 seconds
- 30 FPS
- no external assets
- no watermark
- no audio

User dapat langsung:

```text
PLAY
```

kemudian:

```text
EXPORT → MP4
```

---

# 31. Development Phases

Jangan membuat semua encoder sekaligus.

## Phase 1 — Editor

- Next.js
- TypeScript
- Monaco atau CodeMirror
- HTML/CSS/JS editor
- Run
- Reset

## Phase 2 — Preview

- sandboxed iframe
- play
- pause
- restart
- timeline
- current time

## Phase 3 — Renderer

- deterministic timestamp
- frame capture
- PNG export
- PNG ZIP

## Phase 4 — WebM

- WebCodecs
- MediaRecorder fallback

## Phase 5 — MP4

- H.264 capability detection
- WebCodecs
- MP4 muxing
- FFmpeg fallback

## Phase 6 — GIF

- gifenc
- frame conversion

## Phase 7 — MOV

- FFmpeg.wasm
- capability detection

## Phase 8 — Project System

- save
- load
- `.htmlmotion`
- import/export

## Phase 9 — Render Queue

- multiple jobs
- progress
- cancel
- retry

## Phase 10 — Production

Jika browser tidak cukup:

```text
Next.js
   ↓
Render API
   ↓
Docker
   ↓
Native FFmpeg
   ↓
Object Storage
```

---

# 32. UI Design

Buat seperti software creative/motion graphics.

```text
┌───────────────────────────────────────────────────────┐
│ HTML MOTION RENDERER                  SAVE   EXPORT   │
├─────────────┬─────────────────────────┬───────────────┤
│             │                         │               │
│ CODE        │                         │ PROPERTIES    │
│             │       PREVIEW           │               │
│ HTML        │                         │ Resolution    │
│ CSS         │                         │ FPS           │
│ JS          │                         │ Duration      │
│             │                         │ Format        │
│             │                         │               │
├─────────────┴─────────────────────────┴───────────────┤
│ TIMELINE                                              │
│ 0 ──────── 1 ──────── 2 ──────── 3 ──────── 5 sec   │
├───────────────────────────────────────────────────────┤
│ Render Status                                         │
└───────────────────────────────────────────────────────┘
```

Style:

- dark
- modern
- minimal
- professional
- compact
- high contrast
- subtle borders
- smooth transitions

Jangan membuat UI seperti admin dashboard SaaS.

---

# 33. Initial npm Setup

Mulai:

```bash
npx create-next-app@latest html-motion-renderer
```

Pilih:

```text
TypeScript: Yes
ESLint: Yes
Tailwind CSS: Yes
src/: Yes
App Router: Yes
```

Kemudian:

```bash
npm install zustand zod
npm install @monaco-editor/react
npm install modern-screenshot
npm install @ffmpeg/ffmpeg @ffmpeg/util
npm install mp4-muxer
npm install gifenc
npm install jszip
```

Jika memilih CodeMirror, jangan install Monaco:

```bash
npm install @codemirror/view @codemirror/state
npm install @codemirror/lang-html
npm install @codemirror/lang-css
npm install @codemirror/lang-javascript
```

---

# 34. Important Technical Rules

1. Jangan membuat mockup export.
2. Jangan mengganti extension file untuk berpura-pura melakukan conversion.
3. Jangan mengklaim semua browser mendukung MP4/MOV.
4. Gunakan capability detection.
5. Pisahkan renderer dan encoder.
6. Gunakan Web Workers untuk proses berat.
7. Lazy-load FFmpeg.wasm.
8. Jangan menyimpan seluruh frame resolusi tinggi di React state.
9. Jangan menjalankan user JavaScript di origin utama.
10. Gunakan sandboxed iframe.
11. Browser-only API harus berada di Client Components.
12. Gunakan TypeScript.
13. Gunakan error handling yang jelas.
14. Sediakan PNG Sequence sebagai fallback.
15. Bersihkan VideoFrame, ImageBitmap, Blob URL, dan Worker.
16. Jangan menjanjikan transparent H.264 MP4.
17. MOV harus benar-benar dihasilkan oleh encoder/container yang valid.
18. Fokus pada functional prototype sebelum kosmetik.
19. Jangan menambahkan dependency yang tidak diperlukan.
20. Setiap phase harus diuji sebelum melanjutkan ke phase berikutnya.

---

# 35. Acceptance Criteria

## Editor

- [ ] HTML editor bekerja
- [ ] CSS editor bekerja
- [ ] JavaScript editor bekerja
- [ ] Run bekerja
- [ ] Reset bekerja

## Preview

- [ ] HTML rendering
- [ ] CSS animation
- [ ] JavaScript animation
- [ ] Play
- [ ] Pause
- [ ] Restart
- [ ] Timeline

## Renderer

- [ ] deterministic timestamp
- [ ] frame capture
- [ ] FPS konsisten
- [ ] duration konsisten
- [ ] PNG sequence
- [ ] ZIP export

## Video

- [ ] WebM jika supported
- [ ] MP4 capability detection
- [ ] H.264 detection
- [ ] MP4 muxing
- [ ] FFmpeg fallback
- [ ] GIF
- [ ] MOV architecture

## Project

- [ ] Save
- [ ] Load
- [ ] Import
- [ ] Export

## Stability

- [ ] real render progress
- [ ] cancel render
- [ ] error handling
- [ ] memory cleanup
- [ ] worker cleanup
- [ ] Blob URL cleanup

---

# 36. Target Architecture

```text
                     NEXT.JS
                        │
        ┌───────────────┼────────────────┐
        │               │                │
     Editor          Preview          Timeline
        │               │                │
        └───────────────┼────────────────┘
                        │
                  Render Engine
                        │
                Frame Capture Layer
                        │
             ┌──────────┼───────────┐
             │          │           │
         WebCodecs  MediaRecorder  Canvas
             │          │           │
             └──────────┼───────────┘
                        │
                 Encoder Manager
                        │
          ┌─────────────┼─────────────┐
          │             │             │
         MP4          WebM           GIF
          │             │             │
      mp4-muxer     WebCodecs       gifenc
          │             │             │
          └─────────────┼─────────────┘
                        │
                    FFmpeg.wasm
                        │
                 MOV / Fallback
                        │
                PNG Sequence
                        │
                     JSZip
```

---

# 37. Instruksi untuk Gemini Canvas

Mulai implementasi dari **Phase 1 sampai Phase 3**.

Jangan langsung membuat seluruh encoder.

Buktikan terlebih dahulu pipeline:

```text
HTML/CSS/JS
     ↓
Sandboxed iframe
     ↓
Live Preview
     ↓
Deterministic Timeline
     ↓
Frame Capture
     ↓
PNG Sequence
     ↓
ZIP
```

Setelah pipeline tersebut stabil, implementasikan:

```text
PNG
 ↓
WebM
 ↓
MP4
 ↓
GIF
 ↓
MOV
```

Jika sebuah browser/API tidak mendukung suatu format, jangan membuat implementasi palsu. Tampilkan capability/error yang jelas dan gunakan fallback.

**Bangun aplikasi sebagai functional prototype Next.js + TypeScript yang modular. Jangan berhenti pada desain UI. Pastikan setiap phase benar-benar dapat dijalankan dan diuji sebelum melanjutkan ke phase berikutnya.**
