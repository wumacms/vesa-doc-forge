# DocForge

**浏览器内的多格式文档工作台** —— 创建、组织、编辑、预览 Markdown / JSON / YAML / HTML / PDF / 代码文件，数据全部保存在本地浏览器，无后端、零上传。

完整产品需求见 [docs/PRD.md](./docs/PRD.md)。

## 功能亮点

- 🗂 **树形工作区**：任意层级文件夹，新建 / 重命名 / 级联删除（删除前确认对话框）
- ✍️ **Monaco 编辑器**：50+ 语言语法高亮，按文件保留撤销历史，不自动换行
- 👁 **按类型智能预览**：
  - Markdown → GFM 渲染（表格 / 任务列表 / 代码高亮 / LaTeX）
  - JSON / YAML → 可折叠数据树
  - HTML → 沙箱 iframe 隔离渲染
  - PDF → pdf.js 逐页渲染 + 缩放（只读）
- 📦 **批量导入**：多选文件、整文件夹导入、拖拽导入，自动过滤不支持类型并还原目录结构
- 🌗 **深浅主题**：界面与编辑器同步换肤，偏好持久化
- 💾 **本地持久化**：工作区存 IndexedDB（localStorage 自动降级），偏好存 localStorage，编辑防抖保存
- 🧩 **可扩展解析器架构**：新增文档类型只需注册一个 `DocParser`，不改核心代码

## 技术栈

- Vite 5 + React 18 + TypeScript
- Tailwind CSS v4 + shadcn/ui（全局无圆角设计）
- Monaco Editor（自托管 worker）· pdf.js · highlight.js · marked · yaml
- next-themes（主题）· react-router 未引入（单页工作台）

## 快速开始

```sh
npm install   # 安装依赖
npm run dev   # 启动开发服务器（自动热更新）
npm run build # 生产构建
npm run lint  # ESLint 检查
npm run test  # Vitest 单元测试
```

要求 Node.js ≥ 18。

## 项目结构

```
src/
├── App.tsx                    # 工作台布局、导入、删除确认、持久化编排
├── components/
│   ├── FileTree.tsx           # 树形文件管理器（新建/重命名/删除入口）
│   ├── PreviewPane.tsx        # 按解析器分发预览
│   ├── editor/EditorPane.tsx  # Monaco 封装（model 复用、主题同步）
│   └── previews/              # Markdown / HTML / JSON-YAML / PDF / 代码预览
├── lib/
│   ├── parsers/               # DocParser 接口 + 注册表 + 各类型注册
│   ├── workspace.ts           # 树操作纯函数、导入、迁移、种子数据
│   ├── storage.ts             # IndexedDB 键值层（localStorage 降级）
│   └── monacoSetup.ts         # worker 配置与主题定义
└── types.ts                   # WsNode / DocParser 等核心类型
```

## 数据存储说明

| 数据 | 位置 | 键 |
| --- | --- | --- |
| 工作区（文件+目录） | IndexedDB `docforge` / store `kv` | `docforge.workspace.v3` |
| 主题偏好 | localStorage | `docforge.theme` |
| 视图模式 | localStorage | `docforge.mode` |
| 当前选中文件 | localStorage | `docforge.active` |

清空浏览器站点数据会删除全部本地文档；浏览器隐私模式或禁用 IndexedDB 时自动降级 localStorage。

## 新增文档类型

在 `src/lib/parsers/index.tsx` 注册即可：

```ts
registerParser({
  id: "toml",
  label: "TOML",
  iconKind: "code",
  editable: true,
  test: (ext) => ext === "toml",
  monacoLanguage: () => "ini",
  Preview: MyTomlPreview,
});
```

注册顺序即匹配优先级；`code` / `text` fallback 必须保持在最后。

## 部署

纯静态站点，`npm run build` 产物在 `dist/`，任意静态托管均可。
（在 Vesa 平台：Project → Share → Publish。）
