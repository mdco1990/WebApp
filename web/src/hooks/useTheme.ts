// Shim to avoid JSX in .ts files for esbuild/Vite: re-export the TSX module with a different basename
export { ThemeProvider, useTheme } from './useTheme.view';
