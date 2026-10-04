/**
 * 主界面底部状态栏：集中展示当前文档与编辑状态。
 * （原先顶栏显示文档标题 + 类型徽章，占用导航空间，现迁移至此。）
 */
import { Check, Loader2 } from "lucide-react";

type SaveState = "saved" | "saving" | "idle";

interface Props {
  /** 当前文件名；无打开文件时为 null */
  fileName: string | null;
  /** 解析器标签（Markdown / JSON / PDF …） */
  typeLabel: string | null;
  /** 当前生效的视图模式 */
  modeLabel: string | null;
  /** 光标所在行（编辑器可见时有值） */
  cursorLine: number | null;
  /** 工作区文件总数 */
  totalFiles: number;
  /** 持久化状态：防抖保存中 / 已保存 */
  saveState: SaveState;
}

const Sep = () => (
  <span className="h-3 w-px shrink-0 bg-border" aria-hidden />
);

export default function StatusBar({
  fileName,
  typeLabel,
  modeLabel,
  cursorLine,
  totalFiles,
  saveState,
}: Props) {
  return (
    <footer
      aria-label="状态栏"
      className="flex h-7 shrink-0 items-center gap-2 border-t border-border bg-card/70 px-3 text-[11px] leading-none text-muted-foreground"
    >
      {fileName ? (
        <>
          <span className="truncate font-medium text-foreground/80" title={fileName}>
            {fileName}
          </span>
          <Sep />
          {typeLabel && <span className="shrink-0">{typeLabel}</span>}
          {modeLabel && (
            <>
              <Sep />
              <span className="shrink-0">{modeLabel}</span>
            </>
          )}
          {cursorLine !== null && (
            <>
              <Sep />
              <span className="shrink-0 tabular-nums">行 {cursorLine}</span>
            </>
          )}
        </>
      ) : (
        <span className="italic">未打开文档</span>
      )}

      <span className="flex-1" />

      <span className="shrink-0 tabular-nums" title="工作区文件总数">
        {totalFiles} 个文件
      </span>
      <Sep />
      {saveState === "saving" ? (
        <span className="flex shrink-0 items-center gap-1" aria-live="polite">
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
          保存中
        </span>
      ) : saveState === "saved" ? (
        <span className="flex shrink-0 items-center gap-1" aria-live="polite">
          <Check className="h-3 w-3 text-chart-2" aria-hidden />
          已保存
        </span>
      ) : (
        <span className="shrink-0">本地存储</span>
      )}
    </footer>
  );
}
