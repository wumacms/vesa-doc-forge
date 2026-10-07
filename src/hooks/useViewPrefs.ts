/**
 * 视图偏好 Hook：模式 / 侧边栏 tab / 折叠状态，均同步持久化到 localStorage。
 */
import { useEffect, useState } from "react";
import type { ViewMode } from "@/types";
import type { SidebarTab } from "@/components/SidebarTabs";
import {
  SIDEBAR_COLLAPSED_KEY,
  SIDEBAR_KEY,
  VIEW_MODE_KEY,
  initialSidebarCollapsed,
  initialSidebarTab,
  initialViewMode,
} from "@/lib/prefs";
import { setPref } from "@/lib/storage";

export function useViewPrefs(isMobile: boolean) {
  const [mode, setMode] = useState<ViewMode>(initialViewMode);
  /** 侧边栏折叠：桌面端与移动端都可折叠，切换入口常驻顶栏；偏好持久化 */
  const [sidebarCollapsed, setSidebarCollapsed] = useState(initialSidebarCollapsed);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>(initialSidebarTab);

  /* 进入移动端时把已保存的 split 偏好自动切到 preview（离屏不反向覆盖） */
  useEffect(() => {
    if (isMobile) {
      setMode((m) => (m === "split" ? "preview" : m));
    }
  }, [isMobile]);

  useEffect(() => {
    setPref(VIEW_MODE_KEY, mode);
  }, [mode]);

  useEffect(() => {
    setPref(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed ? "1" : "0");
  }, [sidebarCollapsed]);

  const handleSidebarTab = (t: SidebarTab) => {
    setSidebarTab(t);
    setPref(SIDEBAR_KEY, t);
  };

  return {
    mode,
    setMode,
    sidebarCollapsed,
    setSidebarCollapsed,
    sidebarTab,
    handleSidebarTab,
  };
}
