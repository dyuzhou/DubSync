import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    minify: false,
    emptyOutDir: false,
    rollupOptions: {
      input: {
        interceptor: path.resolve(__dirname, 'src/interceptor.ts'),
      },
      output: {
        format: 'iife',
        name: 'DubSyncInterceptor',
        entryFileNames: 'interceptor.js',
        inlineDynamicImports: true,
      },
    },
  },
});
