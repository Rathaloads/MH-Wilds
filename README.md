# MonsterHunter

基于 **Vite + Vue 3 + TypeScript** 的前端项目模板，集成 **Element Plus**、**SCSS**、**UnoCSS**、**Vue Router**、**Pinia**，并使用 **Prettier** 统一代码风格，依赖由 **pnpm** 管理。

> 项目现状、架构与接手指南见 [HANDOVER.md](HANDOVER.md)；Agent 协作约定见 [AGENTS.md](AGENTS.md)。

## 技术栈

| 依赖               | 版本  | 说明                                                    |
| ------------------ | ----- | ------------------------------------------------------- |
| Vue                | 3.5   | 组合式 API（`<script setup>`）                          |
| Vite               | 8.x   | 开发服务器与构建工具                                    |
| TypeScript         | 6.x   | 全量类型检查（`vue-tsc`）                               |
| Element Plus       | 2.14  | 组件库，全量引入 + 中文语言包                           |
| Element Plus Icons | 2.3   | 图标组件（`@element-plus/icons-vue`，首页搜索框已使用） |
| SCSS (sass)        | 1.108 | 变量 / 混入 / 嵌套，全局样式与组件样式                  |
| UnoCSS             | 66.x  | 原子化 CSS（`presetWind3` + `presetAttributify`）       |
| Vue Router         | 5.x   | 路由懒加载、`scrollBehavior`、`meta.title` 同步页面标题 |
| Pinia              | 4.x   | 状态管理，`setup store` 写法                            |
| Prettier           | 3.10  | 代码格式化（保存自动格式化 + 命令行校验）               |

## 快速开始

```bash
# 安装依赖（需要 Node >= 20.19，pnpm）
pnpm install

# 启动开发服务器：http://localhost:5173
pnpm dev
```

## 常用脚本

| 命令                | 说明                                                             |
| ------------------- | ---------------------------------------------------------------- |
| `pnpm dev`          | 启动开发服务器                                                   |
| `pnpm build`        | `vue-tsc -b` 类型检查 + `vite build`                             |
| `pnpm preview`      | 预览生产构建产物                                                 |
| `pnpm type-check`   | 仅执行类型检查                                                   |
| `pnpm format`       | Prettier 格式化全部文件                                          |
| `pnpm format:check` | 仅校验格式，适合接入 CI / 提交前检查                             |
| `pnpm sync:data`    | 从 wilds.mhdb.io 拉取数据并覆盖 `public/mh-wilds.json`（需联网） |

## 目录结构

```text
.
├── .agents/skills/         # 项目级 Agent Skills（vuejs-ai/skills 技能包）
├── public/                 # 不参与构建的静态资源（mh-wilds.json 为同步生成的本地快照）
├── scripts/
│   └── sync-mh-wilds.mjs   # 在线数据 → 本地快照同步脚本（pnpm sync:data）
├── src/
│   ├── api/                # 数据加载（mh-wilds.ts 读本地 JSON；mhdb-wilds.ts 供同步脚本使用）
│   ├── components/         # 组件（builder/ 配装器，autobuild/ 自动配装，common/ 通用）
│   ├── composables/        # 组合式逻辑（useLoadout 配装计算 / useMhWildsData 数据加载）
│   ├── router/             # 路由表（懒加载 + meta）
│   ├── stores/             # Pinia 仓库（builds 存档 / loadout-draft 交接）
│   ├── styles/             # SCSS：variables / mixins / reset / index
│   ├── types/              # 类型声明与数据模型（mh-wilds / build / auto-build）
│   ├── utils/              # 纯函数（mh-format / loadout-calc 规则 / auto-build 算法）
│   ├── views/              # 页面级组件（HomeView 自动配装 / BuilderView 配装器）
│   ├── App.vue             # 应用外壳（页头 / 路由视图 / 页脚）
│   └── main.ts             # 应用入口
├── .editorconfig
├── .gitattributes          # 统一换行为 LF
├── .prettierrc.json
├── AGENTS.md               # 项目内智能体约定与 Vue 技能使用说明
├── HANDOVER.md             # 交接文档：现状 / 架构 / 坑位 / 待办
├── index.html
├── pnpm-workspace.yaml     # pnpm 11 构建脚本白名单（allowBuilds）
├── tsconfig.json           # 项目引用入口
├── tsconfig.app.json       # 应用侧 TS 配置（含 @ 别名）
├── tsconfig.node.json      # 构建脚本侧 TS 配置
├── uno.config.ts           # UnoCSS 配置
└── vite.config.ts          # Vite 配置
```

