import type { NextConfig } from "next";

/**
 * Web workers are emitted as static assets whose filename keeps the source
 * extension (`renderer.worker.xxx.ts`), and the dev/prod server then serves
 * those `.ts` files with a `video/mp2t` Content-Type, which prevents browsers
 * from executing module workers.
 *
 * This rule renames web-worker assets to `.js` so they are served correctly.
 */
function isWorkerAsset(pathData: { filename?: string }): boolean {
  const filename = pathData?.filename ?? "";
  return /\.worker\.[a-z0-9]+$/.test(filename);
}

const nextConfig: NextConfig = {
  // Silence the "webpack config present but no turbopack config" warning that
  // Next.js 16 emits when Turbopack (now the default) detects a webpack config.
  turbopack: {},
  webpack: (config) => {
    const generator = config.module?.generator?.asset as
      | { filename: unknown }
      | undefined;

    if (generator) {
      const original = generator.filename;
      generator.filename = (pathData: { filename?: string }, assetInfo?: unknown) => {
        if (isWorkerAsset(pathData)) {
          return "static/media/[name].[hash:8].js";
        }
        if (typeof original === "function") {
          return original(pathData, assetInfo);
        }
        return (original as string) ?? "static/media/[name].[hash:8][ext]";
      };
    }
    return config;
  },
};

export default nextConfig;