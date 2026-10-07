/**
 * 危险操作确认对话框：删除节点 / 清空工作区。
 */
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
import type { WsNode } from "@/types";
import { countFiles } from "@/lib/tree";

interface Props {
  pendingDelete: WsNode | null;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  confirmClear: boolean;
  topCount: number;
  totalFiles: number;
  onConfirmClear: () => void;
  onCancelClear: () => void;
}

export default function ConfirmDialogs({
  pendingDelete,
  onConfirmDelete,
  onCancelDelete,
  confirmClear,
  topCount,
  totalFiles,
  onConfirmClear,
  onCancelClear,
}: Props) {
  return (
    <>
      {/* 删除确认 */}
      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && onCancelDelete()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              删除{pendingDelete?.kind === "folder" ? "文件夹" : "文件"}「
              {pendingDelete?.name}」？
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
              onClick={onConfirmDelete}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 清空工作区确认 */}
      <AlertDialog open={confirmClear} onOpenChange={(open) => !open && onCancelClear()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>清空工作区？</AlertDialogTitle>
            <AlertDialogDescription>
              全部 {topCount} 个顶层条目（共 {totalFiles} 个文件）及其文件夹将被永久删除，
              此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={onConfirmClear}
            >
              清空
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
