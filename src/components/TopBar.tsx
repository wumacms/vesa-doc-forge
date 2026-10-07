/**
 * 顶栏：品牌区 + 侧边栏折叠开关 + 文档工具 + 视图模式切换。
 */
import { Hammer, PanelLeft } from "lucide-react";
import type { ViewMode } from "@/types";
import { cn } from "@/lib/utils";
import DocTools, { type DocTool } from "@/components/DocTools";
import ModeSwitcher from "@/components/ModeSwitcher";

interface Props {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  /** 有活动文档时显示工具区 */
  hasActive: boolean;
  docToolGroups: { key: string; tools: DocTool[] }[];
  effectiveMode: ViewMode;
  editable: boolean;
  isMobile: boolean;
  onModeChange: (m: ViewMode) => void;
}

export default function TopBar({
  sidebarCollapsed,
  onToggleSidebar,
  hasActive,
  docToolGroups,
  effectiveMode,
  editable,
  isMobile,
  onModeChange,
}: Props) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border bg-card/70 px-4">
      <div className="flex min-w-0 items-center gap-2">
        {/* 折叠/展开入口常驻：桌面端与移动端行为一致 */}
        <button
          type="button"
          title={sidebarCollapsed ? "展开侧边栏" : "折叠侧边栏"}
          aria-label={sidebarCollapsed ? "展开侧边栏" : "折叠侧边栏"}
          aria-expanded={!sidebarCollapsed}
          onClick={onToggleSidebar}
          className={cn(
            "shrink-0 border border-border bg-background p-1.5 transition-colors hover:bg-accent hover:text-accent-foreground",
            !sidebarCollapsed && "text-primary",
            sidebarCollapsed && "text-muted-foreground",
          )}
        >
          <PanelLeft className="h-4 w-4" aria-hidden />
        </button>
        <Hammer className="h-5 w-5 shrink-0 text-primary" aria-hidden />
        <span className="hidden font-serif text-lg font-semibold tracking-tight md:inline">
          VesaDocForge
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {hasActive && <DocTools groups={docToolGroups} />}
        {hasActive && (
          <ModeSwitcher
            effectiveMode={effectiveMode}
            editable={editable}
            isMobile={isMobile}
            onChange={onModeChange}
          />
        )}
      </div>
    </header>
  );
}
