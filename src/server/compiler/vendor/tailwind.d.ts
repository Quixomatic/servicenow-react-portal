export interface TailwindCompiler {
    build(candidates: string[]): string
}
export function compile(
    css: string,
    options: { base?: string; loadStylesheet?: (id: string, base: string) => Promise<{ content: string; base: string; path?: string }> },
): Promise<TailwindCompiler>
export const sheets: Record<string, string>
export const version: string
