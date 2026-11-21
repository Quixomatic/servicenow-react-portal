export interface TailwindCompiler {
    build(candidates: string[]): string;
}
export interface TailwindOptions {
    base?: string;
    loadStylesheet?: (id: string, base: string) => Promise<{ content: string; base: string; path?: string }>;
    /** Polyfills bit mask: 0 none, 1 @property fallbacks, 2 color-mix fallbacks, 3 all (default). */
    polyfills?: number;
}
export interface TailwindDesignSystem {
    /** CSS per candidate, in order; null for a candidate that isn't a utility. */
    candidatesToCss(candidates: string[]): (string | null)[];
}
export function compile(css: string, options: TailwindOptions): Promise<TailwindCompiler>;
export function loadDesignSystem(css: string, options: TailwindOptions): Promise<TailwindDesignSystem>;
export const sheets: Record<string, string>;
export const version: string;
export const hostCssVersions: Record<string, string>;
