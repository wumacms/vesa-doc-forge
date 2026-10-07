/**
 * 文档级动作：复制全文 / 下载文件（含 toast 反馈）。
 */
import type { WsFile } from "@/types";
import { toast } from "@/hooks/use-toast";
import { copyText } from "@/lib/clipboard";
import { downloadDocument } from "@/lib/download";

export async function copyDocument(active: WsFile): Promise<void> {
  const ok = await copyText(active.content);
  if (ok) {
    toast({ title: "已复制文档内容", description: active.name });
  } else {
    toast({
      variant: "destructive",
      title: "复制失败",
      description: "浏览器拒绝了剪贴板访问，请手动全选复制",
    });
  }
}

export function downloadDoc(
  active: WsFile,
  parserId: string | null | undefined,
): void {
  try {
    downloadDocument(active.name, active.content, parserId === "pdf" ? "pdf" : "text");
    toast({ title: "已开始下载", description: active.name });
  } catch {
    toast({
      variant: "destructive",
      title: "下载失败",
      description: "无法读取文件内容",
    });
  }
}
