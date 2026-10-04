/**
 * 各文档类型的解析器注册。
 * 新增类型：import 对应 Preview 组件 → registerParser({...})。
 * 注册顺序即匹配优先级，text fallback 必须放最后。
 */
import { parse as parseYaml } from "yaml";
import { registerParser } from "./registry";
import MarkdownPreview from "@/components/previews/MarkdownPreview";
import PdfPreview from "@/components/previews/PdfPreview";
import HtmlPreview from "@/components/previews/HtmlPreview";
import CodePreview from "@/components/previews/CodePreview";
import { StructuredPreview } from "@/components/previews/StructuredPreview";

registerParser({
  id: "markdown",
  label: "Markdown",
  iconKind: "markdown",
  editable: true,
  test: (ext) => ext === "md" || ext === "markdown" || ext === "mdx",
  monacoLanguage: () => "markdown",
  Preview: MarkdownPreview,
});

registerParser({
  id: "pdf",
  label: "PDF（只读）",
  iconKind: "pdf",
  editable: false,
  test: (ext) => ext === "pdf",
  monacoLanguage: () => "plaintext",
  Preview: PdfPreview,
});

registerParser({
  id: "html",
  label: "HTML 沙箱渲染",
  iconKind: "code",
  editable: true,
  test: (ext) => ["html", "htm", "xhtml"].includes(ext),
  monacoLanguage: (ext) => (ext === "xhtml" ? "html" : "html"),
  Preview: HtmlPreview,
});

registerParser({
  id: "json",
  label: "JSON 数据树",
  iconKind: "code",
  editable: true,
  test: (ext, name) =>
    ["json", "jsonc", "json5", "map"].includes(ext) ||
    name.split("/").pop()?.toLowerCase() === "tsconfig.json",
  monacoLanguage: (ext) => (ext === "jsonc" ? "json" : ext === "json5" ? "json" : "json"),
  Preview: (props) => (
    <StructuredPreview
      {...props}
      format="JSON"
      parse={(t) => JSON.parse(t.replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, ""))}
    />
  ),
});

registerParser({
  id: "yaml",
  label: "YAML 数据树",
  iconKind: "code",
  editable: true,
  test: (ext) => ext === "yml" || ext === "yaml",
  monacoLanguage: () => "yaml",
  Preview: (props) => (
    <StructuredPreview {...props} format="YAML" parse={(t) => parseYaml(t)} />
  ),
});

registerParser({
  id: "code",
  label: "代码高亮",
  iconKind: "code",
  editable: true,
  test: (ext) => ext in CODE_LANGS || ext === "toml" || ext === "ini",
  monacoLanguage: (ext) => CODE_LANGS[ext] ?? "plaintext",
  Preview: CodePreview,
});

registerParser({
  id: "text",
  label: "纯文本",
  iconKind: "text",
  editable: true,
  test: () => true, // fallback，必须最后注册
  monacoLanguage: () => "plaintext",
  Preview: (props) => (
    <pre className="whitespace-pre-wrap px-8 py-6 font-mono text-sm leading-relaxed">
      {props.file.content}
    </pre>
  ),
});

/** 扩展名 -> Monaco 语言 id：覆盖 monaco-editor 内置全部常用语言 */
const CODE_LANGS: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  mts: "typescript",
  cts: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  css: "css",
  scss: "scss",
  less: "less",
  html: "html",
  htm: "html",
  vue: "vue",
  xml: "xml",
  svg: "xml",
  pom: "xml",
  json: "json",
  jsonc: "json",
  json5: "json",
  yaml: "yaml",
  yml: "yaml",
  md: "markdown",
  markdown: "markdown",
  py: "python",
  pyw: "python",
  java: "java",
  c: "c",
  h: "c",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  cs: "csharp",
  go: "go",
  rs: "rust",
  rb: "ruby",
  php: "php",
  swift: "swift",
  kt: "kotlin",
  kts: "kotlin",
  scala: "scala",
  lua: "lua",
  r: "r",
  pl: "perl",
  sql: "sql",
  sh: "shell",
  bash: "shell",
  zsh: "shell",
  ps1: "powershell",
  bat: "shell",
  dockerfile: "dockerfile",
  tf: "hcl",
  graphql: "graphql",
  handlebars: "html",
  hbs: "html",
  ini: "ini",
  toml: "ini",
  conf: "ini",
  properties: "ini",
  bat_: "shell",
};
