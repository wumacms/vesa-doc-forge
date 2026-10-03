/**
 * Monaco 初始化：环境 + 自托管 worker（按 label 路由）。
 * 主题色板已迁移至 src/lib/theme/themeBridge.ts（运行时从 CSS 变量读取），
 * 不再需要离线 hex 常量。
 *
 * 为什么需要按 label 提供语言 worker：
 * json/css/html/typescript 的语言服务在主线程通过
 * `editor.createWebWorker({ moduleId, label })` 与 worker 通信，worker 收到
 * `$loadForeignModule` 后：
 * - 若 worker 入口以 `initialize(foreignModuleFactory)` 注册了静态工厂，
 *   直接同步返回方法名（Monaco 自带的语言 worker 入口即如此）；
 * - 否则走动态 `import(FileAccess.asBrowserUri(moduleId))` 分支，而 worker
 *   作用域没有 `_VSCODE_FILE_ROOT` 也没有 AMD require，
 *   `moduleIdToUrl.toUrl` 中 moduleIdToUrl 为 undefined，抛出
 *   "Cannot read properties of undefined (reading 'toUrl')"。
 * 因此 base worker 只服务 label "editorWorkerService"，语言 worker
 * 必须按 label 返回对应入口（其内部已注册静态 foreign module）。
 */
import * as monaco from "monaco-editor";
import editorWorkerUrl from "@/worker/editor.worker.ts?worker&url";
import jsonWorkerUrl from "monaco-editor/esm/vs/language/json/json.worker.js?worker&url";
import cssWorkerUrl from "monaco-editor/esm/vs/language/css/css.worker.js?worker&url";
import htmlWorkerUrl from "monaco-editor/esm/vs/language/html/html.worker.js?worker&url";
import tsWorkerUrl from "monaco-editor/esm/vs/language/typescript/ts.worker.js?worker&url";
import { createModuleWorker } from "@/lib/cleanWorker";

// Monaco 0.5x ESM 构建在主线程解析个别资源 URL 时同样调用 FileAccess.toUri()；
// 未设置 _VSCODE_FILE_ROOT 会走 AMD 的 require.toUrl() 分支而抛错。
// 使用 Vite 注入的 BASE_URL（GitHub Pages 项目页子路径形如 /vesa-doc-forge/），
// 保证子路径部署下 Monaco 资源解析基准正确。
(globalThis as { _VSCODE_FILE_ROOT?: string })._VSCODE_FILE_ROOT =
  typeof self !== "undefined" && self.location
    ? `${self.location.origin}${import.meta.env.BASE_URL}`
    : import.meta.env.BASE_URL;

let configured = false;

/** 按 MonacoEnvironment.getWorker 的 label 选择对应 worker 脚本。 */
function workerUrlForLabel(label: string): string {
  switch (label) {
    case "json":
      return jsonWorkerUrl;
    case "css":
    case "scss":
    case "less":
      return cssWorkerUrl;
    case "html":
    case "razor":
      return htmlWorkerUrl;
    case "typescript":
    case "javascript":
      return tsWorkerUrl;
    default:
      // "editorWorkerService" 及其它：基础 editor worker
      return editorWorkerUrl;
  }
}

function configureEnv(): void {
  if (configured) return;
  configured = true;
  (
    self as unknown as { MonacoEnvironment?: monaco.Environment }
  ).MonacoEnvironment = {
    getWorker(_workerId: string, label: string) {
      const url = workerUrlForLabel(label);
      try {
        return createModuleWorker(url);
      } catch (e) {
        // 语言 worker 创建失败（如环境劫持层直接 throw）时退回 base worker，
        // 保证 editorWorkerService 相关功能仍可用
        if (url === editorWorkerUrl) throw e;
        // eslint-disable-next-line no-console
        console.warn(
          `[DocForge] ${label} worker 创建失败，退回基础 worker：`,
          e,
        );
        return createModuleWorker(editorWorkerUrl);
      }
    },
  };
}

// 模块加载即配置：Monaco 可能在 setupMonaco() 被显式调用前创建 worker
if (typeof window !== "undefined") {
  configureEnv();
}

export function setupMonaco(): typeof monaco {
  configureEnv();
  return monaco;
}

export { monaco };
