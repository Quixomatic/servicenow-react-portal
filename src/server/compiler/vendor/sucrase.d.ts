export interface SucraseOptions {
    transforms: Array<'typescript' | 'jsx' | 'imports' | 'flow' | 'react-hot-loader' | 'jest'>
    jsxRuntime?: 'classic' | 'automatic' | 'preserve'
    jsxPragma?: string
    jsxFragmentPragma?: string
    production?: boolean
    filePath?: string
    disableESTransforms?: boolean
    keepUnusedImports?: boolean
}
export function transform(code: string, options: SucraseOptions): { code: string }
export const version: string
