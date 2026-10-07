/**
 * Monaco 文本模型注册表：每个文件一个 model，切换文件时保留 undo 历史与视图状态。
 * 删除文件时须调用 disposeModel 释放模型。
 */
import { monaco } from "@/lib/monacoSetup";
import { resolveParser } from "@/lib/parsers/registry";

export interface ModelEntry {
  model: monaco.editor.ITextModel;
  state: monaco.editor.ICodeEditorViewState | null;
}

export const models = new Map<string, ModelEntry>();

/** 通过解析器注册表获取 Monaco 语言 id（未知类型回退 plaintext） */
export function languageOf(name: string): string {
  try {
    const parser = resolveParser(name);
    return parser.monacoLanguage(
      name.slice(name.lastIndexOf(".") + 1).toLowerCase(),
      name,
    );
  } catch {
    return "plaintext";
  }
}

/** 删除文件时清理对应 model */
export function disposeModel(id: string): void {
  const entry = models.get(id);
  if (entry) {
    entry.model.dispose();
    models.delete(id);
  }
}
