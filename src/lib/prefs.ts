/**
 * 用户偏好：localStorage 键定义与同步恢复逻辑。
 */
import type { ViewMode, WsNode } from "@/types";
import type { SidebarTab } from "@/components/SidebarTabs";
import { getPref } from "@/lib/storage";
import { VIEW_MODES } from "@/lib/viewModes";

export const VIEW_MODE_KEY = "vesadocforge:view-mode";
export const EXPANDED_KEY = "vesadocforge:expanded-folders";
export const ACTIVE_KEY = "vesadocforge:active-file";
export const SIDEBAR_KEY = "vesadocforge:sidebar-tab";
export const SIDEBAR_COLLAPSED_KEY = "vesadocforge:sidebar-collapsed";

/** 视图模式属于用户偏好：同步从 localStorage 恢复，非法值回退分屏 */
export function initialViewMode(): ViewMode {
  const saved = getPref(VIEW_MODE_KEY);
  return VIEW_MODES.includes(saved as ViewMode) ? (saved as ViewMode) : "split";
}

/** 恢复展开的文件夹集合；无记录时回退"展开根级文件夹"的默认行为 */
export function restoreExpanded(nodes: WsNode[]): Set<string> {
  const raw = getPref(EXPANDED_KEY);
  if (raw) {
    try {
      const arr = JSON.parse(raw) as unknown;
      if (Array.isArray(arr) && arr.every((x) => typeof x === "string")) {
        return new Set(arr as string[]);
      }
    } catch {
      // 解析失败则走默认
    }
  }
  return new Set(nodes.filter((n) => n.kind === "folder").map((n) => n.id));
}

/** 侧边栏视图偏好：files / outline（仅 Markdown 时 outline 可用） */
export function initialSidebarTab(): SidebarTab {
  return getPref(SIDEBAR_KEY) === "outline" ? "outline" : "files";
}

/** 侧边栏折叠偏好 */
export function initialSidebarCollapsed(): boolean {
  return getPref(SIDEBAR_COLLAPSED_KEY) === "1";
}
