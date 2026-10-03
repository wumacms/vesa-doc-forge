/** 文档下载：文本类直接生成 Blob，PDF 从 base64 还原为二进制 */
import { base64ToBytes } from "./clipboard";

const MIME_BY_EXT: Record<string, string> = {
  md: "text/markdown",
  markdown: "text/markdown",
  mdx: "text/markdown",
  json: "application/json",
  jsonc: "application/json",
  json5: "application/json",
  yaml: "application/yaml",
  yml: "application/yaml",
  html: "text/html",
  htm: "text/html",
  xhtml: "application/xhtml+xml",
  css: "text/css",
  csv: "text/csv",
  xml: "application/xml",
  svg: "image/svg+xml",
  txt: "text/plain",
};

/** 按扩展名推断 MIME，未知类型回退纯文本 */
export function mimeOf(name: string): string {
  const dot = name.lastIndexOf(".");
  const ext = dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
  return MIME_BY_EXT[ext] ?? "text/plain";
}

/** 创建对象链接并触发浏览器下载，随后回收 URL */
export function downloadDocument(
  name: string,
  content: string,
  kind: "text" | "pdf",
): void {
  const blob =
    kind === "pdf"
      ? new Blob([base64ToBytes(content.trim())], { type: "application/pdf" })
      : new Blob([content], { type: mimeOf(name) });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
