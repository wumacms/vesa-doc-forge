import { useEffect, useRef, type MutableRefObject } from "react";
import { monaco } from "@/lib/monacoSetup";
import { syncMonacoThemeWithDOM, installThemeBridge } from "@/lib/theme/themeBridge";
import { resolveParser } from "@/lib/parsers/registry";
import type { WsFile } from "@/types";

interface Props {
  file: WsFile;
  onChange: (content: string) => void;
  /** 光标行变化回调（1-based），供大纲高亮 */
  onCursorLine?: (line: number) => void;
  /** App 持有的编辑器实例 ref，用于大纲跳转 revealLine */
  editorRef?: MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
}

interface ModelEntry {
  model: monaco.editor.ITextModel;
  state: monaco.editor.ICodeEditorViewState | null;
}

/** 每个文件一个 model，切换文件时保留 undo 历史与视图状态 */
const models = new Map<string, ModelEntry>();

/** 通过解析器注册表获取 Monaco 语言 id（未知类型回退 plaintext） */
function languageOf(name: string): string {
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

export default function EditorPane({ file, onChange, onCursorLine, editorRef }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorInstanceRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onCursorLineRef = useRef(onCursorLine);
  onCursorLineRef.current = onCursorLine;
  // 主题（风格 × 明暗）由 DOM 上的 data-style / .dark 决定；
  // Monaco 配色由 themeBridge 经 MutationObserver 自动同步，无需在此驱动。

  useEffect(() => {
    if (!containerRef.current) return;
    installThemeBridge();
    syncMonacoThemeWithDOM();
    const editor = monaco.editor.create(containerRef.current, {
      value: "",
      language: "plaintext",
      automaticLayout: true,
      fontSize: 14,
      lineHeight: 1.7,
      wordWrap: "off",
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      padding: { top: 16, bottom: 16 },
      renderLineHighlight: "line",
      scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
    });
    editorInstanceRef.current = editor;
    if (editorRef) editorRef.current = editor;

    // 光标行上报（大纲高亮）
    const curSub = editor.onDidChangeCursorPosition((e) => {
      onCursorLineRef.current?.(e.position.lineNumber);
    });

    return () => {
      curSub.dispose();
      editor.dispose();
      editorInstanceRef.current = null;
      if (editorRef) editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 主题切换的 Monaco 同步已下沉到 themeBridge 的 MutationObserver
  // （监听 html 的 class 与 data-style），此处无需再显式驱动。

  useEffect(() => {
    const editor = editorInstanceRef.current;
    if (!editor) return;

    const lang = languageOf(file.name);
    let entry = models.get(file.id);
    if (!entry) {
      const model = monaco.editor.createModel(
        file.content,
        lang,
        monaco.Uri.parse(`file:///docforge/${encodeURIComponent(file.id)}`),
      );
      entry = { model, state: null };
      models.set(file.id, entry);
    } else {
      // 文件可能已重命名，同步语言
      monaco.editor.setModelLanguage(entry.model, lang);
    }

    const current = editor.getModel();
    if (current !== entry.model) {
      if (current) {
        for (const e of models.values()) {
          if (e.model === current) e.state = editor.saveViewState();
        }
      }
      editor.setModel(entry.model);
      if (entry.state) editor.restoreViewState(entry.state);
    }

    const sub = editor.onDidChangeModelContent(() => {
      onChangeRef.current(editor.getValue());
    });
    return () => sub.dispose();
  }, [file.id, file.name, file.content]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      role="textbox"
      aria-label="文档编辑器"
    />
  );
}

/** 删除文件时清理对应 model */
export function disposeModel(id: string): void {
  const entry = models.get(id);
  if (entry) {
    entry.model.dispose();
    models.delete(id);
  }
}
