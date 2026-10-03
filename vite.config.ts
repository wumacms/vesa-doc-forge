import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import vesaErrorReporter from "./.vesa/vite-error-plugin.js";
import vesaDesignMode from "./.vesa/vite-design-mode-plugin.js";
import path from "path";
import fs from "fs";

const hasEsaConfig = fs.existsSync(path.resolve(__dirname, "esa.jsonc"));

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const repoName = process.env.GITHUB_REPOSITORY
    ? `/${process.env.GITHUB_REPOSITORY.split("/")[1]}/`
    : "/vesa-doc-forge/";

  let base =
    process.env.BASE_URL ?? (process.env.GITHUB_ACTIONS ? repoName : "/");
  if (!base.endsWith("/")) {
    base += "/";
  }

  return {
    base,
    server: {
    host: "::",
    port: 5173,
    hmr: {
      overlay: false,
    },
    // worker 脚本可能从 iframe realm（opaque origin）发起请求，
    // 需要 CORP 放行，否则浏览器以 ERR_BLOCKED_BY_RESPONSE 拦截。
    headers: {
      "Cross-Origin-Resource-Policy": "cross-origin",
    },
    ...(hasEsaConfig
      ? {
          proxy: {
            "/api": {
              target: "http://127.0.0.1:18080",
              changeOrigin: true,
            },
          },
        }
      : {}),
  },
  plugins: [vesaErrorReporter(), vesaDesignMode(), tailwindcss(), react()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  };
});