## 关键配置说明

### 1. 路径别名 `@`

- `vite.config.ts`：`resolve.alias` 将 `@` 指向 `src`。
- `tsconfig.app.json`：`compilerOptions.paths` 同步 `@/* -> ./src/*`，保证类型解析与运行时一致。

### 2. UnoCSS

- 插件已在 `vite.config.ts` 注册：`UnoCSS()`（置于 `vue()` 之后）。
- 入口 `src/main.ts` 引入虚拟样式：`import 'virtual:uno.css'`，类型声明见 `src/types/uno.d.ts`。
- 预设与快捷类在 `uno.config.ts` 中维护，内置 `flex-center`、`flex-between`、`page-container`、`card-panel`。
- 支持变体分组写法：`hover:(bg-primary text-white)`；`<style>` 中可直接使用 `@apply`。

### 3. SCSS

- 变量集中在 `src/styles/variables.scss`，混入在 `src/styles/mixins.scss`（`flex-center`、`text-ellipsis`、`respond-to`、`card-surface`）。
- **全局注入**：`vite.config.ts` 的 `css.preprocessorOptions.scss.additionalData` 会给每个 SCSS 入口（含 SFC 的 `<style lang="scss">`）自动加上
  `@use '@/styles/variables' as *;` 与 `@use '@/styles/mixins' as *;`，组件内直接使用 `$color-primary`、`@include respond-to('md')`，**不需要再手写 `@use`**。
  - 注入的文件必须只含变量 / 混入 / 函数（不产生 CSS 输出），否则每个组件都会重复输出一遍样式。
  - 编辑器不会感知这层注入，SCSS 变量名的自动补全较弱；需要时可随时恢复组件内显式 `@use`（重复引入同一模块是合法的，不会报错也不会重复输出）。
- `src/styles/index.scss` 负责 reset、Element Plus CSS 变量覆盖与全局过渡动画；它作为全局样式入口仍保留显式 `@use`。

### 4. Element Plus

- 当前为**全量引入**（`app.use(ElementPlus)`），构建体积换简单可靠。
- 主题通过 CSS 变量覆盖，见 `src/styles/index.scss` 的 `:root` 段，无需编译组件库 SCSS。
- 如需按需引入，可再加 `unplugin-vue-components` + `unplugin-auto-import` 与 `ElementPlusResolver`，并把 `main.ts` 中的全量引入与 `element-plus/dist/index.css` 移除。

### 5. Prettier

- 配置：`.prettierrc.json`（单引号、无分号、`printWidth: 100`、`endOfLine: lf`）。
- 忽略：`.prettierignore`（`node_modules`、`dist`、`pnpm-lock.yaml`、`public`、`.agents`、`.dsh`）。
- VS Code 已配置保存自动格式化（`.vscode/settings.json`），推荐安装 `.vscode/extensions.json` 中的扩展。

### 6. TypeScript

- `vue-tsc -b` 使用项目引用（`tsconfig.json` → `app` / `node` 两个子工程）。
- 开启 `noUnusedLocals`、`noUnusedParameters`、`erasableSyntaxOnly`：不要使用 `enum`、参数属性等不可擦除语法，用联合类型 / `as const` 对象替代。

### 7. pnpm

- 包管理器版本固定为 pnpm 11（`package.json` 的 `packageManager` 字段），Node 要求 `>= 20.19.0`。
- pnpm 11 默认拦截依赖的安装脚本，`pnpm-workspace.yaml` 的 `allowBuilds` 已放行 UnoCSS 依赖链中的 `@parcel/watcher`；后续新增依赖若需要执行构建脚本，运行 `pnpm approve-builds` 更新白名单即可。

### 8. 数据文件与加载

