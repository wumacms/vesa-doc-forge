/**
 * 主内容区：编辑器 / 预览分栏、空状态、拖拽导入遮罩与状态栏。
 */
import type { RefObject } from "react";
import { Hammer } from "lucide-react";
import type { DocParser, ViewMode, WsFile } from "@/types";
import { cn } from "@/lib/utils";
import { MODE_LABELS } from "@/lib/viewModes";
import EditorPane from "@/components/editor/EditorPane";
import PreviewPane from "@/components/PreviewPane";
import StatusBar from "@/components/StatusBar";
import type { SaveState } from "@/hooks/useWorkspace";

interface Props {
  mainRef: RefObject<HTMLElement>;
  previewScrollRef: RefObject<HTMLDivElement>;
  loaded: boolean;
  active: WsFile | null;
  parser: DocParser | null;
  editable: boolean;
  effectiveMode: ViewMode;
  cursorLine: number | null;
  totalFiles: number;
  saveState: SaveState;
  dragOver: boolean;
  onFileChange: (content: string) => void;
  onCursorLine: (line: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

export default function Workbench({
  mainRef,
  previewScrollRef,
  loaded,
  active,
  parser,
  editable,
  effectiveMode,
  cursorLine,
  totalFiles,
  saveState,
  dragOver,
  onFileChange,
  onCursorLine,
  onDragOver,
  onDragLeave,
  onDrop,
}: Props) {
  return (
    <main
      ref={mainRef}
      className="relative min-w-0 flex-1"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={(e) => void onDrop(e)}
    >
      <div className="flex h-full flex-col">
        <div className="min-h-0 flex-1">
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
                    onChange={onFileChange}
                    onCursorLine={onCursorLine}
                  />
                </div>
              )}
              {(effectiveMode === "preview" || effectiveMode === "split") && (
                <div
                  ref={previewScrollRef}
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
        </div>

        <StatusBar
          fileName={active?.name ?? null}
          typeLabel={parser?.label ?? null}
          modeLabel={active ? MODE_LABELS[effectiveMode] : null}
          cursorLine={
            editable && (effectiveMode === "edit" || effectiveMode === "split")
              ? cursorLine
              : null
          }
          totalFiles={totalFiles}
          saveState={saveState}
        />
      </div>
    </main>
  );
}
