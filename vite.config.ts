import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import { isSupabaseServiceRoleKey } from './src/services/supabaseKeySafety.ts';

export default defineConfig(() => {
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';
  if (isSupabaseServiceRoleKey(supabaseKey)) {
    throw new Error(
      'VITE_SUPABASE_ANON_KEY must be an anon/publishable key; service-role keys cannot be bundled.'
    );
  }
  const projectDir = path.dirname(fileURLToPath(import.meta.url));

  return {
    base: '/dimsum-me/',
    plugins: [
      react(),
      tailwindcss(),
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." still resolve in production builds.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(projectDir, 'dist');
          const srcAssets = path.resolve(projectDir, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, { recursive: true, force: true });
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(projectDir, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
