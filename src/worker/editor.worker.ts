/**
 * 自托管的 Monaco editor worker 入口。
 * 通过 Vite `?worker&url` 以原生 module worker 形式加载，
 * 避免 Vite worker 插件把依赖打包成 classic 引导脚本。
 */
import { initialize } from "monaco-editor/esm/vs/editor/editor.worker.js";

self.onmessage = () => {
  initialize(null);
};
