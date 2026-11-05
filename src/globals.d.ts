/** Replaced at build time: true for dev/test builds, false for store builds. */
declare const __DEV__: boolean;
declare module '*.css?inline' { const css: string; export default css; }
/** Dev-only data host override (EXT_DATA_URL at build time); empty in store builds. */
declare const __DATA_URL__: string;
