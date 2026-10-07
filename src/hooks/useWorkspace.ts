/**
 * 工作区状态核心 Hook：节点树、选中/激活、CRUD、导入、删除确认、清空、防抖持久化。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WsFile, WsFolder, WsNode } from "@/types";
import { toast } from "@/hooks/use-toast";
import { disposeModel } from "@/lib/editorModels";
import { readImportedFiles } from "@/lib/importFiles";
import { ACTIVE_KEY, EXPANDED_KEY, restoreExpanded } from "@/lib/prefs";
import { setPref } from "@/lib/storage";
import {
  collectFileIds,
  collectFolderIds,
  countFiles,
  findNode,
  firstFile,
  insertChild,
  mergeByPaths,
  removeNode,
  renameNode,
  uid,
  uniqueName,
  updateFile,
} from "@/lib/tree";
import { loadWorkspace, saveWorkspace } from "@/lib/workspace";

export type SaveState = "idle" | "saving" | "saved";

export function useWorkspace() {
  const [nodes, setNodes] = useState<WsNode[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  /** 侧边栏选中的节点（文件或文件夹），决定头部"新建"按钮的目标位置 */
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [pendingDelete, setPendingDelete] = useState<WsNode | null>(null);
  /** 页脚"清空工作区"的二次确认弹窗 */
  const [confirmClear, setConfirmClear] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  /** 状态栏指示：防抖窗口内为 saving，落盘后短暂显示 saved */
  const [saveState, setSaveState] = useState<SaveState>("idle");

  /* ---------- 加载持久化数据 ---------- */
  useEffect(() => {
    let cancelled = false;
    loadWorkspace().then((data) => {
      if (cancelled) return;
      setNodes(data);
      // 恢复上次选中的文件；已被删除或非法时回退第一个文件
      const savedId = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_KEY) : null;
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

  /* ---------- 派生 ---------- */
  const active = useMemo(
    () =>
      activeId && findNode(nodes, activeId)?.node.kind === "file"
        ? (findNode(nodes, activeId)!.node as WsFile)
        : null,
    [nodes, activeId],
  );

  const totalFiles = useMemo(
    () => nodes.reduce((s, n) => s + countFiles(n), 0),
    [nodes],
  );

  /* ---------- 持久化：nodes 变化即保存（加载完成后，防抖 400ms） ---------- */
  useEffect(() => {
    if (!loaded) return;
    setSaveState("saving");
    const t = window.setTimeout(() => {
      saveWorkspace(nodes);
      setSaveState("saved");
    }, 400);
    return () => window.clearTimeout(t);
  }, [nodes, loaded]);

  useEffect(() => {
    if (saveState !== "saved") return;
    const t = window.setTimeout(() => setSaveState("idle"), 1600);
    return () => window.clearTimeout(t);
  }, [saveState]);

  /* ---------- 持久化：展开的文件夹 / 当前选中文件（加载完成后再写） ---------- */
  useEffect(() => {
    if (!loaded) return;
    setPref(EXPANDED_KEY, JSON.stringify([...expanded]));
  }, [expanded, loaded]);

  useEffect(() => {
    if (!loaded) return;
    setPref(ACTIVE_KEY, activeId ?? "");
  }, [activeId, loaded]);

  /* ---------- 树操作 ---------- */
  const siblingsOf = useCallback(
    (parentId: string | null): WsNode[] =>
      parentId ? (findNode(nodes, parentId)?.node as WsFolder)?.children ?? [] : nodes,
    [nodes],
  );

  const handleCreateFile = useCallback(
    (parentId: string | null, name: string) => {
      const file: WsFile = {
        id: uid(),
        kind: "file",
        name: uniqueName(siblingsOf(parentId), name),
        content: "",
      };
      setNodes((prev) => insertChild(prev, parentId, file));
      setActiveId(file.id);
      setSelectedId(file.id);
    },
    [siblingsOf],
  );

  const handleCreateFolder = useCallback(
    (parentId: string | null, name: string) => {
      const folder: WsFolder = {
        id: uid(),
        kind: "folder",
        name: uniqueName(siblingsOf(parentId), name),
        children: [],
      };
      setNodes((prev) => insertChild(prev, parentId, folder));
      // 新建的文件夹默认展开，让用户立刻看到它
      setExpanded((prev) => new Set(prev).add(folder.id));
    },
    [siblingsOf],
  );

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleRename = useCallback((id: string, name: string) => {
    setNodes((prev) => renameNode(prev, id, name));
  }, []);

  const handleFileContentChange = useCallback((id: string, content: string) => {
    setNodes((prev) => updateFile(prev, id, content));
  }, []);

  const doDelete = useCallback(() => {
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
      pendingDelete.kind === "folder" ? collectFolderIds(pendingDelete) : [],
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
  }, [pendingDelete, nodes, selectedId, activeId]);

  /** 页脚清空入口：删除全部文件和文件夹（含 Monaco model 清理） */
  const doClearAll = useCallback(() => {
    nodes.forEach((n) => collectFileIds(n).forEach(disposeModel));
    setNodes([]);
    setActiveId(null);
    setSelectedId(null);
    setExpanded(new Set());
    setConfirmClear(false);
    toast({ title: "工作区已清空", description: "所有文件和文件夹均已删除" });
  }, [nodes]);

  /* ---------- 批量导入 ---------- */
  const importFrom = useCallback(
    async (list: FileList | File[] | { file: File; path: string }[]) => {
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

  const selectNode = useCallback((node: WsNode) => {
    setSelectedId(node.id);
    if (node.kind === "file") setActiveId(node.id);
  }, []);

  return {
    nodes,
    loaded,
    active,
    activeId,
    selectedId,
    selectNode,
    expanded,
    toggleExpand,
    totalFiles,
    saveState,
    handleCreateFile,
    handleCreateFolder,
    handleRename,
    handleFileContentChange,
    importFrom,
    handleDrop,
    dragOver,
    setDragOver,
    pendingDelete,
    setPendingDelete,
    doDelete,
    confirmClear,
    setConfirmClear,
    doClearAll,
  };
}
