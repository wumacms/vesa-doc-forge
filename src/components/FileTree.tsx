import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  FileCode2,
  FileType2,
  File,
  Folder,
  FolderOpen,
  Plus,
  FolderPlus,
  Pencil,
  Trash2,
  Check,
} from "lucide-react";
import type { WsFile, WsFolder, WsNode } from "@/types";
import { resolveParser } from "@/lib/parsers/registry";
import { findNode, uniqueName } from "@/lib/workspace";
import { cn } from "@/lib/utils";
import ContextMenu, { type ContextMenuItem } from "@/components/ContextMenu";

interface Props {
  nodes: WsNode[];
  activeId: string | null;
  /** 当前选中的节点 id（文件或文件夹），决定头部"新建"按钮的目标位置 */
  selectedId: string | null;
  /** 选中任意节点（文件/文件夹）时回调 */
  onSelectNode: (node: WsNode) => void;
  /** 展开的文件夹 id 集合（状态提升到 App 以便持久化） */
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
  /** parentId 为 null 表示根级 */
  onCreateFile: (parentId: string | null, name: string) => void;
  onCreateFolder: (parentId: string | null, name: string) => void;
  onRename: (id: string, name: string) => void;
  /** 交由上层弹出确认框 */
  onRequestDelete: (node: WsNode) => void;
  /** 头部标题区的替代内容（如目录/大纲切换按钮） */
  header?: ReactNode;
  /** 底部页脚插槽（导入/风格/主题/清空等操作入口） */
  footer?: ReactNode;
}

type Creating = { parentId: string | null; kind: "file" | "folder" } | null;

type Menu = { node: WsNode; x: number; y: number } | null;

function KindIcon({ name }: { name: string }) {
  let k = "text";
  try {
    k = resolveParser(name).iconKind;
  } catch {
    k = "text";
  }
  const cls = "mt-0.5 h-4 w-4 shrink-0 opacity-70";
  if (k === "markdown") return <FileText className={cls} aria-hidden />;
  if (k === "code") return <FileCode2 className={cls} aria-hidden />;
  if (k === "pdf") return <FileType2 className={cls} aria-hidden />;
  return <File className={cls} aria-hidden />;
}

