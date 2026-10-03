/**
 * 通用代码高亮预览组件：highlight.js。
 * monaco 语言 id 与 hljs 语言 id 大部分同名，个别需要映射；
 * 映射不到时用 highlightAuto 猜测，plaintext 直接纯文本展示。
 */
import { useMemo } from "react";
import hljs from "highlight.js";
import "@/styles/hljs.css";
import CodeBlockChrome from "@/components/CodeBlockChrome";
import type { PreviewProps } from "@/types";
import { resolveParser } from "@/lib/parsers/registry";
import { extOf } from "@/types";

/** monaco id -> hljs id（仅列出不一致的） */
const HLJS_ALIAS: Record<string, string> = {
  typescript: "typescript",
  javascript: "javascript",
  csharp: "csharp",
  objectivec: "objectivec",
  fsharp: "fsharp",
  shell: "bash",
  dockerfile: "dockerfile",
  graphql: "graphql",
  restructuredtext: "python-repl",
  plaintext: "",
};

export default function CodePreview({ file }: PreviewProps) {
  const { html, lang } = useMemo(() => {
    const monacoLang = resolveParser(file.name).monacoLanguage(
      extOf(file.name),
      file.name,
    );
    if (monacoLang === "plaintext") return { html: null, lang: "plaintext" };
    const hl = HLJS_ALIAS[monacoLang] ?? monacoLang;
    try {
      if (hl && hljs.getLanguage(hl)) {
        return {
          html: hljs.highlight(file.content, { language: hl, ignoreIllegals: true })
            .value,
          lang: hl,
        };
      }
      const auto = hljs.highlightAuto(file.content);
      return { html: auto.value, lang: auto.language ?? monacoLang };
    } catch {
      return { html: null, lang: monacoLang };
    }
  }, [file.name, file.content]);

  if (html === null) {
    return (
      <pre className="whitespace-pre-wrap px-8 py-6 font-mono text-sm leading-relaxed">
        {file.content}
      </pre>
    );
  }

  return (
    <div className="px-6 py-6">
      <CodeBlockChrome lang={lang} code={file.content}>
        <pre className="hljs">
          <code dangerouslySetInnerHTML={{ __html: html }} />
        </pre>
      </CodeBlockChrome>
    </div>
  );
}
