import type { ViewMode } from "@/types";

export const VIEW_MODES: ViewMode[] = ["edit", "split", "preview"];

/** 状态栏显示的当前视图模式名 */
export const MODE_LABELS: Record<ViewMode, string> = {
  edit: "编辑",
  split: "分屏",
  preview: "预览",
};
