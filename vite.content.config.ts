import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    minify: false,
    emptyOutDir: false,
    rollupOptions: {
      input: {
        content: path.resolve(__dirname, 'src/content.ts'),
      },
      output: {
        format: 'iife',
        name: 'DubSyncContent',
        entryFileNames: 'content.js',
      },
    },
  },
});
