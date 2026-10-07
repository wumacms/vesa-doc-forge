/**
 * 种子数据：首次使用（存储为空）时写入工作区的演示文件树。
 */
import type { WsFile, WsNode } from "@/types";
import { uid } from "@/lib/tree";

const SAMPLE_PDF_B64 =
  "JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA2MTIgNzkyXSAvQ29udGVudHMgNCAwIFIgL1Jlc291cmNlcyA8PCAvRm9udCA8PCAvRjEgNSAwIFIgL0YyIDYgMCBSID4+ID4+ID4+CmVuZG9iago0IDAgb2JqCjw8IC9MZW5ndGggMjgyID4+CnN0cmVhbQpCVCAvRjEgMjggVGYgNzIgNzEwIFRkIChEb2NGb3JnZSBTYW1wbGUgUERGKSBUaiBFVApCVCAvRjIgMTQgVGYgNzIgNjgwIFRkIChUaGlzIGRvY3VtZW50IGlzIHJlbmRlcmVkIGVudGlyZWx5IGluIHlvdXIgYnJvd3Nlci4pIFRqIEVUCkJUIC9GMiAxNCBUZiA3MiA2NTUgVGQgKFVzZSB0aGUgdG9vbGJhciB0byBjaGFuZ2UgcGFnZSBhbmQgem9vbSBsZXZlbC4pIFRqIEVUCkJUIC9GMiAxMiBUZiA3MiA2MjAgVGQgKEdlbmVyYXRlZCBsb2NhbGx5IC0gbm8gc2VydmVyIGludm9sdmVkLikgVGogRVQKZW5kc3RyZWFtCmVuZG9iago1IDAgb2JqCjw8IC9UeXBlIC9Gb250IC9TdWJ0eXBlIC9UeXBlMSAvQmFzZUZvbnQgL0hlbHZldGljYS1Cb2xkID4+CmVuZG9iago2IDAgb2JqCjw8IC9UeXBlIC9Gb250IC9TdWJ0eXBlIC9UeXBlMSAvQmFzZUZvbnQgL0hlbHZldGljYSA+PgplbmRvYmoKeHJlZgowIDcKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNTggMDAwMDAgbiAKMDAwMDAwMDExNSAwMDAwMCBuIAowMDAwMDAwMjUxIDAwMDAwIG4gCjAwMDAwMDAwNTg0IDAwMDAwIG4gCjAwMDAwMDAwNjU5IDAwMDAwIG4gCnRyYWlsZXIKPDwgL1NpemUgNyAvUm9vdCAxIDAgUiA+PgpzdGFydHhyZWYKNzI5CiUlRU9G";

function file(name: string, content: string): WsFile {
  return { id: uid(), kind: "file", name, content };
}

export function seedTree(): WsNode[] {
  return [
    file(
      "README.md",
      `# VesaDocForge

一个完全在浏览器中运行的**多格式文档工作台**。

## 功能

- 🗂 文件夹树：新建 / 嵌套文件夹 / 重命名 / 删除（带确认）
- 📥 批量导入文件与整个文件夹（仅支持项目已注册的文档类型）
- 💾 IndexedDB 持久化（localStorage 兜底），文件与偏好刷新不丢失
- 🌗 浅色 / 深色主题，编辑器与预览同步换肤
- 🎨 Monaco 语法高亮 + highlight.js 预览
- 📑 解析器分发：\`.md\` 渲染、\`.json/.yaml\` 数据树、\`.html\` 沙箱、\`.pdf\` 只读

> 新增文档类型：在 \`src/lib/parsers/index.tsx\` 里 \`registerParser\` 一个解析器即可。

## 公式示例

$E = mc^2$，行间公式：

$$
\\int_{-\\infty}^{\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi}
$$

- [x] 文件夹树
- [x] 批量导入
- [ ] 导出 PDF
`,
    ),
    file(
      "config.json",
      `{
  "name": "vesadocforge",
  "version": "2.0.0",
  "features": {
    "theme": ["light", "dark"],
    "parsers": ["markdown", "json", "yaml", "html", "code", "pdf"],
    "folderTree": true,
    "bulkImport": true
  },
  "storage": { "primary": "indexeddb", "fallback": "localStorage" }
}
`,
    ),
    {
      id: uid(),
      kind: "folder",
      name: "示例文件夹",
      children: [
        file(
          "notes.md",
          `# 学习笔记

## 线性代数

矩阵乘法 $C = AB$：

$$
A = \\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}
$$

## 待办

- [x] 配置 Monaco worker
- [ ] 协作编辑

\`\`\`ts
const fib = (n: number): number =>
  n < 2 ? n : fib(n - 1) + fib(n - 2);
\`\`\`
`,
        ),
        file(
          "docker-compose.yml",
          `# 示例配置：预览会解析成数据树
version: "3.9"
services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"
`,
        ),
        {
          id: uid(),
          kind: "folder",
          name: "嵌套子文件夹",
          children: [
            file(
              "demo.html",
              `<!doctype html>
<html lang="zh">
  <head><meta charset="utf-8" /><title>沙箱渲染演示</title></head>
  <body style="font-family:sans-serif;display:grid;place-items:center;min-height:90vh">
    <h1>Hello VesaDocForge 👋</h1>
  </body>
</html>
`,
            ),
          ],
        },
      ],
    },
    file("sample.pdf", SAMPLE_PDF_B64),
  ];
}
