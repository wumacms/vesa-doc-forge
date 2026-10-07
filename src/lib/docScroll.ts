/**
 * 文档滚动定位：编辑器（Monaco）与预览区（含 iframe 沙箱 / PDF 内层滚动区）同步跳转。
 */
import type { ViewMode } from "@/types";
import type { OutlineItem } from "@/lib/outline";
import { editorInstanceRef, mainRef, previewScrollRef } from "@/lib/refs";

/**
 * 滚动预览区：外层容器自身可滚（Markdown/代码等）；
 * 否则找 data-doc-scroll 声明的内层滚动区（PDF）；
 * HTML iframe 用 postMessage 通知沙箱内滚动。
 */
export function scrollPreviewTo(pos: "top" | "bottom"): void {
  const root = previewScrollRef.current;
  if (!root) return;
  const iframe = root.querySelector("iframe");
  if (iframe?.contentWindow) {
    try {
      iframe.contentWindow.postMessage(
        { source: "vesadocforge", action: "scroll", to: pos },
        "*",
      );
      return;
    } catch {
      /* 继续走普通滚动 */
    }
  }
  const el =
    root.scrollHeight > root.clientHeight + 1
      ? root
      : root.querySelector<HTMLElement>("[data-doc-scroll]");
  if (!el) return;
  el.scrollTo({
    top: pos === "top" ? 0 : el.scrollHeight,
    behavior: "smooth",
  });
}

/** 跳到文档顶部/底部：编辑器与预览同时滚动（分屏时两边一致） */
export function scrollDocument(
  pos: "top" | "bottom",
  opts: { editable: boolean; mode: ViewMode },
): void {
  const { editable, mode } = opts;
  const editor = editorInstanceRef.current;
  if (editor && mode !== "preview" && editable) {
    const lineCount = editor.getModel()?.getLineCount() ?? 1;
    editor.revealLine(pos === "top" ? 1 : lineCount);
    editor.setPosition({
      lineNumber: pos === "top" ? 1 : lineCount,
      column: 1,
    });
    // Monaco 只接受 scrollTop/scrollLeft；跳底部用超大值让编辑器自行钳制
    editor.setScrollPosition({
      scrollTop: pos === "top" ? 0 : Number.MAX_SAFE_INTEGER,
    });
  }
  if (mode !== "edit") scrollPreviewTo(pos);
}

/** 点击大纲：编辑器跳行；分屏/预览时同步滚动预览区到对应标题 */
export function jumpToOutlineLine(
  item: OutlineItem,
  index: number,
  editable: boolean,
): void {
  const editor = editorInstanceRef.current;
  if (editor && editable) {
    editor.revealLineInCenter(item.line);
    editor.setPosition({ lineNumber: item.line, column: 1 });
    editor.focus();
  }
  // 预览中的标题与大纲条目按文档顺序一一对应（id="oc-<i>"）
  const host = mainRef.current?.querySelector(`#oc-${index}`);
  if (host) host.scrollIntoView({ behavior: "smooth", block: "start" });
}
