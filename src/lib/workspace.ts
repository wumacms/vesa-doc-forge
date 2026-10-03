import type { WsFile, WsFolder, WsNode } from "@/types";
import { extOf } from "@/types";
import { resolveParser } from "@/lib/parsers/registry";
import { kvGet, kvSet } from "@/lib/storage";

const STORAGE_KEY = "docforge.workspace.v3";

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/* ------------------------------------------------------------------ */
/* 树操作纯函数                                                        */
/* ------------------------------------------------------------------ */

export function findNode(
  nodes: WsNode[],
  id: string,
): { node: WsNode; parent: WsFolder | null } | null {
  const walk = (
    list: WsNode[],
    parent: WsFolder | null,
  ): { node: WsNode; parent: WsFolder | null } | null => {
    for (const n of list) {
      if (n.id === id) return { node: n, parent };
      if (n.kind === "folder") {
        const hit = walk(n.children, n);
        if (hit) return hit;
      }
    }
    return null;
  };
  return walk(nodes, null);
}

export function countFiles(node: WsNode): number {
  if (node.kind === "file") return 1;
  return node.children.reduce((s, c) => s + countFiles(c), 0);
}

export function collectFileIds(node: WsNode, acc: string[] = []): string[] {
  if (node.kind === "file") acc.push(node.id);
  else node.children.forEach((c) => collectFileIds(c, acc));
  return acc;
}

/** 收集文件夹节点自身及其子孙文件夹的 id（用于清理展开状态） */
export function collectFolderIds(node: WsNode, acc: string[] = []): string[] {
  if (node.kind === "folder") {
    acc.push(node.id);
    node.children.forEach((c) => collectFolderIds(c, acc));
  }
  return acc;
}

/** 同级唯一命名：冲突时追加 (1)、(2)… */
export function uniqueName(
  siblings: WsNode[],
  name: string,
  excludeId?: string,
): string {
  if (!siblings.some((s) => s.id !== excludeId && s.name === name)) return name;
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  let i = 1;
  while (siblings.some((s) => s.id !== excludeId && s.name === `${base} (${i})${ext}`)) i++;
  return `${base} (${i})${ext}`;
}

function mapTree(nodes: WsNode[], fn: (n: WsNode) => WsNode | null): WsNode[] {
  const out: WsNode[] = [];
  for (const n of nodes) {
    const mapped = fn(n);
    if (!mapped) continue;
    out.push(
      mapped.kind === "folder" && mapped !== n
        ? { ...mapped, children: mapTree(mapped.children, fn) }
        : mapped,
    );
  }
  return out;
}

export function insertChild(
  nodes: WsNode[],
  parentId: string | null,
  child: WsNode,
): WsNode[] {
  if (parentId === null) return [...nodes, child];
  return mapTree(nodes, (n) =>
    n.kind === "folder" && n.id === parentId
      ? { ...n, children: [...n.children, child] }
      : n,
  );
}

/** 将多路径文件批量合并进树（按 webkitRelativePath 建文件夹） */
export function mergeByPaths(
  nodes: WsNode[],
  items: { path: string; file: WsFile }[],
): WsNode[] {
  const root: WsFolder = { id: "__root__", kind: "folder", name: "", children: nodes };
  for (const { path, file } of items) {
    const parts = path.split("/").filter(Boolean);
    let cursor = root;
    for (const seg of parts.slice(0, -1)) {
      let sub = cursor.children.find(
        (c): c is WsFolder => c.kind === "folder" && c.name === seg,
      );
      if (!sub) {
        sub = { id: uid(), kind: "folder", name: seg, children: [] };
        cursor.children.push(sub);
      }
      cursor = sub;
    }
    const name = uniqueName(cursor.children, file.name);
    cursor.children.push({ ...file, name });
  }
  return root.children;
}

export function removeNode(nodes: WsNode[], id: string): WsNode[] {
  return mapTree(nodes, (n) => (n.id === id ? null : n));
}

/** 更新指定文件的内容（不可变） */
export function updateFile(
  nodes: WsNode[],
  id: string,
  content: string,
): WsNode[] {
  return nodes.map((n) => {
    if (n.kind === "file") return n.id === id ? { ...n, content } : n;
    return { ...n, children: updateFile(n.children, id, content) };
  });
}

export function renameNode(nodes: WsNode[], id: string, name: string): WsNode[] {
  return mapTree(nodes, (n) => (n.id === id ? { ...n, name } : n));
}

/* ------------------------------------------------------------------ */
/* 批量导入：类型过滤与读取                                            */
/* ------------------------------------------------------------------ */

/**
 * 项目支持的文件 = 有专属解析器的类型（markdown/pdf/html/json/yaml）。
 * 其余扩展名会命中 code/text fallback、把任意二进制塞成乱码文本，
 * 因此导入时直接跳过并提示。
 */
const FALLBACK_IDS = new Set(["code", "text"]);

export function isSupportedImport(name: string): boolean {
  try {
    return !FALLBACK_IDS.has(resolveParser(name).id);
  } catch {
    return false;
  }
}

/** 候选扩展名：从中筛出被专属解析器（非 fallback）支持的类型 */
const EXT_CANDIDATES = [
  "md", "markdown", "mdx",
  "json", "jsonc", "json5",
  "yaml", "yml",
  "html", "htm", "xhtml",
  "pdf",
];

