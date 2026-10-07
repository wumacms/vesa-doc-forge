/**
 * 批量导入：类型过滤、大小限制与文件读取。
 */
import type { WsFile } from "@/types";
import { extOf } from "@/types";
import { resolveParser } from "@/lib/parsers/registry";
import { uid } from "@/lib/tree";

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
  // 入参可能是 FileList 或两种数组，统一按 ArrayLike 取原始项再归一化
  const raw = Array.from(list as ArrayLike<unknown>) as (
    | File
    | { file: File; path?: string }
  )[];
  const entries = raw.map((it) =>
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
