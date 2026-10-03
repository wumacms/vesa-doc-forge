# DocForge 产品需求文档（PRD）

> 版本：2.0 · 状态：已实现 · 最后更新：随代码仓库同步

## 1. 产品概述

DocForge 是一个**完全在浏览器中运行的多格式文档工作台**，无需后端服务。用户可以在本地创建、组织、编辑和预览多种格式的文档，所有数据持久化在浏览器本地存储中。

### 1.1 目标用户

- 需要快速查看 / 编辑 Markdown、JSON、YAML、HTML 等文档的开发者与写作者；
- 重视隐私、不希望文档上传服务器的用户；
- 需要在无网络环境下处理文档的场景。

### 1.2 核心价值

| 价值 | 说明 |
| --- | --- |
| 零部署 | 纯前端应用，打开即用，无账号体系 |
| 多格式 | Markdown 渲染、JSON/YAML 数据树、HTML 沙箱、PDF 只读、50+ 语言高亮 |
| 数据不出本地 | IndexedDB / localStorage 持久化，无任何网络传输 |
| 可扩展 | 解析器注册表架构，新增文档类型不改动核心代码 |

## 2. 功能需求

### 2.1 文件与文件夹管理（P0）

- 树形工作区，支持任意层级嵌套文件夹；
- 根级与文件夹内均可新建文件 / 子文件夹（行内输入，Enter 确认、Esc 取消）；
- 重命名：双击文件或点铅笔图标，同级重名自动追加 `(1)`、`(2)`；
- 删除：点垃圾桶图标，**必须经确认对话框**；删除文件夹时提示所含文件数量，级联删除；
- 删除文件时同步释放 Monaco model，防止内存泄漏。

### 2.2 编辑与预览（P0）

- Monaco 编辑器：50+ 语言语法高亮、按文件保留撤销历史与视图状态、水平滚动（不自动换行）、深浅主题与界面同步；
- 三种视图模式：编辑 / 分屏 / 预览；
- 按解析器分发预览：
  - Markdown：GFM 渲染（表格、任务列表、代码高亮、LaTeX 公式）；
  - HTML：`sandbox` iframe 隔离渲染；
  - JSON / YAML：解析后可折叠数据树，解析失败显示错误；
  - PDF：pdf.js 逐页渲染，翻页 / 缩放，只读不可编辑；
  - 代码 / 文本：highlight.js 高亮。

### 2.3 批量导入（P1）

- 工具栏「导入文件」多选、「导入文件夹」整目录导入（还原目录结构）；
- 支持拖拽文件 / 文件夹进入主区域导入；
- 白名单过滤：仅导入已注册专属解析器的类型（md/markdown/mdx、json/jsonc/json5、yaml/yml、html/htm/xhtml、pdf），其余跳过并提示；
- PDF 读取为 base64，其余按 UTF-8 文本；单文件上限 5 MB。

### 2.4 持久化（P0）

- **工作区数据（文件内容 + 文件夹结构）**：IndexedDB（库 `docforge`，store `kv`，键 `docforge.workspace.v3`），容量大，适合 PDF base64；IndexedDB 不可用时自动降级 localStorage；
- **偏好设置**：主题（next-themes 存 localStorage `docforge.theme`）、视图模式（localStorage `docforge.mode`）、当前选中文件（localStorage `docforge.active`）；
- 编辑即防抖保存（400 ms），切换 / 删除 / 导入立即保存；
- 旧版扁平 `DocFile[]` 数据自动迁移为根级文件树。

### 2.5 主题（P1）

- 浅色 / 深色两档切换，无「跟随系统」；
- 界面与 Monaco 编辑器同步换肤（显式传参，避免 effect 时序问题）；
- 全局无圆角设计。

## 3. 架构要求

### 3.1 解析器注册表（可扩展核心）

```
DocParser {
  id / label / iconKind / editable
  test(ext, name)                 // 类型匹配，注册顺序即优先级
  monacoLanguage(ext, name)       // 编辑器语言
  Preview                         // 预览组件
}
```

新增文档类型 = 在 `src/lib/parsers/index.tsx` 注册一个 parser，无需改动 App / 编辑器 / 文件树。text fallback 必须最后注册。

### 3.2 模块划分

| 模块 | 职责 |
| --- | --- |
| `src/lib/parsers/` | 解析器接口、注册表、各类型注册 |
| `src/lib/workspace.ts` | 树操作纯函数、导入、持久化、迁移、种子 |
| `src/lib/storage.ts` | IndexedDB 键值层 + localStorage 降级 |
| `src/lib/monacoSetup.ts` | Monaco worker / 主题定义 |
| `src/components/` | FileTree、EditorPane、PreviewPane、previews/* |

## 4. 非功能需求

- **性能**：树操作全部不可变纯函数；Monaco model 按文件复用不重建；
- **可靠性**：解析失败降级显示错误而非白屏；存储写满时控制台告警不崩溃；
- **安全**：HTML 预览使用 sandbox iframe（allow-scripts，同源隔离）；无密钥、无服务端；
- **可访问性**：树支持键盘操作（Enter/Space），图标按钮均有 aria-label，删除确认对话框可 Esc 取消；
- **响应式**：移动端侧栏可折叠，分屏在小屏退化为单栏。

## 5. 明确不做（Out of Scope）

- 多用户协作、云端同步、账号体系；
- 真实 PDF 导出 / 打印排版；
- 二进制文件（图片、压缩包等）编辑；
- 服务端搜索与索引。

## 6. 验收标准摘要

1. 新建「A/B/C.md」三级嵌套，刷新后结构与内容完整还原；
2. 删除文件夹弹出确认框，取消不删除，确认后级联删除且编辑器 model 释放；
3. 拖入含 `.exe` 的混合文件，`.exe` 被跳过并有 toast 提示，其余正常入库；
4. 浅色 / 深色切换时，界面、文件树、编辑器、预览区四者同步变色，无相反情况；
5. 清空 IndexedDB 与 localStorage 后重新打开，恢复种子工作区。
