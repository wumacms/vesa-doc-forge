/**
 * App：顶层装配层。
 * 状态逻辑在 hooks（useWorkspace / useViewPrefs），
 * 渲染在组件（TopBar / Workbench / ConfirmDialogs），
 * 纯逻辑在 lib（tree / importFiles / docScroll / docActions / prefs / workspace）。
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSidebarResize } from "@/hooks/useSidebarResize";
import { useViewPrefs } from "@/hooks/useViewPrefs";
import { useWorkspace } from "@/hooks/useWorkspace";
import SidebarResizeHandle from "@/components/SidebarResizeHandle";
import FileTree from "@/components/FileTree";
import OutlinePane from "@/components/OutlinePane";
import SidebarFooter from "@/components/SidebarFooter";
import SidebarTabs from "@/components/SidebarTabs";
import TopBar from "@/components/TopBar";
import Workbench from "@/components/Workbench";
import ConfirmDialogs from "@/components/ConfirmDialogs";
import {
  ArrowDownToLine,
  ArrowUpToLine,
  Copy,
  Download,
} from "lucide-react";
import type { DocTool } from "@/components/DocTools";
import type { ViewMode } from "@/types";
import { extractOutline, type OutlineItem } from "@/lib/outline";
import { resolveParser } from "@/lib/parsers/registry";
import "@/lib/parsers"; // 副作用：注册全部文档解析器
import { setupMonaco } from "@/lib/monacoSetup";
import { mainRef, previewScrollRef } from "@/lib/refs";
import { jumpToOutlineLine, scrollDocument } from "@/lib/docScroll";
import { copyDocument, downloadDoc } from "@/lib/docActions";

// 提前注册 MonacoEnvironment，避免首次创建编辑器时才配置的竞态
setupMonaco();

export default function App() {
  const isMobile = useIsMobile();
  const sidebar = useSidebarResize();
  const ws = useWorkspace();
  const prefs = useViewPrefs(isMobile);

  const [cursorLine, setCursorLine] = useState<number | null>(null);

  const { active, nodes } = ws;

  /* ---------- 派生：解析器 / 生效模式 ---------- */
  const parser = useMemo(
    () => (active ? resolveParser(active.name) : null),
    [active],
  );
  const editable = parser?.editable ?? false;
  /** 移动端空间不足以承载分屏：split 一律降级为 preview */
  const effectiveMode: ViewMode = editable
    ? isMobile && prefs.mode === "split"
      ? "preview"
      : prefs.mode
    : "preview";

  /* ---------- 大纲（仅 Markdown） ---------- */
  const isMarkdown = parser?.id === "markdown";
  const outline = useMemo(
    () => (isMarkdown && active ? extractOutline(active.content) : []),
    [isMarkdown, active],
  );
  // 非 Markdown 文件时强制回到"文件目录"视图
  const sidebarTabEffective =
    isMarkdown && prefs.sidebarTab === "outline" ? "outline" : "files";

  /* ---------- 文档工具栏 ---------- */
  const docToolGroups: { key: string; tools: DocTool[] }[] = [
    {
      key: "scroll",
      tools: [
        {
          key: "top",
          label: "跳到文档顶部",
          icon: ArrowUpToLine,
          onClick: () => scrollDocument("top", { editable, mode: effectiveMode }),
        },
        {
          key: "bottom",
          label: "跳到文档底部",
          icon: ArrowDownToLine,
          onClick: () => scrollDocument("bottom", { editable, mode: effectiveMode }),
        },
      ],
    },
    {
      key: "export",
      tools: [
        {
          key: "copy",
          label: "复制文档内容",
          icon: Copy,
          disabledTitle: "PDF 不支持复制文本内容",
          onClick: () => active && void copyDocument(active),
          disabled: parser?.id === "pdf",
        },
        {
          key: "download",
          label: "下载文档",
          icon: Download,
          onClick: () => active && downloadDoc(active, parser?.id),
        },
      ],
    },
  ];

  /* ---------- 侧边栏事件 ---------- */
  const handleOutlineJump = useCallback(
    (index: number, item: OutlineItem) => {
      jumpToOutlineLine(item, index, editable);
    },
    [editable],
  );

  const sidebarFooter = (
    <SidebarFooter
      onImport={(list) => void ws.importFrom(list)}
      onClearAll={() => ws.setConfirmClear(true)}
      clearDisabled={nodes.length === 0}
    />
  );

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <TopBar
        sidebarCollapsed={prefs.sidebarCollapsed}
        onToggleSidebar={() => prefs.setSidebarCollapsed((c) => !c)}
        hasActive={active !== null}
        docToolGroups={docToolGroups}
        effectiveMode={effectiveMode}
        editable={editable}
        isMobile={isMobile}
        onModeChange={prefs.setMode}
      />

      {/* 主体 */}
      <div className="flex min-h-0 flex-1">
        {!prefs.sidebarCollapsed && (
          <>
            {sidebarTabEffective === "outline" ? (
              <OutlinePane
                width={sidebar.width}
                items={outline}
                activeLine={cursorLine}
                onJump={handleOutlineJump}
                tabs={
                  <SidebarTabs value="outline" onChange={prefs.handleSidebarTab} />
                }
                footer={sidebarFooter}
              />
            ) : (
              <FileTree
                width={sidebar.width}
                nodes={nodes}
                activeId={ws.activeId}
                selectedId={ws.selectedId}
                onSelectNode={ws.selectNode}
                expanded={ws.expanded}
                onToggleExpand={ws.toggleExpand}
                onCreateFile={ws.handleCreateFile}
                onCreateFolder={ws.handleCreateFolder}
                onRename={ws.handleRename}
                onRequestDelete={ws.setPendingDelete}
                footer={sidebarFooter}
                header={
                  isMarkdown ? (
                    <SidebarTabs value="files" onChange={prefs.handleSidebarTab} />
                  ) : (
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      工作区
                    </h2>
                  )
                }
              />
            )}
            {/* 移动端不做拖拽调宽：触摸易误触，且宽度按视口自适应 */}
            {!isMobile && (
              <SidebarResizeHandle
                width={sidebar.width}
                resizing={sidebar.resizing}
                beginResize={sidebar.beginResize}
                moveResize={sidebar.moveResize}
                endResize={sidebar.endResize}
                nudgeResize={sidebar.nudgeResize}
                resetResize={sidebar.resetResize}
              />
            )}
          </>
        )}

        <Workbench
          mainRef={mainRef}
          previewScrollRef={previewScrollRef}
          loaded={ws.loaded}
          active={active}
          parser={parser}
          editable={editable}
          effectiveMode={effectiveMode}
          cursorLine={cursorLine}
          totalFiles={ws.totalFiles}
          saveState={ws.saveState}
          dragOver={ws.dragOver}
          onFileChange={(content) => active && ws.handleFileContentChange(active.id, content)}
          onCursorLine={setCursorLine}
          onDragOver={(e) => {
            e.preventDefault();
            if (!ws.dragOver) ws.setDragOver(true);
          }}
          onDragLeave={(e) => {
            if (e.currentTarget === e.target) ws.setDragOver(false);
          }}
          onDrop={(e) => void ws.handleDrop(e)}
        />
      </div>

      <ConfirmDialogs
        pendingDelete={ws.pendingDelete}
        onConfirmDelete={ws.doDelete}
        onCancelDelete={() => ws.setPendingDelete(null)}
        confirmClear={ws.confirmClear}
        topCount={nodes.length}
        totalFiles={ws.totalFiles}
        onConfirmClear={ws.doClearAll}
        onCancelClear={() => ws.setConfirmClear(false)}
      />

      <Toaster />
    </div>
  );
}
