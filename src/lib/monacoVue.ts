/**
 * Monaco 自定义 vue 语言（SFC 语法着色）。
 *
 * monaco-editor 0.52 不内置 vue：.vue 文件此前被映射为 html，
 * <script> 按 JS 文本着色、模板插值 {{ }} 完全不着色，观感上"没有高亮"。
 *
 * 这里注册 "vue" 语言 id（monarch 结构参照 Monaco 内置 html 语言）：
 * - 模板：标签/属性/注释/DOCTYPE + {{ ... }} 插值着色；
 * - <script> 块经 nextEmbedded 切换到 typescript（TS 语法是 JS 超集，
 *   lang="js" 同样适用），<style> 块切换到 css，复用内置 tokenizer；
 * - 主题仍由 themeBridge 统一管理（token 颜色走 base 主题规则）。
 */
import * as monaco from "monaco-editor";

let registered = false;

const conf: monaco.languages.LanguageConfiguration = {
  wordPattern:
    /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
  comments: { blockComment: ["<!--", "-->"] },
  brackets: [
    ["{", "}"],
    ["[", "]"],
    ["(", ")"],
  ],
  onEnterRules: [
    {
      // <tag>…</tag> 之间回车自动缩进（与内置 html 语言行为一致）
      beforeText: new RegExp(`<(?!(?:br|hr|img))(\\w[\\w\\d]*)([^/>]*(?!/)>)[^<]*$`, "i"),
      afterText: /^<\/(\w[\w\d]*)\s*>$/i,
      action: { indentAction: monaco.languages.IndentAction.IndentOutdent },
    },
    {
      beforeText: new RegExp(`<(?!(?:br|hr|img))(\\w[\\w\\d]*)([^/>]*(?!/)>)[^<]*$`, "i"),
      action: { indentAction: monaco.languages.IndentAction.Indent },
    },
  ],
  autoClosingPairs: [
    { open: "{", close: "}" },
    { open: "[", close: "]" },
    { open: "(", close: ")" },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
    { open: "<", close: ">" },
  ],
  folding: {
    markers: {
      start: new RegExp("^\\s*<!--\\s*#region\\b.*-->"),
      end: new RegExp("^\\s*<!--\\s*#endregion\\b.*-->"),
    },
  },
};

const language: monaco.languages.IMonarchLanguage = {
  defaultToken: "",
  tokenPostfix: ".vue",
  ignoreCase: true,

  keywords: [
    "if", "else", "for", "while", "do", "switch", "case", "default", "break",
    "continue", "return", "throw", "try", "catch", "finally", "new", "delete",
    "typeof", "instanceof", "in", "of", "void", "const", "let", "var",
    "function", "class", "extends", "super", "this", "import", "from",
    "export", "as", "async", "await", "yield", "static", "true", "false",
    "null", "undefined",
  ],

  tokenizer: {
    root: [
      [/<!DOCTYPE/, "metatag", "@doctype"],
      [/<!--/, "comment", "@comment"],
      // SFC 顶级块：script/style 进入专属状态，> 后切嵌入语言
      [/(<)(\s*script\b)/, ["delimiter", { token: "tag", next: "@script" }]],
      [/(<)(\s*style\b)/, ["delimiter", { token: "tag", next: "@style" }]],
      // 普通标签（含自闭合与结束标签）
      [/(<)((?:[\w\-]+:)?[\w\-]+)(\s*)(\/>)/, ["delimiter", "tag", "", "delimiter"]],
      [/(<)((?:[\w\-]+:)?[\w\-]+)/, ["delimiter", { token: "tag", next: "@otherTag" }]],
      [/(<\/)((?:[\w\-]+:)?[\w\-]+)/, ["delimiter", { token: "tag", next: "@otherTag" }]],
      [/</, "delimiter"],
      // 模板插值 {{ … }}
      [/\{\{/, { token: "delimiter.braces", next: "@interpolation" }],
      [/[^<{]+/, ""],
    ],

    doctype: [
      [/[^>]+/, "metatag.content"],
      [/>/, { token: "metatag", next: "@popall" }],
    ],

    comment: [
      [/-->/, { token: "comment", next: "@popall" }],
      [/[^-]+/, "comment.content"],
      [/./, "comment.content"],
    ],

    interpolation: [
      [/\}\}/, { token: "delimiter.braces", next: "@popall" }],
      [/"([^"\\]|\\.)*"/, "string"],
      [/'([^'\\]|\\.)*'/, "string"],
      [/`([^`\\]|\\.)*`/, "string"],
      [/\d+(\.\d+)?/, "number"],
      [/[a-zA-Z_$][\w$]*/, { cases: { "@keywords": "keyword", "@default": "variable" } }],
      [/[|:.?!&=+\-*/<>%]+/, "delimiter"],
      [/[[\]{}()]/, "delimiter"],
      [/,/, "delimiter.comma"],
      [/[^\}"'`]+/, ""],
    ],

    otherTag: [
      [/\/?>/, { token: "delimiter", next: "@popall" }],
      [/"([^"]*)"/, "attribute.value"],
      [/'([^']*)'/, "attribute.value"],
      [/[\w\-]+/, "attribute.name"],
      [/=/, "delimiter"],
      [/[ \t\r\n]+/, ""],
    ],

    // <script …>：属性照常着色，> 后嵌入 typescript 语法
    script: [
      [/"([^"]*)"/, "attribute.value"],
      [/'([^']*)'/, "attribute.value"],
      [/lang/, "attribute.name"],
      [/[\w\-]+/, "attribute.name"],
      [/=/, "delimiter"],
      [
        />/,
        {
          token: "delimiter",
          next: "@scriptEmbedded",
          nextEmbedded: "typescript",
        },
      ],
      [/[ \t\r\n]+/, ""],
      [/(<\/)(\s*script\s*)(>)/, ["delimiter", "tag", { token: "delimiter", next: "@popall" }]],
    ],
    scriptEmbedded: [
      [/<\/script/, { token: "@rematch", next: "@pop", nextEmbedded: "@pop" }],
      [/[^<]+/, ""],
    ],

    // <style …>：> 后嵌入 css 语法
    style: [
      [/"([^"]*)"/, "attribute.value"],
      [/'([^']*)'/, "attribute.value"],
      [/lang/, "attribute.name"],
      [/[\w\-]+/, "attribute.name"],
      [/=/, "delimiter"],
      [
        />/,
        {
          token: "delimiter",
          next: "@styleEmbedded",
          nextEmbedded: "css",
        },
      ],
      [/[ \t\r\n]+/, ""],
      [/(<\/)(\s*style\s*)(>)/, ["delimiter", "tag", { token: "delimiter", next: "@popall" }]],
    ],
    styleEmbedded: [
      [/<\/style/, { token: "@rematch", next: "@pop", nextEmbedded: "@pop" }],
      [/[^<]+/, ""],
    ],
  },
};

/** 注册 vue 语言（幂等；失败静默回退原有语言映射） */
export function registerVueLanguage(): void {
  if (registered) return;
  registered = true;
  try {
    monaco.languages.register({ id: "vue" });
    monaco.languages.setLanguageConfiguration("vue", conf);
    monaco.languages.setMonarchTokensProvider("vue", language);
  } catch {
    /* 不影响编辑功能 */
  }
}
