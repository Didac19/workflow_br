import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const defaultServerUrl = env.VITE_DEFAULT_SERVER_URL || 'http://192.168.1.13:8069';

  return {
    plugins: [react(), tailwindcss()],

    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    //
    // 1. prevent Vite from obscuring rust errors
    clearScreen: false,
    // 2. tauri expects a fixed port, fail if that port is not available
    server: {
      port: 1420,
      strictPort: true,
      host: host || false,
      hmr: host
        ? {
          protocol: "ws",
          host,
          port: 1421,
        }
        : undefined,
      watch: {
        // 3. tell Vite to ignore watching `src-tauri`
        ignored: ["**/src-tauri/**"],
      },
      proxy: {
        '/jsonrpc': {
          target: defaultServerUrl,
          changeOrigin: true,
          router: (req) => {
            const targetUrl = req.headers['x-server-url'];
            return (typeof targetUrl === 'string' && targetUrl) ? targetUrl : defaultServerUrl;
          }
        }
      }
    },
  };
});
