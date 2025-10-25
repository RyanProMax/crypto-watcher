import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['cjs'],
  target: 'node18',
  platform: 'node',
  outDir: 'dist',
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  minify: false,
  dts: false,
  shims: false
});
