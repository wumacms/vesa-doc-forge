import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PenLine,
  Columns2,
  Eye,
  Hammer,
  Sun,
  Moon,
  Upload,
  FolderUp,
  PanelLeft,
} from "lucide-react";
import { useTheme } from "next-themes";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import FileTree from "@/components/FileTree";
import OutlinePane from "@/components/OutlinePane";
import SidebarTabs, { type SidebarTab } from "@/components/SidebarTabs";
import EditorPane, { disposeModel } from "@/components/editor/EditorPane";
import PreviewPane from "@/components/PreviewPane";
import type { ViewMode, WsFile, WsFolder, WsNode } from "@/types";
import { extractOutline, type OutlineItem } from "@/lib/outline";
import { resolveParser } from "@/lib/parsers/registry";
import "@/lib/parsers"; // 副作用：注册全部文档解析器
import {
  collectFileIds,
  collectFolderIds,
  countFiles,
  findNode,
  insertChild,
  loadWorkspace,
  mergeByPaths,
  readImportedFiles,
  removeNode,
  renameNode,
  saveWorkspace,
  supportedExtensions,
  uid,
  uniqueName,
  updateFile,
} from "@/lib/workspace";
import { setupMonaco, monaco } from "@/lib/monacoSetup";
import { getPref, setPref } from "@/lib/storage";
import { cn } from "@/lib/utils";

const VIEW_MODE_KEY = "vesadocforge:view-mode";
const VIEW_MODES: ViewMode[] = ["edit", "split", "preview"];
const EXPANDED_KEY = "vesadocforge:expanded-folders";
const ACTIVE_KEY = "vesadocforge:active-file";
const SIDEBAR_KEY = "vesadocforge:sidebar-tab";

/** 视图模式属于用户偏好：同步从 localStorage 恢复，非法值回退分屏 */
function initialViewMode(): ViewMode {
  const saved = getPref(VIEW_MODE_KEY);
  return VIEW_MODES.includes(saved as ViewMode) ? (saved as ViewMode) : "split";
}

/** 恢复展开的文件夹集合；无记录时回退"展开根级文件夹"的默认行为 */
function restoreExpanded(nodes: WsNode[]): Set<string> {
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
function initialSidebarTab(): SidebarTab {
  return getPref(SIDEBAR_KEY) === "outline" ? "outline" : "files";
}

// 提前注册 MonacoEnvironment，避免首次创建编辑器时才配置的竞态
setupMonaco();

const THEME_ORDER = ["light", "dark"] as const;
const THEME_META: Record<
  (typeof THEME_ORDER)[number],
  { label: string; icon: typeof Sun }
> = {
  light: { label: "浅色主题", icon: Sun },
  dark: { label: "深色主题", icon: Moon },
};

import { StyleSwitcher } from "@/components/StyleSwitcher";

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const current: (typeof THEME_ORDER)[number] =
    theme === "dark" ? "dark" : "light";
  const meta = THEME_META[current];
  const Icon = meta.icon;
  return (
    <button
      type="button"
      title={meta.label}
      aria-label={meta.label}
      onClick={() => {
        const idx = THEME_ORDER.indexOf(current);
        setTheme(THEME_ORDER[(idx + 1) % THEME_ORDER.length]);
      }}
      className="border border-border bg-background p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      {/* SSR/水合前固定图标，避免闪烁 */}
      <Icon className="h-4 w-4" aria-hidden />
      <span className="sr-only">{mounted ? meta.label : "切换主题"}</span>
    </button>
  );
}

/** 深度优先找到第一个文件节点（初始选中用） */
function firstFile(nodes: WsNode[]): WsFile | null {
  for (const n of nodes) {
    if (n.kind === "file") return n;
    const hit = firstFile(n.children);
    if (hit) return hit;
  }
  return null;
}

