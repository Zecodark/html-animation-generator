/**
 * Regenerates src/lib/preview/htmlToImageSource.ts from
 * public/lib/html-to-image.js.
 *
 * Run after updating the html-to-image bundle:
 *   node scripts/generate-html-to-image-source.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const src = readFileSync(resolve(root, "public/lib/html-to-image.js"), "utf8").trimEnd();
const json = JSON.stringify(src);

const output = `// AUTO-GENERATED — do not edit manually.
// Source: public/lib/html-to-image.js
// Regenerate: node scripts/generate-html-to-image-source.mjs

/**
 * html-to-image UMD bundle inlined as a module constant.
 *
 * Avoids any network fetch from inside the sandboxed preview iframe, which
 * prevents "capture library failed to load" errors caused by:
 *   - Content-Security-Policy blocking <script src> requests
 *   - Sandbox attribute restrictions (allow-same-origin not set)
 *   - Blob-URL or srcdoc document contexts where relative URLs cannot resolve
 */
// eslint-disable-next-line
export const HTML_TO_IMAGE_SOURCE: string = ${json};
`;

const dest = resolve(root, "src/lib/preview/htmlToImageSource.ts");
writeFileSync(dest, output, "utf8");
console.log(`Written ${output.length} bytes to ${dest}`);
