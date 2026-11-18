# 项目级 Agent Skills

本目录按 [Agent Skills](https://github.com/vuejs-ai/skills) 通用约定存放项目级技能：每个技能是 `<name>/SKILL.md` 目录包，可附带 `references/`、`reference/` 等资源文件。

DSH 会从项目根目录的 `.agents/skills/`（或 `.dsh/skills/`）自动发现技能并注入会话技能目录，模型按需通过 `skill` 工具加载，无需重启会话。

## 已安装技能

来源：[vuejs-ai/skills](https://github.com/vuejs-ai/skills)（MIT License，见 [LICENSE](LICENSE)）

- 安装提交：`198f0cd8f7f9c0a3d9b566ccc16de6677519ee78`（上游提交时间 2026-10-23）
- 安装时间：2026-11-17
- 文件数：205（全部为 Markdown）

| 技能                             | 用途                                                       |
| -------------------------------- | ---------------------------------------------------------- |
| `vue-best-practices`             | Vue 3 / 组合式 API / TS / Volar 最佳实践与工作流（必读）   |
| `vue-router-best-practices`      | 路由、导航守卫、路由参数、组件生命周期交互                 |
| `vue-pinia-best-practices`       | Pinia store、状态管理与响应式细节                          |
| `vue-debug-guides`               | 运行时错误、警告、异步错误、SSR / 水合问题排查             |
| `vue-testing-best-practices`     | Vitest、Vue Test Utils、Playwright 测试实践                |
| `vue-jsx-best-practices`         | Vue 中 JSX 与 React JSX 的差异                             |
| `vue-options-api-best-practices` | Options API 写法与 `this` 上下文（本项目默认不使用）       |
| `create-adaptable-composable`    | 使用 `MaybeRef` / `MaybeRefOrGetter` 编写可适配 composable |

## 升级方式

方式一：上游 CLI（会自动写入 agent skills 目录，写入位置以 CLI 提示为准）：

```bash
npx skills add vuejs-ai/skills
```

方式二：手动覆盖（与本目录当前布局一致）：

```bash
git clone --depth 1 https://github.com/vuejs-ai/skills /tmp/vue-skills
cp -r /tmp/vue-skills/skills/* .agents/skills/
cp /tmp/vue-skills/LICENSE .agents/LICENSE
```

Windows PowerShell：

```powershell
git clone --depth 1 https://github.com/vuejs-ai/skills $env:TEMP\vue-skills
Copy-Item "$env:TEMP\vue-skills\skills\*" .agents\skills -Recurse -Force
Copy-Item "$env:TEMP\vue-skills\LICENSE" .agents\LICENSE -Force
```

升级后请同步更新上面的“安装提交”与安装时间，并确认 `pnpm format:check` 仍然通过（`.agents` 已被 `.prettierignore` 排除）。

## 注意

- 这些文件是第三方内容，请勿手工修改；对技能的改进请提交给上游仓库。
- 技能目录名必须与 `SKILL.md` frontmatter 中的 `name` 一致（kebab-case），否则不会被发现。
- 本目录（`.agents/skills`）建议纳入版本管理，与团队共享同一套技能。