- 数据文件：`public/mh-wilds.json`（**由 `pnpm sync:data` 从 wilds.mhdb.io 拉取全部数据后生成的本地快照**，当前版本 `2026-04-15T01:28:18+00:00`，约 390 KB）。运行时通过 `/mh-wilds.json` 访问，构建时原样复制到 `dist/`；项目只读取这一份 JSON，不提供本地 / 在线数据源切换，也不在运行时代理线上 API。
- 同步脚本：`scripts/sync-mh-wilds.mjs` 通过 Vite 的 SSR 模块加载器复用 `src/api/mhdb-wilds.ts` 的在线适配器（唯一映射实现），写入前会校验数量与上下位字段，校验失败时保留旧文件。**需要更新数据时手动运行 `pnpm sync:data`，刷新页面即可。**
- 类型定义：`src/types/mh-wilds.ts`，包含根结构 `MhWildsData` 与 `MhWeapon`、`MhSkill`、`MhDecoration`、`MhArmor`、`MhTalisman` 等模型。武器带 `rarity`（1–8）、防具带 `rank`（`low`/`high`），按 wilds.mhdb.io 的规则稀有度 ≤4 为下位、≥5 为上位。
- 加载器：`src/api/mh-wilds.ts` 的 `loadMhWildsData()`，带内存缓存（并发调用只请求一次）、请求失败自动清空缓存；`clearMhWildsDataCache()` 用于强制刷新。

```ts
import { loadMhWildsData } from '@/api/mh-wilds'

const data = await loadMhWildsData()
const greatSwords = data.weapons.filter((weapon) => weapon.type === '大剑')
```

## 页面与路由

| 路由       | 页面           | 说明                                                        |
| ---------- | -------------- | ----------------------------------------------------------- |
| `/`        | `HomeView`     | 自动配装：选目标技能 + 武器类型（可指定具体武器），一键生成 |
| `/builder` | `BuilderView`  | 配装器：装备选择、装饰品、技能合计与存档                    |
| `/about`   | `AboutView`    | 技术栈版本、命令与目录说明                                  |
| `*`        | `NotFoundView` | 404 兜底                                                    |

## 自动配装（首页 `/`）

页面为上下三段布局：**顶部选择武器类型**（可在同类型下进一步指定具体武器，留空则由算法自动挑选）、**装备范围**（不限 / 优先上位 / 优先下位，武器与防具都按该范围筛选；指定武器时范围自动跟随该武器并禁用切换），**中部平铺全部可获取技能**（按武器 / 防具 / 系列 / 组技能归集，每个技能直接选择目标等级：0 = 未选，系列上限 2、组上限 1、其他取数据上限；支持按名称搜索过滤），**底部固定「自动配装」按钮**。

点击后打开抽屉，按**综合评分从高到低**展示前 20 套配装（同分再比较完全符合 / 技能满足数 / 等级达成 / 防御力）。摘要会提示完全符合目标的套数，但不再强制「完全符合优先」。每套卡片显示综合评分、防御力与技能达成，可展开完整详情（含评分分项）、复制文本（含装备 / 珠子 / 技能）或一键「载入配装器」继续微调（数据更新后会按装备名称自动还原）。指定具体武器时只围绕该武器搜索（适用于「根据手里的武器反推配装」）。

**算法**（`src/utils/auto-build.ts` 的 `autoBuildCandidates`，纯函数）：

1. **武器**：指定了具体武器时只搜索该武器；否则先按装备范围（武器用 `rarity` ≤4 下位 / ≥5 上位判断）与武器类型过滤，再按「目标技能匹配 + 孔位潜力」排序取前 5 把参与搜索；
2. **防具**：按装备范围（防具 `rank`）过滤每个部位的候选后做 beam search（逐部位扩展、保留高分路径），评分 = 目标技能等级 + 孔位潜力 + 系列 / 组技能件数进度；
3. **装饰品**：每条防具组合按孔位等级从高到低补齐能继续服务目标技能的珠子（类型 / 等级必须匹配）；
4. **护石**：最后挑最能补足剩余技能或等级的一件；
5. **评分与排序**：候选去重后计算综合评分并降序返回前 20 套；`autoBuildLoadout` 保留为返回最优一套的兼容接口。

**综合评分**（0–100）四个维度加权：**攻击力 20%**（武器 `attack`）、**全套防具防御力 20%**、**目标技能完整度 30%**（满足技能数 / 目标技能数）、**目标技能等级 30%**（达成等级 / 目标等级）。攻击 / 防御在当前候选池内做 min-max 归一化，技能两项本身是 0–1 比率；权重常量在 `src/utils/auto-build.ts` 的 `SCORE_WEIGHTS`，可统一调整。抽屉卡片与详情面板都会展示评分及四项分项。

