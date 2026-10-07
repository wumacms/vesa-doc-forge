/**
 * 工作区树的纯函数操作：无副作用、无持久化，便于测试与复用。
 */
import type { WsFile, WsFolder, WsNode } from "@/types";

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function findNode(
  nodes: WsNode[],
  id: string,
): { node: WsNode; parent: WsFolder | null } | null {
  const walk = (
    list: WsNode[],
    parent: WsFolder | null,
  ): { node: WsNode; parent: WsFolder | null } | null => {
    for (const n of list) {
      if (n.id === id) return { node: n, parent };
      if (n.kind === "folder") {
        const hit = walk(n.children, n);
        if (hit) return hit;
      }
    }
    return null;
  }
  return walk(nodes, null);
}

export function countFiles(node: WsNode): number {
  if (node.kind === "file") return 1;
  return node.children.reduce((s, c) => s + countFiles(c), 0);
}

export function collectFileIds(node: WsNode, acc: string[] = []): string[] {
  if (node.kind === "file") acc.push(node.id);
  else node.children.forEach((c) => collectFileIds(c, acc));
  return acc;
}

/** 收集文件夹节点自身及其子孙文件夹的 id（用于清理展开状态） */
export function collectFolderIds(node: WsNode, acc: string[] = []): string[] {
  if (node.kind === "folder") {
    acc.push(node.id);
    node.children.forEach((c) => collectFolderIds(c, acc));
  }
  return acc;
}

/** 深度优先找到第一个文件节点（初始选中用） */
export function firstFile(nodes: WsNode[]): WsFile | null {
  for (const n of nodes) {
    if (n.kind === "file") return n;
    const hit = firstFile(n.children);
    if (hit) return hit;
  }
  return null;
}

/** 同级唯一命名：冲突时追加 (1)、(2)… */
export function uniqueName(
  siblings: WsNode[],
  name: string,
  excludeId?: string,
): string {
  if (!siblings.some((s) => s.id !== excludeId && s.name === name)) return name;
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  let i = 1;
  while (siblings.some((s) => s.id !== excludeId && s.name === `${base} (${i})${ext}`)) i++;
  return `${base} (${i})${ext}`;
}

function mapTree(nodes: WsNode[], fn: (n: WsNode) => WsNode | null): WsNode[] {
  const out: WsNode[] = [];
  for (const n of nodes) {
    const mapped = fn(n);
    if (!mapped) continue; // 命中删除：连子树一起跳过
    if (mapped.kind !== "folder") {
      out.push(mapped);
      continue;
    }
    // 必须无条件递归子树：否则 insertChild / removeNode / renameNode
    // 只能作用于根级节点，嵌套子目录中的操作会静默失效
    const newChildren = mapTree(mapped.children, fn);
    const childrenChanged =
      newChildren.length !== mapped.children.length ||
      newChildren.some((c, i) => c !== mapped.children[i]);
    out.push(childrenChanged ? { ...mapped, children: newChildren } : mapped);
  }
  return out;
}

export function insertChild(
  nodes: WsNode[],
  parentId: string | null,
  child: WsNode,
): WsNode[] {
  if (parentId === null) return [...nodes, child];
  return mapTree(nodes, (n) =>
    n.kind === "folder" && n.id === parentId
      ? { ...n, children: [...n.children, child] }
      : n,
  );
}

/** 将多路径文件批量合并进树（按 webkitRelativePath 建文件夹） */
export function mergeByPaths(
  nodes: WsNode[],
  items: { path: string; file: WsFile }[],
): WsNode[] {
  const root: WsFolder = { id: "__root__", kind: "folder", name: "", children: nodes };
  for (const { path, file } of items) {
    const parts = path.split("/").filter(Boolean);
    let cursor = root;
    for (const seg of parts.slice(0, -1)) {
      let sub = cursor.children.find(
        (c): c is WsFolder => c.kind === "folder" && c.name === seg,
      );
      if (!sub) {
        sub = { id: uid(), kind: "folder", name: seg, children: [] };
        cursor.children.push(sub);
      }
      cursor = sub;
    }
    const name = uniqueName(cursor.children, file.name);
    cursor.children.push({ ...file, name });
  }
  return root.children;
}

export function removeNode(nodes: WsNode[], id: string): WsNode[] {
  return mapTree(nodes, (n) => (n.id === id ? null : n));
}

/** 更新指定文件的内容（不可变） */
export function updateFile(
  nodes: WsNode[],
  id: string,
  content: string,
): WsNode[] {
  return nodes.map((n) => {
    if (n.kind === "file") return n.id === id ? { ...n, content } : n;
    return { ...n, children: updateFile(n.children, id, content) };
  });
}

export function renameNode(nodes: WsNode[], id: string, name: string): WsNode[] {
  return mapTree(nodes, (n) => (n.id === id ? { ...n, name } : n));
}
