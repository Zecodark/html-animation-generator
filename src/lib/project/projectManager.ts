import {
  MotionProjectSchema,
  PROJECT_FILE_EXTENSION,
  type MotionProject,
  type ProjectSettings,
} from "@/types/project";
import { slugify } from "@/lib/utils/utils";

export const DEFAULT_SETTINGS: ProjectSettings = {
  width: 1920,
  height: 1080,
  fps: 30,
  duration: 5,
  scale: 1,
  panX: 0,
  panY: 0,
  background: "transparent",
  backgroundColor: "#FF6B00",
};

export function emptyProject(name = "Untitled Motion"): MotionProject {
  return {
    version: "1.0.0",
    name,
    html: `<div class="scene"></div>`,
    css: `.scene { width: 100%; height: 100%; background: transparent; }`,
    javascript: "",
    settings: { ...DEFAULT_SETTINGS },
  };
}

export function parseProjectJson(text: string): MotionProject {
  const parsed = JSON.parse(text) as unknown;
  return MotionProjectSchema.parse(parsed);
}

export function serializeProject(project: MotionProject): string {
  const validated = MotionProjectSchema.parse(project);
  return JSON.stringify(validated, null, 2);
}

export function projectFilename(project: MotionProject): string {
  return `${slugify(project.name)}.${PROJECT_FILE_EXTENSION}`;
}

export function downloadProject(project: MotionProject): void {
  const blob = new Blob([serializeProject(project)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = projectFilename(project);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4_000);
}

export async function readProjectFile(file: File): Promise<MotionProject> {
  const text = await file.text();
  return parseProjectJson(text);
}

/**
 * Import a raw HTML document: extracts <style> into css, <script> into
 * javascript and body innerHTML into html (scripts/styles stripped).
 */
export function importFromHtml(raw: string): Pick<MotionProject, "html" | "css" | "javascript"> {
  const doc = new DOMParser().parseFromString(raw, "text/html");

  let css = "";
  doc.querySelectorAll("style").forEach((el) => {
    css += (el.textContent ?? "") + "\n";
  });

  let javascript = "";
  doc.querySelectorAll("script").forEach((el) => {
    if (el.getAttribute("src")) return;
    javascript += (el.textContent ?? "") + "\n";
  });

  const body = doc.body.cloneNode(true) as HTMLElement;
  body.querySelectorAll("script, style").forEach((el) => el.remove());
  const html = body.innerHTML.trim();

  return {
    html: html || `<div class="scene"></div>`,
    css: css.trim(),
    javascript: javascript.trim(),
  };
}

export function detectExternalAssets(project: MotionProject): string[] {
  const sources: string[] = [];
  const allText = [project.html, project.css, project.javascript].join("\n");
  const urlPattern = /(?:https?:)?\/\/[^\s"'`)]+\.(?:png|jpe?g|gif|svg|webp|mp4|webm|mov|woff2?|ttf|otf|css|js)(?:\?[^\s"'`)]*)?/gi;
  const matches = allText.match(urlPattern) ?? [];
  matches.forEach((url) => {
    if (!sources.includes(url)) sources.push(url);
  });
  return sources;
}