说明：技能 / 孔位 / 系列组规则统一在 `src/utils/loadout-calc.ts` 维护（配装器与自动配装共用）；系列 / 组技能的实际上限由该文件统一计算（系列 2 件 Lv1 / 4 件 Lv2、组技能 3 件生效），数据中的 `max` 仅作参考。

## 数据来源与同步

项目只有一份配装数据：`public/mh-wilds.json`（构建后为 `dist/mh-wilds.json`），运行时通过 `loadMhWildsData()` 读取，不再有「本地 / 在线」切换，也不会在运行时代理线上 API。

- **同步脚本**：`pnpm sync:data`（`scripts/sync-mh-wilds.mjs`）从 [wilds.mhdb.io](https://docs.wilds.mhdb.io/)（`zh-Hans`）拉取技能 / 武器 / 防具 / 装饰品 / 护石全量数据，经 `src/api/mhdb-wilds.ts` 适配器转换为 `MhWildsData` 后覆盖 `public/mh-wilds.json`；先写临时文件再原子替换，数量 / 武器 `rarity` / 攻击力 / 防具 `rank` 校验通过后才落盘，失败保留旧文件。
- **更新流程**：需要新数据时手动运行 `pnpm sync:data`，刷新页面（开发）或重新构建（发布）。脚本需要外网访问 `wilds.mhdb.io`，项目运行时不需要联网。
- **当前规模**：1188 武器 / 179 技能 / 714 防具 / 361 装饰品 / 183 护石，数据版本 `2026-04-15T01:28:18+00:00`，约 390 KB。
- **数据接口细节**：适配器并行请求 `skills`、`weapons`、`armor`、`decorations`、`charms`，使用 `p` 投影裁剪字段、`limit/offset` 分页（约 660 KB），并读取 `/version`；武器 `kind` → 中文类型并保留 `rarity` / `attack`（`damage.raw`），防具保留 `rank`（`low`/`high`）、`skills` 中 `kind=armor/group/set` 分别映射普通技能 / 组技能 / 系列技能归属；装饰品 `kind=armor` → 防具珠、`weapon` → 武器珠；护石按 `ranks` 展开；防御力取 `defense.base`。
- **加载与缓存**：`src/api/mh-wilds.ts` 提供带内存缓存的 `loadMhWildsData()`；`useMhWildsData` 在页面间共享同一份数据，加载失败时显示错误与「重试」。
- **数据更新兼容**：配装存档（`SavedBuild.members`）与「载入配装器」交接（`loadout-draft.members`）会额外保存装备名称快照；重新同步 JSON 后若数组顺序或内容变化，读取时按装备名称还原（找不到对应装备则提示重新配装）。
- **上下位信息**：武器用 `rarity` 区分（≤4 下位、≥5 上位，wilds.mhdb.io 官方 `Rank::guess` 规则），防具用 `rank` 字段；自动配装的「装备范围」筛选即基于这两项。

## 配装器（`/builder`）

基于 `public/mh-wilds.json` 的装备配装模拟器，功能：

- **装备选择**：武器（按 14 种武器类型筛选）、防具五部位、护石；弹窗支持名称搜索、类型标签过滤与分页加载。
- **装备详情**：每张装备卡片可点「详情」，查看该装备的稀有度 / 上下位 / 攻击力 / 防御力 / 孔位 / 所属系列 / 自带技能（防具还展示系列技能与组技能归属）。
- **技能筛选**：工具栏「按技能筛选候选装备」可只显示提供指定技能的武器 / 防具 / 护石。
- **孔位与装饰品**：按当前装备自动列出武器孔、防具孔、护石孔；每个孔位只显示「类型匹配（武器珠 / 防具珠）+ 孔位等级满足」的装饰品，装备变更后自动清理不再匹配的镶嵌。
- **技能合计**：汇总武器 / 防具 / 护石 / 装饰品技能，显示 `Lv / 上限`、进度条、满级与超额提示；技能按武器 / 防具 / 系列 / 组分类。
- **系列技能**：同系列 2 件激活 Lv1、4 件激活 Lv2；**组技能**：同组 3 件激活。
- **统计 / 装备数值**：顶部统计展示武器攻击力、全套防御力、已用孔位 / 总孔位、技能数；「装备数值」区块列出武器名称 + 攻击力，以及 5 件防具各自的名称 + 防御力。
- **配装存档**：Pinia + localStorage 持久化（`mh-wilds:builds:v1`），支持命名保存、读取、删除，刷新页面不丢失；保存时记录装备名称快照，**数据文件更新后读取会按名称自动还原**（旧存档缺少名称快照时按下标读取）。
- **复制配装**：一键复制装备与技能清单文本，便于分享。

实现结构：

| 文件                                | 职责                                                                  |
| ----------------------------------- | --------------------------------------------------------------------- |
| `src/views/BuilderView.vue`         | 页面编排：工具栏、装备卡片、孔位面板、合计面板、弹窗                  |
| `src/composables/useLoadout.ts`     | 配装状态与派生计算（孔位、技能合计、系列 / 组技能、防御力、镶嵌校验） |
| `src/composables/useMhWildsData.ts` | 数据加载（模块级共享、幂等）                                          |
| `src/components/builder/*`          | 装备卡片（含详情弹窗）、孔位面板、技能合计、选择弹窗、存档弹窗        |
| `src/stores/builds.ts`              | 配装存档（localStorage 持久化）                                       |
| `src/types/build.ts`                | 配装相关类型与规则常量（部位、类别、激活件数）                        |

规则说明：系列 / 组技能的实际上限由 `src/utils/loadout-calc.ts` 统一计算——系列技能 2 件 Lv1 / 4 件 Lv2（上限 2），组技能 3 件生效（上限 1）；数据中的 `max` 仅作参考。

## 新增页面

1. 在 `src/views/` 创建 `FooView.vue`。
2. 在 `src/router/index.ts` 添加路由（`component: () => import('@/views/FooView.vue')`）并设置 `meta.title`。
3. 如需全局状态，在 `src/stores/` 新增 `useFooStore` 并从 `src/stores/index.ts` 导出。

## AI 技能（Agent Skills）

项目内置了 [vuejs-ai/skills](https://github.com/vuejs-ai/skills)（MIT）作为**项目级 Agent Skills**，后续智能体开发 Vue 功能时会自动发现并使用：

- 安装位置：`.agents/skills/`（每个技能是 `<name>/SKILL.md` + `references/` 资源目录），共 8 个技能。
- 自动发现：DSH 会扫描项目根目录下 `.dsh/skills/` 与 `.agents/skills/` 并注入会话技能目录，按需用 `skill` 工具加载，无需重启会话。
- 使用约定：[AGENTS.md](AGENTS.md) 要求开发 / 重构 / 评审 Vue 代码前先加载 `vue-best-practices`，再按任务类型加载路由、Pinia、调试、测试等技能。
- 来源、安装提交与升级方式：[.agents/README.md](.agents/README.md)。
- 这些是第三方内容，已在 `.prettierignore` 中排除，`pnpm format` 不会改动它们。

| 技能                             | 适用场景                                      |
| -------------------------------- | --------------------------------------------- |
| `vue-best-practices`             | Vue 3 / 组合式 API / TS 通用最佳实践（必读）  |
| `vue-router-best-practices`      | 路由、导航守卫、路由参数、组件生命周期        |
| `vue-pinia-best-practices`       | Pinia store 与跨组件状态管理                  |
| `vue-debug-guides`               | 运行时错误、警告、异步 / SSR 水合问题排查     |
| `vue-testing-best-practices`     | Vitest、Vue Test Utils、Playwright 测试       |
| `create-adaptable-composable`    | MaybeRef / MaybeRefOrGetter 可适配 composable |
| `vue-jsx-best-practices`         | Vue 中 JSX 与 React JSX 的差异                |
| `vue-options-api-best-practices` | Options API 写法（本项目默认不使用）          |

## 常见问题

- **`pnpm install` 提示 `Ignored build scripts` / `ERR_PNPM_IGNORED_BUILDS`**：pnpm 11 会拦截依赖的安装脚本，本项目已在 `pnpm-workspace.yaml` 的 `allowBuilds` 中放行 `@parcel/watcher`。新增需要构建脚本的依赖时，执行 `pnpm approve-builds` 重新生成白名单。
- **端口被占用**：修改 `vite.config.ts` 中的 `server.port`，或使用 `pnpm dev --port 5174`。
- **格式化后大量文件变动**：确认编辑器没有使用其他格式化器；本项目统一使用 Prettier。
