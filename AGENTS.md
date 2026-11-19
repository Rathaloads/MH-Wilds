# AGENTS.md

本文件给在本仓库中工作的 AI 智能体（Agent）提供约定与技能使用说明。

> 项目现状、架构、数据源、算法与已知坑位见 `HANDOVER.md`（新会话请先阅读后再动手）。

## 项目概览

MonsterHunter 是一个 Vue 3 前端项目：

- 构建：Vite 8 + TypeScript 6 + SCSS（sass）+ UnoCSS 66（`presetWind3`）
- 框架：Vue 3.5（Composition API + `<script setup lang="ts">`）、Vue Router 5、Pinia 4
- UI：Element Plus 2（全量引入，中文语言包）
- 工程化：pnpm 11、Prettier 3（保存自动格式化）、路径别名 `@ → src`
- 主要功能：
  - 自动配装首页 `/`：顶部武器类型（可在同类型下指定具体武器，留空自动挑选）+ 装备范围（不限 / 优先上位 / 优先下位，武器与防具同范围）+ 中部全部技能平铺 + 底部按钮，结果用抽屉（`src/components/autobuild/AutoBuildDrawer.vue`）按综合评分降序列出前 20 套；算法 `autoBuildCandidates`（beam search + 攻击力 / 防御力 / 技能完整度 / 技能等级四维评分）在 `src/utils/auto-build.ts`，UI 在 `src/components/autobuild/`，结果通过 `src/stores/loadout-draft.ts` 交接给配装器；
  - 配装器 `/builder`：页面 `src/views/BuilderView.vue`，计算核心 `src/composables/useLoadout.ts`，存档 `src/stores/builds.ts`，UI 组件在 `src/components/builder/`；装备卡片可打开详情弹窗（`EquipmentDetailDialog.vue`），配装合计（`SkillSummaryPanel.vue`）展示武器攻击力、各部位防御力与技能/系列/组技能；
  - 技能 / 孔位 / 系列组规则统一维护在 `src/utils/loadout-calc.ts`（两个页面共用），不要在页面里重复实现规则。
  - 数据源：项目只有一份配装数据 `public/mh-wilds.json`（由 `pnpm sync:data` 从 wilds.mhdb.io 拉取生成）；运行时通过 `src/api/mh-wilds.ts` 的 `loadMhWildsData()` 读取，不再有本地/在线数据源切换，也不在运行时代理线上 API。`src/api/mhdb-wilds.ts` 适配器仅供同步脚本使用。配装存档与自动配装交接带装备名称快照（`src/utils/loadout-snapshot.ts`），数据更新后按名称还原。

常用命令：

```bash
pnpm dev          # 开发服务器 http://localhost:5173
pnpm sync:data    # 从 wilds.mhdb.io 同步本地快照 public/mh-wilds.json（需联网）
pnpm type-check   # vue-tsc 类型检查
pnpm build        # 类型检查 + 生产构建
pnpm format       # Prettier 格式化
pnpm format:check # 校验格式（CI）
```

## 代码约定（摘要）

- 只用 Composition API + `<script setup lang="ts">`，不要新增 Options API 组件。
- 组件样式使用 `<style scoped lang="scss">`；`@/styles/variables` 与 `@/styles/mixins` 已由 `vite.config.ts` 的 `additionalData` 全局注入，组件内直接使用 `$color-*`、`@include`，**不要再写 `@use`**；全局样式只在 `src/styles/index.scss` 追加。
- 页面放 `src/views/`，路由在 `src/router/index.ts` 注册（懒加载 + `meta.title`）；全局状态放 `src/stores/`（setup store 写法）。
- 样式优先用 UnoCSS 工具类与 Element Plus 组件，避免重复造轮子；主题色通过 `src/styles/index.scss` 的 CSS 变量覆盖。
- 静态数据文件放 `public/`，数据模型类型放 `src/types/`，加载逻辑放 `src/api/`（现有示例：`public/mh-wilds.json` → `src/types/mh-wilds.ts` → `src/api/mh-wilds.ts` 的 `loadMhWildsData()`，带缓存）。
- TypeScript 开启 `erasableSyntaxOnly` / `noUnusedLocals`：不要使用 `enum`、参数属性等不可擦除语法。
- 完成修改后必须通过 `pnpm type-check` 和 `pnpm format:check`（或先 `pnpm format`）。

## Vue 技能包（Agent Skills，必须使用）

本仓库在 [`.agents/skills/`](.agents/skills) 内置了 [vuejs-ai/skills](https://github.com/vuejs-ai/skills)（MIT）作为项目级 Agent Skills，会被自动发现并出现在会话技能目录中。

**开发、重构、评审 Vue 相关功能前，先用 `skill` 工具加载 `vue-best-practices`，并遵循其中的工作流。** 再按任务类型加载对应技能：

| 场景                             | 技能                                                       |
| -------------------------------- | ---------------------------------------------------------- |
| Vue 组件 / 组合式 API / 通用     | `vue-best-practices`（必选）                               |
| 路由、导航守卫、路由参数         | `vue-router-best-practices`                                |
| Pinia store、跨组件状态          | `vue-pinia-best-practices`                                 |
| 运行时错误、警告、异步/水合      | `vue-debug-guides`                                         |
| 编写可复用 / 可适配的 composable | `create-adaptable-composable`                              |
| 组件测试 / E2E                   | `vue-testing-best-practices`                               |
| 项目确实使用 JSX / Options API   | `vue-jsx-best-practices`、`vue-options-api-best-practices` |

注意事项：

- 技能内容基于 Vue 3 通用最佳实践，其中路由 / Pinia 章节可能以 Vue Router 4、旧版 Pinia 为背景；本项目实际为 Vue Router 5 / Pinia 4，若与项目实际 API 冲突，以项目实际 API 与 `vue-best-practices` 为准。
- 技能内引用文件（`references/`、`reference/`）按需读取，路径相对技能目录解析。
- `.agents/skills/` 是第三方内容，已在 `.prettierignore` 中排除，不要手动格式化或修改；升级方式见 [`.agents/README.md`](.agents/README.md)。
