/**
 * 代码块标题栏容器：左侧语言标识，右侧复制按钮。
 * 配色全部由 src/styles/hljs.css 中的 .code-chrome 系列类从
 * --hljs-* 令牌派生，因此自动适配所有 [data-style] 风格 × 明暗模式。
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { copyText } from "@/lib/clipboard";

/** 常见语言 id → 展示名（未收录的做首字母大写兜底） */
const LANG_LABELS: Record<string, string> = {
  js: "JavaScript",
  javascript: "JavaScript",
  jsx: "JSX",
  ts: "TypeScript",
  typescript: "TypeScript",
  tsx: "TSX",
  py: "Python",
  python: "Python",
  rb: "Ruby",
  ruby: "Ruby",
  rs: "Rust",
  rust: "Rust",
  go: "Go",
  java: "Java",
  kotlin: "Kotlin",
  php: "PHP",
  swift: "Swift",
  sh: "Shell",
  shell: "Shell",
  bash: "Bash",
  zsh: "Zsh",
  console: "Shell",
  md: "Markdown",
  markdown: "Markdown",
  yml: "YAML",
  yaml: "YAML",
  toml: "TOML",
  ini: "INI",
  jsonc: "JSONC",
  json5: "JSON5",
  html: "HTML",
  xml: "XML",
  vue: "Vue",
  css: "CSS",
  scss: "SCSS",
  less: "Less",
  c: "C",
  "c++": "C++",
  cpp: "C++",
  csharp: "C#",
  cs: "C#",
  objectivec: "Objective-C",
  fsharp: "F#",
  dockerfile: "Dockerfile",
  docker: "Dockerfile",
  graphql: "GraphQL",
  sql: "SQL",
  plaintext: "Plain Text",
  text: "Plain Text",
};

export function langDisplayName(lang?: string): string {
  if (!lang) return "Code";
  const key = lang.toLowerCase();
  if (LANG_LABELS[key]) return LANG_LABELS[key];
  return key.charAt(0).toUpperCase() + key.slice(1);
}

type CopyState = "idle" | "copied" | "error";

interface Props {
  /** 语言 id（fence info string 或 hljs 自动检测结果），可缺省 */
  lang?: string;
  /** 待复制的原始代码文本 */
  code: string;
  /**
   * 复制时包裹 Markdown fence 的语言标识（仅当来自显式 ```lang 围栏）。
   * 传入后复制结果为 "```lang\ncode\n```"，粘贴即可还原代码块。
   */
  fenceLang?: string;
  children: ReactNode;
}

export default function CodeBlockChrome({ lang, code, fenceLang, children }: Props) {
  const [state, setState] = useState<CopyState>("idle");
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const handleCopy = async () => {
    const payload = fenceLang
      ? "```" + fenceLang + "\n" + code + "\n```"
      : code;
    const ok = await copyText(payload);
    setState(ok ? "copied" : "error");
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setState("idle"), 2000);
  };

  return (
    <div className="code-chrome">
      <div className="code-chrome__bar">
        <span className="code-chrome__lang">{langDisplayName(lang)}</span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={state === "copied" ? "已复制到剪贴板" : "复制代码"}
          className={`code-chrome__copy${
            state === "error" ? " code-chrome__copy--error" : ""
          }`}
        >
          {state === "copied" ? (
            <>
              <Check className="h-3.5 w-3.5" aria-hidden />
              <span>已复制</span>
            </>
          ) : state === "error" ? (
            <>
              <Copy className="h-3.5 w-3.5" aria-hidden />
              <span>复制失败</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" aria-hidden />
              <span>复制</span>
            </>
          )}
        </button>
      </div>
      {children}
    </div>
  );
}
