import { z } from "zod";

export const BACKGROUND_TYPES = ["transparent", "solid", "gradient"] as const;

export type BackgroundType = (typeof BACKGROUND_TYPES)[number];

export const ProjectSettingsSchema = z.object({
  width: z.number().int().positive().max(8192),
  height: z.number().int().positive().max(8192),
  fps: z.number().min(1).max(120),
  duration: z.number().positive().max(3600),
  background: z.enum(BACKGROUND_TYPES),
  backgroundColor: z.string().default("#FF6B00"),
});

export type ProjectSettings = z.infer<typeof ProjectSettingsSchema>;

export const MotionProjectSchema = z.object({
  version: z.string().default("1.0.0"),
  name: z.string().min(1).max(200),
  html: z.string(),
  css: z.string(),
  javascript: z.string(),
  settings: ProjectSettingsSchema,
});

export type MotionProject = z.infer<typeof MotionProjectSchema>;

export const PROJECT_FILE_EXTENSION = "htmlmotion";

export const RESOLUTION_PRESETS: Array<{ label: string; width: number; height: number }> = [
  { label: "1920 × 1080", width: 1920, height: 1080 },
  { label: "1080 × 1920", width: 1080, height: 1920 },
  { label: "1080 × 1080", width: 1080, height: 1080 },
  { label: "3840 × 2160", width: 3840, height: 2160 },
  { label: "4096 × 2160", width: 4096, height: 2160 },
];

export const FPS_PRESETS = [24, 25, 30, 50, 60] as const;

export const DURATION_PRESETS = [1, 2, 3, 5, 10] as const;