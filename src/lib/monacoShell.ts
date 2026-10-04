/**
 * Monaco 增强 shell 语言（bash / zsh）。
 *
 * 为什么 markdown 编辑器里 ```bash 代码块完全没有高亮：
 * 内置 markdown tokenizer 用围栏后的 fence id 直接进入嵌入语言，
 * 解析顺序为「语言名 → MIME → 语言 id」。Monaco 0.52 的 shell 语言
 * id 是 "shell"、别名只有 "Shell"/"sh"，"bash" 三者都匹配不上，
 * 于是以未注册的 "bash" id 嵌入——monarchLexer 对未注册 id 直接
 * 退化为无 token 类型的纯文本（monarchLexer.js
 * _getNestedEmbeddedLanguageData），整块不着色。
 *
 * 修复：显式注册 "bash" / "zsh" 语言 id，token 规则复制内置 shell
 * （token 名与官方一致，随主题自动配色）并扩充 builtins 常见 CLI。
 * 围栏 ```bash / ```zsh 按 id 命中；```sh 经别名命中内置 shell，
 * 文件级 .sh/.bash/.zsh 由解析器表统一映射到 "bash" 获得增强效果。
 */
import * as monaco from "monaco-editor";

let registered = false;

const keywords = [
  "if", "then", "do", "else", "elif", "while", "until", "for", "in",
  "esac", "fi", "fin", "fil", "done", "exit", "set", "unset", "export",
  "function",
];

/** 内置 shell builtins + 常见包管理 / 容器 / 构建 / 系统 CLI */
const builtins = [
  // 内置 shell 自带
  "ab", "awk", "bash", "beep", "cat", "cc", "cd", "chown", "chmod",
  "chroot", "clear", "cp", "curl", "cut", "diff", "echo", "find", "gawk",
  "gcc", "get", "git", "grep", "hg", "kill", "killall", "ln", "ls",
  "make", "mkdir", "mv", "nc", "node", "npm", "openssl", "ping", "ps",
  "restart", "rm", "rmdir", "sed", "service", "sh", "shopt", "shred",
  "source", "sort", "sleep", "ssh", "start", "stop", "su", "sudo", "svn",
  "tee", "telnet", "top", "touch", "vi", "vim", "wall", "wc", "wget",
  "who", "write", "yes", "zsh",
  // 扩展：前端 / 后端 / 容器 / 系统
  "pnpm", "yarn", "npx", "bun", "deno", "nvm",
  "docker", "podman", "kubectl", "helm", "vagrant",
  "cargo", "rustc", "rustup", "go", "gofmt", "gradle", "mvn",
  "pip", "pip3", "python", "python3", "virtualenv", "conda", "poetry",
  "brew", "apt", "apt-get", "yum", "dnf", "apk", "pacman", "snap",
  "systemctl", "journalctl", "mount", "umount", "df", "du",
  "tar", "gzip", "gunzip", "zip", "unzip", "rsync", "scp", "sftp",
  "tsc", "eslint", "prettier", "vite", "webpack", "rollup", "jest",
  "vitest", "playwright", "cypress", "turbo", "lerna", "nx",
  "aws", "gcloud", "az", "terraform", "ansible", "gh",
  "jq", "yq", "tree", "head", "tail", "less", "more",
  "which", "whereis", "env", "printenv", "basename", "dirname", "xargs",
  "date", "timeout", "time", "nohup", "history", "alias", "unalias",
  "true", "false", "test", "printf", "seq", "watch", "crontab",
  "gpg", "ssh-keygen", "vercel", "netlify", "wrangler",
];

function shellLanguage(tokenPostfix: string): monaco.languages.IMonarchLanguage {
  return {
    defaultToken: "",
    ignoreCase: true,
    tokenPostfix,
    brackets: [
      { token: "delimiter.bracket", open: "{", close: "}" },
      { token: "delimiter.parenthesis", open: "(", close: ")" },
      { token: "delimiter.square", open: "[", close: "]" },
    ],
    keywords,
    builtins,
    startingWithDash: /\-+\w+/,
    identifiersWithDashes: /[a-zA-Z]\w+(?:@startingWithDash)+/,
    symbols: /[=><!~?&|+\-*/^;.,]+/,
    tokenizer: {
      root: [
        [/@identifiersWithDashes/, ""],
        [/(\s)((?:@startingWithDash)+)/, ["white", "attribute.name"]],
        [
          /[a-zA-Z]\w*/,
          {
            cases: {
              "@keywords": "keyword",
              "@builtins": "type.identifier",
              "@default": "",
            },
          },
        ],
        { include: "@whitespace" },
        { include: "@strings" },
        { include: "@parameters" },
        { include: "@heredoc" },
        [/[{}[\]()]/, "@brackets"],
        [/@symbols/, "delimiter"],
        { include: "@numbers" },
        [/[,;]/, "delimiter"],
      ],
      whitespace: [
        [/\s+/, "white"],
        [/(^#!.*$)/, "metatag"],
        [/(^#.*$)/, "comment"],
      ],
      numbers: [
        [/\d*\.\d+([eE][-+]?\d+)?/, "number.float"],
        [/0[xX][0-9a-fA-F_]*[0-9a-fA-F]/, "number.hex"],
        [/\d+/, "number"],
      ],
      strings: [
        [/'/, "string", "@stringBody"],
        [/"/, "string", "@dblStringBody"],
      ],
      stringBody: [
        [/'/, "string", "@popall"],
        [/./, "string"],
      ],
      dblStringBody: [
        [/"/, "string", "@popall"],
        [/./, "string"],
      ],
      heredoc: [
        [
          /(<<[-<]?)(\s*)(['"`]?)([\w-]+)(['"`]?)/,
          [
            "constants",
            "white",
            "string.heredoc.delimiter",
            "string.heredoc",
            "string.heredoc.delimiter",
          ],
        ],
      ],
      parameters: [
        [/\$\d+/, "variable.predefined"],
        [/\$\w+/, "variable"],
        [/\$[*@#?\-$!0_]/, "variable"],
      ],
    },
  };
}

/**
 * 注册 bash / zsh 语言 id。
 * 不带 extensions / aliases：文件级语言由本项目解析器表显式映射，
 * 避免与内置 shell 贡献的扩展名/别名冲突，也不影响 ```sh 走内置 shell。
 */
export function registerShellLanguages(): void {
  if (registered) return;
  registered = true;
  for (const id of ["bash", "zsh"] as const) {
    monaco.languages.register({ id });
    monaco.languages.setMonarchTokensProvider(id, shellLanguage(`.${id}`));
  }
}
