/**
 * 工作区持久化编排：IndexedDB 优先（kv 层），首次使用时写入种子数据。
 * 树操作在 @/lib/tree，导入在 @/lib/importFiles，偏好在 @/lib/prefs。
 */
import type { WsFile, WsNode } from "@/types";
import { kvGet, kvSet } from "@/lib/storage";
import { seedTree } from "@/lib/seed";

const STORAGE_KEY = "vesadocforge.workspace.v3";

export async function loadWorkspace(): Promise<WsNode[]> {
  const data = await kvGet<WsNode[] | WsFile[]>(STORAGE_KEY);
  if (data && Array.isArray(data) && data.length > 0) {
    // 旧版 v3 键下可能存着扁平 DocFile[]（数组元素无 kind 字段）→ 迁移为根级文件
    if (typeof (data[0] as Partial<WsNode>).kind !== "string") {
      return (data as WsFile[]).map((f) => ({ ...f, kind: "file" as const }));
    }
    return data as WsNode[];
  }
  const seeded = seedTree();
  void saveWorkspace(seeded);
  return seeded;
}

export function saveWorkspace(nodes: WsNode[]): void {
  void kvSet(STORAGE_KEY, nodes);
}
