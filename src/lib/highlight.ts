/**
 * highlight.js 共享配置（单例，import 即生效）：
 * - vue：hljs 无内置 vue 语言，注册为复用 XML/HTML 语法，
 *   md 中的 ```vue 代码块与 .vue 文件预览均可获得标签/属性着色；
 * - bash/sh/zsh：内置 built_in 只覆盖少量命令，常见 CLI（npm、git、
 *   docker 等）不着色看起来像"没高亮"，这里统一扩展命令列表，
 *   并用 bash 语法覆盖 shell-session 的 sh 别名（fence ```sh 期望
 *   的是脚本高亮而非命令提示符会话）。
 * 预览侧请从本模块导入 hljs，勿直接 import "highlight.js"。
 */
import hljs from "highlight.js";
import bash from "highlight.js/lib/languages/bash";
import xml from "highlight.js/lib/languages/xml";

/** 内置列表之外、文档示例中高频出现的命令行工具 */
const EXTRA_COMMANDS = [
  // JS 生态
  "npm", "pnpm", "yarn", "npx", "node", "deno", "bun", "tsc", "vite",
  "webpack", "rollup", "eslint", "prettier", "babel", "jest", "vitest",
  "playwright", "cypress", "turbo", "lerna", "nvm",
  // VCS / 容器 / 编排
  "git", "gh", "svn", "hg", "docker", "docker-compose", "podman",
  "kubectl", "helm", "terraform", "ansible", "vagrant",
  // 网络
  "curl", "wget", "rsync", "ssh", "scp", "sftp", "ping", "traceroute",
  "dig", "nslookup", "netstat", "ss", "lsof", "nc", "openssl",
  // 文本 / 文件
  "grep", "egrep", "sed", "awk", "find", "xargs", "jq", "yq", "rg", "fd",
  "tree", "wc", "sort", "uniq", "diff", "patch", "cut", "tr", "tac",
  "head", "tail", "less", "more", "cat", "touch", "mkdir", "rmdir",
  "chmod", "chown", "ln", "cp", "mv", "rm", "tar", "gzip", "gunzip",
  "zip", "unzip", "split", "comm", "join", "seq",
  // 构建 / 语言工具链
  "make", "cmake", "meson", "ninja", "gcc", "g++", "clang", "ld", "ar",
  "cargo", "rustc", "go", "python", "python3", "pip", "pip3", "conda",
  "poetry", "uv", "ruby", "bundle", "gem", "php", "composer", "java",
  "javac", "mvn", "gradle", "dotnet", "swift", "kotlin", "mix", "erlc",
  // 系统 / 包管理
  "brew", "apt", "apt-get", "yum", "dnf", "apk", "pacman", "choco",
  "systemctl", "journalctl", "service", "crontab", "kill", "killall",
  "ps", "top", "htop", "df", "du", "free", "uptime", "env", "export",
  "source", "alias", "which", "whereis", "whoami", "hostname", "sudo",
  "su", "useradd", "mount", "umount", "date", "cal", "watch", "nohup",
  "tmux", "screen", "open", "xdg-open", "code",
];

let configured = false;

function configure(): void {
  if (configured) return;
  configured = true;

  // ```vue → 复用 XML/HTML 语法（标签、属性、字符串均有着色）
  hljs.registerLanguage("vue", xml);

  // 基于内置 bash 语法扩展 built_in 命令表
  const base = bash(hljs);
  const kw = (base.keywords ?? {}) as Record<string, unknown>;
  const rawBuiltIn = kw.built_in;
  const existing = Array.isArray(rawBuiltIn)
    ? rawBuiltIn.map(String)
    : String(rawBuiltIn ?? "").split(/\s+/).filter(Boolean);
  const merged = Array.from(new Set([...existing, ...EXTRA_COMMANDS]));
  const enhancedBash = () => ({
    ...base,
    keywords: { ...kw, built_in: merged },
  });

  hljs.registerLanguage("bash", enhancedBash);
  // sh/zsh 用同一份 bash 语法，覆盖 hljs 默认的 shell-session
  hljs.registerLanguage("sh", enhancedBash);
  hljs.registerLanguage("zsh", enhancedBash);
}

configure();

export default hljs;