export default function App() {
  const [nodes, setNodes] = useState<WsNode[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  /** 侧边栏选中的节点（文件或文件夹），决定头部"新建"按钮的目标位置 */
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [mode, setMode] = useState<ViewMode>(initialViewMode);
  const isMobile = useIsMobile();
  /** 侧边栏折叠：仅移动端暴露切换入口；桌面端始终展开 */
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>(initialSidebarTab);
  const [cursorLine, setCursorLine] = useState<number | null>(null);
  const editorInstanceRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [pendingDelete, setPendingDelete] = useState<WsNode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const [dragOver, setDragOver] = useState(false);

  /* ---------- 加载持久化数据 ---------- */
  useEffect(() => {
    let cancelled = false;
    loadWorkspace().then((data) => {
      if (cancelled) return;
      setNodes(data);
      // 恢复上次选中的文件；已被删除或非法时回退第一个文件
      const savedId = getPref(ACTIVE_KEY);
      const savedHit = savedId ? findNode(data, savedId) : null;
      setActiveId(
        savedHit && savedHit.node.kind === "file"
          ? savedHit.node.id
          : firstFile(data)?.id ?? null,
      );
      setSelectedId(savedHit?.node.id ?? null);
      setExpanded(restoreExpanded(data));
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------- 派生：当前文件 / 所在文件夹 / 解析器 ---------- */
  const active = useMemo(
    () =>
      activeId && findNode(nodes, activeId)?.node.kind === "file"
        ? (findNode(nodes, activeId)!.node as WsFile)
        : null,
    [nodes, activeId],
  );
  const parser = useMemo(
    () => (active ? resolveParser(active.name) : null),
    [active],
  );
  const editable = parser?.editable ?? false;
  /** 移动端空间不足以承载分屏：split 一律降级为 preview */
  const effectiveMode: ViewMode = editable
    ? isMobile && mode === "split"
      ? "preview"
      : mode
    : "preview";

  /* 进入移动端时把已保存的 split 偏好自动切到 preview（离屏不反向覆盖） */
  useEffect(() => {
    if (isMobile) {
      setMode((m) => (m === "split" ? "preview" : m));
    }
  }, [isMobile]);

  /* ---------- 大纲（仅 Markdown） ---------- */
  const isMarkdown = parser?.id === "markdown";
  const outline = useMemo(
    () => (isMarkdown && active ? extractOutline(active.content) : []),
    [isMarkdown, active],
  );
  // 非 Markdown 文件时强制回到"文件目录"视图
  const sidebarTabEffective: SidebarTab =
    isMarkdown && sidebarTab === "outline" ? "outline" : "files";

  const handleSidebarTab = (t: SidebarTab) => {
    setSidebarTab(t);
    setPref(SIDEBAR_KEY, t);
  };

  /** 点击大纲：编辑器跳行；分屏/预览时同步滚动预览区到对应标题 */
  const handleOutlineJump = (index: number, item: OutlineItem) => {
    const editor = editorInstanceRef.current;
    if (editor && editable) {
      editor.revealLineInCenter(item.line);
      editor.setPosition({ lineNumber: item.line, column: 1 });
      editor.focus();
    }
    // 预览中的标题与大纲条目按文档顺序一一对应（id="oc-<i>"）
    const host = mainRef.current?.querySelector(`#oc-${index}`);
    if (host) host.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const modes: { key: ViewMode; label: string; icon: typeof PenLine }[] = [
    { key: "edit", label: "编辑", icon: PenLine },
    // 移动端不提供分屏：空间不足，且 effectiveMode 已强制降级为预览
    ...(isMobile
      ? []
      : [{ key: "split" as ViewMode, label: "分屏", icon: Columns2 }]),
    { key: "preview", label: "预览", icon: Eye },
  ];

  /* ---------- 树操作 ---------- */
  const siblingsOf = useCallback(
    (parentId: string | null): WsNode[] =>
      parentId ? (findNode(nodes, parentId)?.node as WsFolder)?.children ?? [] : nodes,
    [nodes],
  );

  const handleCreateFile = (parentId: string | null, name: string) => {
    const file: WsFile = {
      id: uid(),
      kind: "file",
      name: uniqueName(siblingsOf(parentId), name),
      content: "",
    };
    setNodes((prev) => insertChild(prev, parentId, file));
    setActiveId(file.id);
    setSelectedId(file.id);
  };

  const handleCreateFolder = (parentId: string | null, name: string) => {
    const folder: WsFolder = {
      id: uid(),
      kind: "folder",
      name: uniqueName(siblingsOf(parentId), name),
      children: [],
    };
    setNodes((prev) => insertChild(prev, parentId, folder));
    // 新建的文件夹默认展开，让用户立刻看到它
    setExpanded((prev) => new Set(prev).add(folder.id));
  };

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleRename = (id: string, name: string) => {
    setNodes((prev) => renameNode(prev, id, name));
  };

  const doDelete = () => {
    if (!pendingDelete) return;
    const ids = collectFileIds(pendingDelete);
    ids.forEach(disposeModel);
    const nextNodes = removeNode(nodes, pendingDelete.id);
    setNodes(nextNodes);
    // 被删节点（或其祖先被删）时清理选中态
    if (selectedId === pendingDelete.id || !findNode(nextNodes, selectedId ?? "")) {
      setSelectedId(null);
    }
    // 清理已删除文件夹的展开记录，避免偏好里积累悬空 id
    const deadIds = new Set<string>(
      pendingDelete.kind === "folder"
        ? collectFolderIds(pendingDelete)
        : [],
    );
    if (deadIds.size > 0) {
      setExpanded((prev) => {
        const next = new Set(prev);
        deadIds.forEach((id) => next.delete(id));
        return next;
      });
    }
    if (activeId && ids.includes(activeId)) {
      setActiveId(firstFile(nextNodes)?.id ?? null);
    }
    toast({
      title: `已删除「${pendingDelete.name}」`,
      description: ids.length > 1 ? `连同 ${ids.length} 个文件` : undefined,
    });
    setPendingDelete(null);
  };

  /* ---------- 持久化：nodes 变化即保存（加载完成后，防抖 400ms） ---------- */
  useEffect(() => {
    if (!loaded) return;
    const t = window.setTimeout(() => saveWorkspace(nodes), 400);
    return () => window.clearTimeout(t);
  }, [nodes, loaded]);

  /* ---------- 持久化：视图模式（用户偏好，同步写 localStorage） ---------- */
  useEffect(() => {
    setPref(VIEW_MODE_KEY, mode);
  }, [mode]);

  /* ---------- 持久化：展开的文件夹 / 当前选中文件（加载完成后再写，避免初始空值覆盖已存偏好） ---------- */
  useEffect(() => {
    if (!loaded) return;
    setPref(EXPANDED_KEY, JSON.stringify([...expanded]));
  }, [expanded, loaded]);

  useEffect(() => {
    if (!loaded) return;
    setPref(ACTIVE_KEY, activeId ?? "");
  }, [activeId, loaded]);

  /* ---------- 批量导入 ---------- */
  const importFrom = useCallback(
    async (
      list: FileList | File[] | { file: File; path: string }[],
    ) => {
      const { files, paths, skipped } = await readImportedFiles(list);
      if (files.length === 0) {
        toast({
          variant: "destructive",
          title: "没有可导入的文件",
          description: skipped.length
            ? `已跳过 ${skipped.length} 个不支持或超过 5MB 的文件`
            : "所选内容为空",
        });
        return;
      }
      const items = files.map((f, i) => ({ path: paths[i], file: f }));
      // 函数式更新：确保拿到最新 nodes，并立即保存
      setNodes((prev) => {
        const next = mergeByPaths(prev, items);
        void saveWorkspace(next);
        // 导入新建的文件夹自动展开，让用户立刻看到结构
        const before = new Set<string>();
        prev.forEach((n) => collectFolderIds(n).forEach((id) => before.add(id)));
        const created = next
          .flatMap((n) => collectFolderIds(n))
          .filter((id) => !before.has(id));
        if (created.length > 0) {
          setExpanded((e) => {
            const ne = new Set(e);
            created.forEach((id) => ne.add(id));
            return ne;
          });
        }
        return next;
      });
      setActiveId(files[0].id);
      toast({
        title: `导入 ${files.length} 个文件`,
        description: skipped.length
          ? `跳过不支持/超大文件 ${skipped.length} 个：${skipped.slice(0, 3).join("、")}${skipped.length > 3 ? "…" : ""}`
          : undefined,
      });
    },
    [],
  );

  /** 拖拽导入：优先 webkitGetAsEntry 还原文件夹结构 */
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const dt = e.dataTransfer;
      const entries = Array.from(dt.items ?? [])
        .map((it) => it.webkitGetAsEntry?.())
        .filter((en): en is FileSystemEntry => !!en);

      if (entries.length === 0) {
        const files = Array.from(dt.files);
        if (files.length) await importFrom(files.map((f) => ({ file: f, path: f.name })));
        return;
      }

      const collected: { file: File; path: string }[] = [];
      const walk = (entry: FileSystemEntry, prefix: string): Promise<void> =>
        new Promise((resolve) => {
          if (entry.isFile) {
            (entry as FileSystemFileEntry).file(
              (f) => {
                collected.push({ file: f, path: prefix + f.name });
                resolve();
              },
              () => resolve(),
            );
          } else if (entry.isDirectory) {
            const reader = (entry as FileSystemDirectoryEntry).createReader();
            reader.readEntries(
              async (subs) => {
                for (const s of subs) await walk(s, prefix + entry.name + "/");
                resolve();
              },
              () => resolve(),
            );
          } else resolve();
        });
      for (const en of entries) await walk(en, "");

      await importFrom(collected);
    },
    [importFrom],
  );

  const accept = useMemo(() => supportedExtensions(), []);
  const totalFiles = useMemo(
    () => nodes.reduce((s, n) => s + countFiles(n), 0),
    [nodes],
  );

  /* ---------- 渲染 ---------- */
  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* 顶栏 */}
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border bg-card/70 px-4">
        <div className="flex min-w-0 items-center gap-2">
          {isMobile && (
            <button
              type="button"
              title={sidebarCollapsed ? "展开侧边栏" : "折叠侧边栏"}
              aria-label={sidebarCollapsed ? "展开侧边栏" : "折叠侧边栏"}
              aria-expanded={!sidebarCollapsed}
              onClick={() => setSidebarCollapsed((c) => !c)}
              className="shrink-0 border border-border bg-background p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <PanelLeft className="h-4 w-4" aria-hidden />
            </button>
          )}
          <Hammer className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          <span className="hidden font-serif text-lg font-semibold tracking-tight md:inline">
            VesaDocForge
          </span>
          {active && (
            <span className="ml-3 hidden truncate text-sm text-muted-foreground sm:inline">
              {active.name}
            </span>
          )}
          {parser && (
            <span className="ml-1 hidden shrink-0 border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground lg:inline">
              {parser.label}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={accept}
            className="hidden"
            aria-hidden
            onChange={(e) => {
              if (e.target.files?.length) void importFrom(e.target.files);
              e.target.value = "";
            }}
          />
          <input
            ref={folderInputRef}
            type="file"
            multiple
            className="hidden"
            aria-hidden
            // @ts-expect-error 非标准属性：选择整个文件夹
            webkitdirectory=""
            directory=""
            onChange={(e) => {
              if (e.target.files?.length) void importFrom(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            title="导入文件"
            aria-label="导入文件"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 border border-border bg-background px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Upload className="h-4 w-4" aria-hidden />
            <span className="hidden md:inline">导入</span>
          </button>
          <button
            type="button"
            title="导入文件夹"
            aria-label="导入文件夹"
            onClick={() => folderInputRef.current?.click()}
            className="flex items-center gap-1.5 border border-border bg-background px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <FolderUp className="h-4 w-4" aria-hidden />
            <span className="hidden md:inline">导入文件夹</span>
          </button>

          {active && (
            <div
              role="tablist"
              aria-label="视图模式"
              className="flex items-center gap-1 border border-border bg-background p-1"
            >
              {modes.map((m) => {
                const disabled = !editable && m.key !== "preview";
                return (
                  <button
                    key={m.key}
                    type="button"
                    role="tab"
                    aria-selected={effectiveMode === m.key}
                    disabled={disabled}
                    title={disabled ? "该文件类型只读" : m.label}
                    onClick={() => setMode(m.key)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1 text-sm transition-colors",
                      effectiveMode === m.key
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent",
                      disabled && "cursor-not-allowed opacity-40 hover:bg-transparent",
                    )}
                  >
                    <m.icon className="h-4 w-4" aria-hidden />
                    <span className="hidden md:inline">{m.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          <StyleSwitcher />
          <ThemeToggle />
        </div>
      </header>

      {/* 主体 */}
      <div className="flex min-h-0 flex-1">
        {(!isMobile || !sidebarCollapsed) &&
          (sidebarTabEffective === "outline" ? (
          <OutlinePane
            items={outline}
            activeLine={cursorLine}
            onJump={handleOutlineJump}
            tabs={
              <SidebarTabs value="outline" onChange={handleSidebarTab} />
            }
          />
        ) : (
          <FileTree
            nodes={nodes}
            activeId={activeId}
            selectedId={selectedId}
            onSelectNode={(node) => {
              setSelectedId(node.id);
              if (node.kind === "file") setActiveId(node.id);
            }}
            expanded={expanded}
            onToggleExpand={toggleExpand}
            onCreateFile={handleCreateFile}
            onCreateFolder={handleCreateFolder}
            onRename={handleRename}
            onRequestDelete={setPendingDelete}
            header={
              isMarkdown ? (
                <SidebarTabs value="files" onChange={handleSidebarTab} />
              ) : (
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  工作区
                </h2>
              )
            }
          />
        ))}

        <main
          ref={mainRef}
          className="relative min-w-0 flex-1"
          onDragOver={(e) => {
            e.preventDefault();
            if (!dragOver) setDragOver(true);
          }}
          onDragLeave={(e) => {
            if (e.currentTarget === e.target) setDragOver(false);
          }}
          onDrop={(e) => void handleDrop(e)}
        >
          {!loaded ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              正在载入工作区…
            </div>
          ) : !active ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <Hammer className="h-8 w-8 opacity-40" aria-hidden />
              <p className="text-sm">
                {totalFiles === 0
                  ? "还没有文件：新建、导入，或把文件拖到这里"
                  : "从左侧选择或新建一个文件"}
              </p>
            </div>
          ) : (
            <div className="flex h-full">
              {(effectiveMode === "edit" || effectiveMode === "split") && editable && (
                <div
                  className={cn(
                    "h-full min-w-0 border-r border-border",
                    effectiveMode === "split" ? "w-1/2" : "w-full border-r-0",
                  )}
                >
                  <EditorPane
                    file={active}
                    onChange={(content) =>
                      setNodes((prev) => updateFile(prev, active.id, content))
                    }
                    onCursorLine={setCursorLine}
                    editorRef={editorInstanceRef}
                  />
                </div>
              )}
              {(effectiveMode === "preview" || effectiveMode === "split") && (
                <div
                  className={cn(
                    "h-full min-w-0 overflow-auto",
                    effectiveMode === "split" ? "w-1/2" : "w-full",
                  )}
                >
                  <PreviewPane file={active} />
                </div>
              )}
            </div>
          )}

          {dragOver && (
            <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center border-2 border-dashed border-primary bg-background/70">
              <p className="text-sm font-medium text-primary">
                松开以导入支持的文档（md / json / yaml / html / pdf）
              </p>
            </div>
          )}
        </main>
      </div>

      {/* 删除确认 */}
      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              删除{pendingDelete?.kind === "folder" ? "文件夹" : "文件"}「{pendingDelete?.name}」？
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.kind === "folder"
                ? `该文件夹及其包含的 ${countFiles(pendingDelete)} 个文件将被永久删除，此操作不可撤销。`
                : "该文件将被永久删除，此操作不可撤销。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={doDelete}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster />
    </div>
  );
}

