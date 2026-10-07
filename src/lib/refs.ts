/**
 * 跨模块共享的 DOM / 编辑器实例引用（模块级单例）。
 * EditorPane 写入，docScroll 等读取；App 把 mainRef/previewScrollRef 挂到 Workbench。
 */
import type { MutableRefObject } from "react";
import { monaco } from "@/lib/monacoSetup";

export const editorInstanceRef: MutableRefObject<monaco.editor.IStandaloneCodeEditor | null> = {
  current: null,
};

/** 预览区外层滚动容器（Markdown/代码等直接在其中滚动） */
export const previewScrollRef: MutableRefObject<HTMLDivElement | null> = {
  current: null,
};

/** 主内容区根元素（大纲跳转时在其中查询预览标题锚点） */
export const mainRef: MutableRefObject<HTMLElement | null> = {
  current: null,
};
