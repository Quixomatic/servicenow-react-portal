/**
 * The build asset holding the compiler's cache (compiler.ts CompileCache). Its own module so the asset
 * service can refuse it without loading the compiler and its vendor bundles.
 */
export const COMPILE_CACHE_ASSET = 'compile-cache.json';