function InlineInput({
  initial,
  placeholder,
  label,
  onCommit,
  onCancel,
}: {
  initial: string;
  placeholder: string;
  label: string;
  onCommit: (name: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const commit = () => {
    const name = draft.trim();
    if (name) onCommit(name);
    else onCancel();
  };
  return (
    <div className="flex items-center gap-1 px-1 py-0.5">
      <input
        autoFocus
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") onCancel();
        }}
        onBlur={commit}
        aria-label={label}
        className="w-full border border-ring bg-background px-1.5 py-1 text-sm outline-none placeholder:text-muted-foreground/60"
      />
      <button type="button" aria-label="确认" className="p-1 text-chart-2 hover:opacity-80" onClick={commit}>
        <Check className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/** 右键菜单传入的行内动作集合（由 FileTree 顶层提供） */
interface RowActions {
  openMenu: (node: WsNode, x: number, y: number) => void;
}

function Row({
  node,
  parent,
  props,
  expanded,
  toggleExpand,
  creating,
  setCreating,
  editingId,
  setEditingId,
  draft,
  setDraft,
  actions,
}: {
  node: WsNode;
  parent: WsFolder | null;
  props: Props;
  expanded: Set<string>;
  toggleExpand: (id: string) => void;
  creating: Creating;
  setCreating: (c: Creating) => void;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  draft: string;
  setDraft: (s: string) => void;
  actions: RowActions;
}) {
  /* 缩进由嵌套 <ul> 的 pl-3.5（14px）逐级累加，行内只加固定基础内边距。
   * 若在 li 上按 depth 加 padding，父级内边距会连同整棵子树被重复叠加，
   * 深度越大缩进越夸张（二次方增长）。 */
  const isFolder = node.kind === "folder";
  const open = isFolder && expanded.has(node.id);
  const selectedFolder = isFolder && node.id === props.selectedId;

  if (editingId === node.id) {
    return (
      <li>
        <div className="pl-2">
          <InlineInput
            initial={draft}
            label="重命名"
            placeholder={node.name}
            onCommit={(name) => {
              const siblings = parent ? parent.children : props.nodes;
              props.onRename(node.id, uniqueName(siblings, name, node.id));
              setEditingId(null);
            }}
            onCancel={() => setEditingId(null)}
          />
        </div>
      </li>
    );
  }

  return (
    <li>
      <div
        role={isFolder ? "button" : "option"}
        aria-expanded={isFolder ? open : undefined}
        aria-selected={!isFolder && node.id === props.activeId}
        aria-current={selectedFolder ? "true" : undefined}
        tabIndex={0}
        onClick={() => {
          if (isFolder) {
            toggleExpand(node.id);
            props.onSelectNode(node);
          } else {
            props.onSelectNode(node);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (isFolder) toggleExpand(node.id);
            props.onSelectNode(node);
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          props.onSelectNode(node);
          actions.openMenu(node, e.clientX, e.clientY);
        }}
        className={cn(
          "group flex cursor-pointer items-start gap-1.5 py-1.5 pl-2 pr-1 text-sm transition-colors",
          !isFolder && node.id === props.activeId
            ? "bg-primary text-primary-foreground"
            : selectedFolder
              ? "bg-accent text-accent-foreground"
              : "text-sidebar-foreground hover:bg-accent",
        )}
      >
        {isFolder ? (
          <>
            {open ? (
              <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
            ) : (
              <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
            )}
            {open ? (
              <FolderOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary/80" aria-hidden />
            ) : (
              <Folder className="mt-0.5 h-4 w-4 shrink-0 text-primary/80" aria-hidden />
            )}
          </>
        ) : (
          <>
            <span className="w-3.5 shrink-0" aria-hidden />
            <KindIcon name={node.name} />
          </>
        )}
        <span className="min-w-0 flex-1 break-all">{node.name}</span>
      </div>

      {isFolder && open && (
        <ul role="group" className="space-y-0.5 pl-3.5">
          {creating && creating.parentId === node.id && (
            <li>
              <div className="pl-2">
                <InlineInput
                  initial=""
                  label={creating.kind === "file" ? "新文件名" : "新文件夹名"}
                  placeholder={creating.kind === "file" ? "如 todo.md" : "文件夹名"}
                  onCommit={(name) => {
                    if (creating.kind === "file") props.onCreateFile(node.id, name);
                    else props.onCreateFolder(node.id, name);
                    setCreating(null);
                  }}
                  onCancel={() => setCreating(null)}
                />
              </div>
            </li>
          )}
          {node.children.length === 0 && !creating && (
            <li className="py-1 pl-2 text-xs italic text-muted-foreground/70">
              （空文件夹）
            </li>
          )}
          {node.children.map((c) => (
            <Row
              key={c.id}
              node={c}
              parent={node}
              props={props}
              expanded={expanded}
              toggleExpand={toggleExpand}
              creating={creating}
              setCreating={setCreating}
              editingId={editingId}
              setEditingId={setEditingId}
              draft={draft}
              setDraft={setDraft}
              actions={actions}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function FileTree(props: Props) {
  const { nodes, onCreateFile, onCreateFolder, onRequestDelete, header, footer } = props;
  const expanded = props.expanded;
  const toggleExpand = props.onToggleExpand;
  const [creating, setCreating] = useState<Creating>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [menu, setMenu] = useState<Menu>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const parentOf = (id: string | null): WsFolder | null =>
    id ? findNode(nodes, id)?.parent ?? null : null;

  /* ---------- 头部"新建"按钮的目标位置（VSCode 式） ----------
   * 选中文件夹 → 在其内部创建
   * 选中文件   → 在其所在目录的同级创建（根级文件则回退到根）
   * 无选中     → 根级
   */
  const createTarget = useMemo(() => {
    if (!props.selectedId) return { parentId: null as string | null, label: "根目录" };
    const hit = findNode(nodes, props.selectedId);
    if (!hit) return { parentId: null as string | null, label: "根目录" };
    if (hit.node.kind === "folder") {
      return { parentId: hit.node.id, label: hit.node.name };
    }
    return {
      parentId: hit.parent?.id ?? null,
      label: hit.parent ? hit.parent.name : "根目录",
    };
  }, [nodes, props.selectedId]);

  const startCreate = (kind: "file" | "folder") => {
    const parentId = createTarget.parentId;
    // 目标是折叠的文件夹时先展开，让用户立刻看到输入框
    if (parentId && !expanded.has(parentId)) toggleExpand(parentId);
    setCreating({ parentId, kind });
    setEditingId(null);
    setMenu(null);
  };

  const actions: RowActions = {
    openMenu: (node, x, y) => setMenu({ node, x, y }),
  };

  /* ---------- 右键菜单项 ---------- */
  const menuItems = (node: WsNode): ContextMenuItem[] => {
    const isFolder = node.kind === "folder";
    const items: ContextMenuItem[] = [];
    if (isFolder) {
      items.push({
        label: "新建文件",
        icon: <Plus className="h-3.5 w-3.5" />,
        onClick: () => {
          if (!expanded.has(node.id)) toggleExpand(node.id);
          setCreating({ parentId: node.id, kind: "file" });
          setEditingId(null);
        },
      });
      items.push({
        label: "新建文件夹",
        icon: <FolderPlus className="h-3.5 w-3.5" />,
        onClick: () => {
          if (!expanded.has(node.id)) toggleExpand(node.id);
          setCreating({ parentId: node.id, kind: "folder" });
          setEditingId(null);
        },
      });
    }
    items.push({
      label: "重命名",
      icon: <Pencil className="h-3.5 w-3.5" />,
      onClick: () => {
        setEditingId(node.id);
        setDraft(node.name);
        setCreating(null);
      },
    });
    items.push({
      label: "删除",
      icon: <Trash2 className="h-3.5 w-3.5" />,
      danger: true,
      onClick: () => onRequestDelete(node),
    });
    return items;
  };

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        {header ? (
          header
        ) : (
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            工作区
          </h2>
        )}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            aria-label={`在 ${createTarget.label} 中新建文件`}
            title={`在 ${createTarget.label} 中新建文件`}
            className="p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            onClick={() => startCreate("file")}
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={`在 ${createTarget.label} 中新建文件夹`}
            title={`在 ${createTarget.label} 中新建文件夹`}
            className="p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            onClick={() => startCreate("folder")}
          >
            <FolderPlus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <ul
        ref={listRef}
        className="flex-1 space-y-0.5 overflow-y-auto p-1 pb-2"
        aria-label="文件与文件夹"
      >
        {creating && creating.parentId === null && (
          <li className="px-1">
            <InlineInput
              initial=""
              label={creating.kind === "file" ? "新文件名" : "新文件夹名"}
              placeholder={creating.kind === "file" ? "如 todo.md" : "文件夹名"}
              onCommit={(name) => {
                if (creating.kind === "file") onCreateFile(null, name);
                else onCreateFolder(null, name);
                setCreating(null);
              }}
              onCancel={() => setCreating(null)}
            />
          </li>
        )}
        {nodes.map((n) => (
          <Row
            key={n.id}
            node={n}
            parent={parentOf(n.id)}
            props={props}
            expanded={expanded}
            toggleExpand={toggleExpand}
            creating={creating}
            setCreating={setCreating}
            editingId={editingId}
            setEditingId={setEditingId}
            draft={draft}
            setDraft={setDraft}
            actions={actions}
          />
        ))}
        {nodes.length === 0 && !creating && (
          <li className="px-3 py-6 text-center text-sm text-muted-foreground">
            工作区为空，点击上方 + 新建，或右键空白处… 也可以把文件拖进来
          </li>
        )}
      </ul>

      {footer}

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          title={menu.node.name}
          items={menuItems(menu.node)}
          onClose={() => setMenu(null)}
        />
      )}
    </aside>
  );
}

/** 供上层在删除文件节点时清理 Monaco model */
export type { WsFile, WsFolder };
