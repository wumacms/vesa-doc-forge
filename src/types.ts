import type { ComponentType } from "react";

/** 文件大类：仅用于图标与通用 UI 分支，具体解析由 parser 注册表决定 */
export type FileKind = "markdown" | "code" | "pdf" | "text";

/** 视图模式 */
export type ViewMode = "edit" | "split" | "preview";

/** 工作区文件节点（叶子） */
export interface WsFile {
  id: string;
  kind: "file";
  name: string;
  /** 文本类文件为原文；PDF 为 base64 字符串 */
  content: string;
}

/** 工作区文件夹节点 */
export interface WsFolder {
  id: string;
  kind: "folder";
  name: string;
  children: WsNode[];
}

export type WsNode = WsFile | WsFolder;

/** 预览组件接收的文件对象（WsFile 结构兼容） */
export interface DocFile {
  id: string;
  name: string;
  content: string;
}

export interface PreviewProps {
  file: DocFile;
}

/**
 * 文档解析器：每种文件类型注册一个 parser。
 * 新增文档类型 = 新增一个 DocParser 并 registerParser，无需改动 App/编辑器。
 */
export interface DocParser {
  /** 唯一 id，如 "markdown" / "json" / "pdf" */
  id: string;
  /** 顶栏展示的解析器名称 */
  label: string;
  /** 文件树图标分类 */
  iconKind: FileKind;
  /** 是否允许进入编辑器（PDF 等二进制只读类型应为 false） */
  editable: boolean;
  /** 类型匹配；注册顺序即优先级，fallback parser 应最后注册 */
  test(ext: string, name: string): boolean;
  /** Monaco 语言 id（用于编辑器语法高亮） */
  monacoLanguage(ext: string, name: string): string;
  /** 预览组件（由 PreviewPane 按 parser 分发） */
  Preview: ComponentType<PreviewProps>;
}

export function extOf(name: string): string {
  const base = name.split("/").pop() ?? name;
  // dockerfile / makefile 等无扩展名文件用整个文件名匹配
  const i = base.lastIndexOf(".");
  return i <= 0 ? base.toLowerCase() : base.slice(i + 1).toLowerCase();
}
