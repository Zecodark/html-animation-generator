import { transform } from "sucrase";

export interface CompileResult {
  success: true;
  code: string;
}

export interface CompileError {
  success: false;
  error: string;
}

/**
 * Compile TSX source to plain JavaScript using Sucrase.
 *
 * The output uses React.createElement (classic JSX runtime) so the preview
 * iframe only needs React + ReactDOM loaded from CDN.
 */
export function compileTsx(source: string): CompileResult | CompileError {
  try {
    const result = transform(source, {
      transforms: ["typescript", "jsx", "imports"],
      jsxRuntime: "classic",
      production: true,
    });
    return { success: true, code: result.code };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