/** 供 <input accept> 使用的扩展名列表（如 ".md,.json,..."） */
export function supportedExtensions(): string {
  const exts = EXT_CANDIDATES.filter((e) => {
    try {
      return !FALLBACK_IDS.has(resolveParser(`x.${e}`).id);
    } catch {
      return false;
    }
  });
  return exts.map((e) => `.${e}`).join(",");
}

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 单文件 5MB 上限，防 storage 爆掉

function bytesToB64(bytes: Uint8Array): string {
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

export interface ImportResult {
  files: WsFile[];
  /** 相对路径（不含文件名），用于还原文件夹结构 */
  paths: string[];
  skipped: string[];
}

/**
 * 读取一批待导入文件。
 * path 为相对路径（可含目录），用于还原文件夹结构；缺省用文件名。
 */
export async function readImportedFiles(
  list: FileList | File[] | { file: File; path?: string }[],
): Promise<ImportResult> {
  const entries = Array.from(list).map((it) =>
    it instanceof File
      ? { file: it, path: relPathOf(it) }
      : { file: it.file, path: it.path ?? it.file.name },
  );
  const files: WsFile[] = [];
  const paths: string[] = [];
  const skipped: string[] = [];
  for (const { file: f, path } of entries) {
    if (!isSupportedImport(f.name) || f.size > MAX_FILE_BYTES) {
      skipped.push(f.name);
      continue;
    }
    if (extOf(f.name) === "pdf") {
      const buf = new Uint8Array(await f.arrayBuffer());
      files.push({ id: uid(), kind: "file", name: f.name, content: bytesToB64(buf) });
    } else {
      files.push({ id: uid(), kind: "file", name: f.name, content: await f.text() });
    }
    paths.push(path);
  }
  return { files, paths, skipped };
}

/** File 的相对路径（文件夹选择时浏览器提供 webkitRelativePath） */
export function relPathOf(f: File): string {
  const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath;
  return rel && rel.length > 0 ? rel : f.name;
}

/* ------------------------------------------------------------------ */
/* 持久化（IndexedDB 优先，localStorage 兜底）+ 旧版迁移               */
/* ------------------------------------------------------------------ */

export async function loadWorkspace(): Promise<WsNode[]> {
  const data = await kvGet<WsNode[] | WsFile[]>(STORAGE_KEY);
  if (data && Array.isArray(data) && data.length > 0) {
    // 旧版 v3 键下可能存着扁平 DocFile[]（数组元素无 kind 字段）→ 迁移为根级文件
    if (typeof (data[0] as Partial<WsNode>).kind !== "string") {
      return (data as WsFile[]).map((f) => ({ ...f, kind: "file" as const }));
    }
    return data as WsNode[];
  }
  const seeded = seedTree();
  void saveWorkspace(seeded);
  return seeded;
}

export function saveWorkspace(nodes: WsNode[]): void {
  void kvSet(STORAGE_KEY, nodes);
}

/* ------------------------------------------------------------------ */
/* 种子数据（首次使用时写入）                                          */
/* ------------------------------------------------------------------ */

const SAMPLE_PDF_B64 =
  "JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA2MTIgNzkyXSAvQ29udGVudHMgNCAwIFIgL1Jlc291cmNlcyA8PCAvRm9udCA8PCAvRjEgNSAwIFIgL0YyIDYgMCBSID4+ID4+ID4+CmVuZG9iago0IDAgb2JqCjw8IC9MZW5ndGggMjgyID4+CnN0cmVhbQpCVCAvRjEgMjggVGYgNzIgNzEwIFRkIChEb2NGb3JnZSBTYW1wbGUgUERGKSBUaiBFVApCVCAvRjIgMTQgVGYgNzIgNjgwIFRkIChUaGlzIGRvY3VtZW50IGlzIHJlbmRlcmVkIGVudGlyZWx5IGluIHlvdXIgYnJvd3Nlci4pIFRqIEVUCkJUIC9GMiAxNCBUZiA3MiA2NTUgVGQgKFVzZSB0aGUgdG9vbGJhciB0byBjaGFuZ2UgcGFnZSBhbmQgem9vbSBsZXZlbC4pIFRqIEVUCkJUIC9GMiAxMiBUZiA3MiA2MjAgVGQgKEdlbmVyYXRlZCBsb2NhbGx5IC0gbm8gc2VydmVyIGludm9sdmVkLikgVGogRVQKZW5kc3RyZWFtCmVuZG9iago1IDAgb2JqCjw8IC9UeXBlIC9Gb250IC9TdWJ0eXBlIC9UeXBlMSAvQmFzZUZvbnQgL0hlbHZldGljYS1Cb2xkID4+CmVuZG9iago2IDAgb2JqCjw8IC9UeXBlIC9Gb250IC9TdWJ0eXBlIC9UeXBlMSAvQmFzZUZvbnQgL0hlbHZldGljYSA+PgplbmRvYmoKeHJlZgowIDcKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNTggMDAwMDAgbiAKMDAwMDAwMDExNSAwMDAwMCBuIAowMDAwMDAwMjUxIDAwMDAwIG4gCjAwMDAwMDAwNTg0IDAwMDAwIG4gCjAwMDAwMDAwNjU5IDAwMDAwIG4gCnRyYWlsZXIKPDwgL1NpemUgNyAvUm9vdCAxIDAgUiA+PgpzdGFydHhyZWYKNzI5CiUlRU9G";

function file(name: string, content: string): WsFile {
  return { id: uid(), kind: "file", name, content };
}

function seedTree(): WsNode[] {
  return [
    file(
      "README.md",
      `# DocForge

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
  "name": "docforge",
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
    <h1>Hello DocForge 👋</h1>
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
