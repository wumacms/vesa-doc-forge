/**
 * 顶栏文档工具组：滚动定位 / 内容导出，两组之间以细分隔线区分。
 */
import { Fragment } from "react";
import { type LucideIcon } from "lucide-react";

export interface DocTool {
  key: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  /** 禁用时的替代提示语 */
  disabledTitle?: string;
}

interface Props {
  groups: { key: string; tools: DocTool[] }[];
}

export default function DocTools({ groups }: Props) {
  return (
    <div className="flex items-center gap-1 border border-border bg-background p-1">
      {groups.map((group, gi) => (
        <Fragment key={group.key}>
          {gi > 0 && (
            <span className="mx-0.5 h-5 w-px shrink-0 bg-border" aria-hidden />
          )}
          {group.tools.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                type="button"
                title={t.disabled ? t.disabledTitle ?? t.label : t.label}
                aria-label={t.label}
                disabled={t.disabled}
                onClick={t.onClick}
                className="flex h-7 w-7 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <Icon className="h-4 w-4" aria-hidden />
              </button>
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}
