# HANDOVER · MonsterHunter 配装器项目交接文档

> 面向「在新窗口/新会话继续开发」的交接说明。
> 新会话开始时请先读：`AGENTS.md`（项目约定与技能使用规则）→ 本文档（现状、架构、坑位）。
> 最后更新：2026-11-18。

---

## 1. 一句话现状

项目已完成可运行的「怪物猎人荒野配装工具」：

- 首页 `/`：**自动配装**（顶部选武器类型（可进一步指定具体武器）与装备范围（不限 / 优先上位 / 优先下位） → 中间平铺全部技能选目标等级 → 底部按钮 → 抽屉按综合评分降序列出多套配装）。
- `/builder`：**手动配装器**（选武器/防具/护石、镶嵌装饰品、实时技能合计与系列/组技能、存档）。
- 两种配装均支持 **本地 JSON / 在线 API 两种数据源**，可随时切换。
- 复制配装文本包含装备、已镶嵌珠子（含孔位）、技能合计。
- 工程化：Vite + Vue 3 + TS + Element Plus + SCSS + UnoCSS + Vue Router + Pinia + Prettier，pnpm 管理。
- 多次独立验收（布局/算法/数据源/回归）全部 PASS；无已知阻塞问题。

---

## 2. 快速开始

环境：Node ≥ 20.19（本机 Node v24.16.0）、pnpm 11（本机 11.6.0）。

```bash
cd C:\project\MonsterHunter
pnpm install          # 已安装，锁文件在 pnpm-lock.yaml
pnpm dev              # http://localhost:5173
pnpm sync:data        # 从 wilds.mhdb.io 同步本地快照 public/mh-wilds.json（需联网）
pnpm type-check       # vue-tsc -b
pnpm build            # 类型检查 + 生产构建
pnpm format           # Prettier 写回
pnpm format:check     # 格式校验（提交前必跑）
```

- 本地数据（`public/mh-wilds.json`）是 **在线数据的快照**，由 `pnpm sync:data` 生成；数据过旧时重新跑一次即可，不需要手工维护。
- Windows PowerShell 禁止执行 `.ps1`，因此 `pnpm` 需用 `pnpm.cmd`（或 `& 'C:\Users\admin\AppData\Roaming\npm\pnpm.cmd' dev`）。
- 当前项目目录 **不是 git 仓库**（无 `.git`），需要版本管理时自行 `git init`。
- 项目级 Agent Skills 位于 `.agents/skills/`（vuejs-ai/skills，MIT），DSH 会自动发现；开发 Vue 功能前按 AGENTS.md 先加载 `vue-best-practices`。

---

## 3. 技术栈与版本

| 依赖         | 版本    | 说明                                                                                     |
| ------------ | ------- | ---------------------------------------------------------------------------------------- |
| Vue          | 3.5.45  | Composition API + `<script setup lang="ts">`                                             |
| Vite         | 8.3.8   | 开发/构建                                                                                |
| TypeScript   | 6.0.3   | `vue-tsc -b` 项目引用（app/node）                                                        |
| Element Plus | 2.14.8  | 全量引入 + 中文语言包                                                                    |
| vue-router   | 5.5.1   | 懒加载 + `meta.title`                                                                    |
| pinia        | 4.1.0   | setup store                                                                              |
| UnoCSS       | 66.13.0 | `presetWind3` + attributify + directives                                                 |
| sass         | 1.108.2 | SCSS（组件内变量/混入由 `vite.config.ts` 的 `additionalData` 注入，**不要再写 `@use`**） |
| Prettier     | 3.10.1  | 无分号/单引号/printWidth 100                                                             |

---

## 4. 页面与路由

| 路由       | 组件                         | 说明                                                            |
| ---------- | ---------------------------- | --------------------------------------------------------------- |
| `/`        | `src/views/HomeView.vue`     | 自动配装：武器类型 + 全部技能平铺 + 底部按钮 + 结果抽屉         |
| `/builder` | `src/views/BuilderView.vue`  | 手动配装器：装备卡片、孔位与装饰品、技能合计、系列/组技能、存档 |
| `/about`   | `src/views/AboutView.vue`    | 版本/命令/目录说明                                              |
| `*`        | `src/views/NotFoundView.vue` | 404                                                             |

布局要点：

- `src/App.vue` 的 `.app-shell` 定高 `100vh/100dvh`，`.app-content` 负责滚动；首页内部再分「固定头部 + 固定武器栏 + 技能滚动区 + 固定底部按钮」。

---

## 5. 目录与关键文件

```text
.
├── .agents/skills/            # 项目级 Agent Skills（vuejs-ai/skills）
├── AGENTS.md                  # 项目约定 + 技能使用规则（新会话必读）
├── HANDOVER.md                # 本文档
├── public/mh-wilds.json       # 本地配装数据（在线快照，390 KB，pnpm sync:data 生成）
├── scripts/sync-mh-wilds.mjs  # 在线 → 本地快照同步脚本
├── src/
│   ├── api/
│   │   ├── mh-wilds.ts        # 按数据源加载：本地 JSON / 在线适配器
│   │   └── mhdb-wilds.ts      # wilds.mhdb.io 在线适配器（投影+分页+字段映射）
│   ├── components/
│   │   ├── builder/           # 配装器组件（选择弹窗/装备卡/孔位/技能合计/存档弹窗）
│   │   ├── autobuild/         # 自动配装组件（技能选择器 / 结果抽屉 / 结果详情面板）
│   │   └── common/            # DataSourceSwitch
│   ├── composables/
│   │   ├── useLoadout.ts      # 配装器状态与派生计算
│   │   └── useMhWildsData.ts  # 按数据源缓存加载 + 竞态保护
│   ├── stores/
│   │   ├── builds.ts          # 配装存档（localStorage）
│   │   ├── data-source.ts     # 数据源偏好（localStorage）
│   │   └── loadout-draft.ts   # 自动配装 → 配装器 的一次性交接
│   ├── types/
│   │   ├── mh-wilds.ts        # 领域数据模型（MhWildsData 等）
│   │   ├── build.ts           # 配装类型/规则常量
│   │   ├── auto-build.ts      # 自动配装输入/候选/结果类型
│   │   └── data-source.ts     # DataSource = 'local' | 'online'
│   ├── utils/
│   │   ├── auto-build.ts      # autoBuildCandidates（beam search 多候选）
│   │   ├── loadout-calc.ts    # 技能/孔位/系列组规则唯一实现（两页共用）
│   │   └── mh-format.ts       # 展示格式化（孔位、技能、槽位 id → 文案）
│   ├── views/                 # 页面
│   └── styles/                # SCSS 变量/混入/reset/全局
├── README.md                  # 使用文档（功能/数据源/规则）
└── vite.config.ts / uno.config.ts / tsconfig*.json / .prettierrc.json
```

---

## 6. 数据层

### 6.1 统一模型

所有页面/算法只消费 `src/types/mh-wilds.ts` 的 `MhWildsData`：

- `skills`: `MhSkill[]`（`name/max/category/...`，category = `weapon | equip | series | group | preserver`）
- `weapons`: `MhWeapon[]`（`name/type(中文)/rarity/attack/skills/slots/series`）
- `armors`: 按 `head/chest/arms/waist/legs` 分组的 `MhArmor[]`（`skills/seriesSkills/groupSkills/slots/defense/rank/...`）
- `decorations`: `MhDecoration[]`（`name/slot/type:'weapon'|'equip'|'preserver'/skills`）
- `talismans`: `MhTalisman[]`（`name/type:'equip'/skills/slots`）
- `weaponTypes`: 14 个中文武器类型（顺序固定）
- `counts / version / generatedAt / source`

### 6.2 本地数据（在线快照）

- 文件：`public/mh-wilds.json`，**不再手工维护**：由 `pnpm sync:data` 执行 `scripts/sync-mh-wilds.mjs`，复用在线适配器（`src/api/mhdb-wilds.ts`）拉取 wilds.mhdb.io 数据并写成本地快照（先写临时文件再原子替换；校验不通过时保留旧文件）。
- 当前快照（2026-11-18 同步）：版本 `2026-04-15T01:28:18+00:00`，1188 武器 / 179 技能 / 714 防具 / 361 装饰品 / 183 护石，约 390 KB。
- 字段与在线完全一致（同一适配器生成）：武器带 `rarity`（≤4 下位、≥5 上位）与 `attack`（`damage.raw`，用于综合评分），防具带 `rank`（low/high）；系列/组技能的 `max` 由适配器按实际等级计算（系列 2 / 组 1），规则仍以第 7 节为准。
- 旧版 gamecat.fun 数据（1130/170/634/364/173）已弃用；本地快照不会自动更新，需要时重新运行同步脚本。

### 6.3 在线数据（wilds.mhdb.io）

- 源码：`src/api/mhdb-wilds.ts`；文档：<https://docs.wilds.mhdb.io/>。
- Base：`https://wilds.mhdb.io/zh-Hans`；已开启 CORS，浏览器可直连。
- 使用端点：`/skills`、`/weapons`（1188 条，`limit=1000` 分页）、`/armor`（714）、`/decorations`（361）、`/charms`（64 → 展开 183 条护石）、`/version`；全部用 JSON 投影参数 `p={"字段路径":true}` 裁剪字段（总请求约 660 KB）。
- 当前在线版本：`2026-04-15T01:28:18+00:00`；规模：1188 武器 / 179 技能 / 714 防具 / 361 装饰品 / 183 护石（本地快照由同一适配器生成，规模一致）。
- 映射规则：
  - 武器 `kind`（英文枚举）→ 中文武器类型（`sword-shield` → 单手剑 等），并保留 `rarity`（≤4 下位 / ≥5 上位，官方 `Rank::guess` 规则）；
  - 防具保留 `rank`（`low` / `high`）；`skills` 中 `skill.kind = armor / group / set` 分别映射为普通技能 / 组技能归属 / 系列技能归属（不混入普通技能表）；
  - 装饰品 `kind=armor` → `'equip'`，`weapon` → `'weapon'`；
  - 护石按 `ranks` 展开，无技能的随机护石跳过；
  - 防御力取 `defense.base`；数据版本取 `/version`。
- 请求失败会抛中文错误（「无法连接 wilds.mhdb.io…」），页面显示错误 + 重试。

### 6.4 数据源切换

- 入口：首页/配装器右上角 `DataSourceSwitch`；偏好 `localStorage: mh-wilds:data-source`。
- 加载：`useMhWildsData` 按数据源内存缓存 + 请求令牌（快速切换时旧响应不会覆盖新数据）。
- 切换后**重置**页面状态（技能目标/配装选择/结果抽屉），因为两套数据的装备下标不通用。
- 一致性：`SavedBuild.dataSource` 记录存档来源（旧存档缺省按 local），跨数据源「读取」禁用；自动配装交接 `LoadoutDraft.source` 与当前数据源不一致时忽略。
- 已知限制：在线数据只有内存缓存，刷新页面需重新拉取（约数秒）；本地快照无需联网，但不会自动更新，需要时运行 `pnpm sync:data`。

---

## 7. 业务规则（唯一实现：`src/utils/loadout-calc.ts`）

- 技能等级上限：普通技能取数据 `max`；**系列技能 2**（2 件 Lv1、4 件 Lv2）；**组技能 1**（3 件激活）。
- 孔位：槽位 id 形如 `weapon:0` / `head:1` / `talisman:0`；武器孔只接受 `type='weapon'` 装饰品，防具/护石孔只接受 `type='equip'`，且 `decoration.slot <= 孔位等级`。
- 技能合计 = 武器 + 5 防具 + 护石 + 已镶嵌装饰品技能 + 已激活系列/组技能。
- 防具系列/组归属来自 `seriesSkills` / `groupSkills` 映射（每件计 1）。
- `buildSkillSummaries` / `calcSeriesBonuses` / `calcGroupBonuses` / `collectEquipmentSkillLevels` / `decorationFitsSlot` 均在此文件，页面与算法不得重复实现。

---

## 8. 配装器（`/builder`）

- 状态与派生：`src/composables/useLoadout.ts`（`weapon/armorPieces/talisman/slots/summary/decorationOptionsBySlot` 等；`selection` 只读暴露，修改走 action）。`summary` 含 `weaponName / weaponAttack / defenseBreakdown`（5 件防具的名称与防御力）。
- UI：`src/components/builder/`
  - `EquipmentCard.vue` 装备卡（详情 / 更换 / 清除）
  - `EquipmentDetailDialog.vue` 装备详情（稀有度、上下位、攻击力、防御力、孔位、系列、自带技能；防具含系列/组技能归属）
  - `BuilderPickerDialog.vue` 选择弹窗（搜索/类型过滤/分页）
  - `SlotBoard.vue` 孔位与装饰品选择
  - `SkillSummaryPanel.vue` 配装合计：统计（武器攻击力 / 全套防御力 / 已用孔位 / 技能数）+「装备数值」明细（武器攻击力及每件防具防御力）+ 技能/系列/组
  - `BuildLibraryDialog.vue` 存档（保存/读取/删除；按数据源隔离）
- 装备详情的数据由 `BuilderView` 从当前 `weapon / armorPieces / talisman` 组装为 `EquipmentDetail`（`src/types/build.ts`）；武器上下位用 `loadout-calc.ts` 的 `rankForRarity()` 推导。
- 存档：`src/stores/builds.ts` + `localStorage: mh-wilds:builds:v1`，`SavedBuild = { id, name, createdAt, selection, dataSource? }`。
- 复制配装：`buildShareText()` 输出装备 + 已镶嵌珠子（`武器孔 #1：攻击珠Ⅲ【3】（攻击+3）`）+ 防御 + 技能 + 系列/组技能。

---

## 9. 自动配装（首页 `/`）

### 9.1 UI

- 顶部：武器类型选择 + **指定武器（可选）** + **装备范围（不限 / 优先上位 / 优先下位）** + 数据源切换。指定武器下拉按当前武器类型过滤、可搜索、可清空；未指定时由算法自动挑选。
- 装备范围：`high` 只从上位装备中选、`low` 只从下位装备中选、`any` 不限；武器按 `rarity`（≤4 下位 / ≥5 上位）、防具按 `rank` 判断，护石 / 装饰品无上下位始终参与。指定武器时范围自动跟随该武器并禁用切换（算法侧指定武器仍以用户选择为准）。
- 中部：`SkillRequirementPicker` 平铺全部技能（179 行），每个技能一个等级下拉（0=未选）；已选技能 chips 可单个移除。
- 底部：固定操作栏（已选数量 / 武器类型 + 指定武器 + 装备范围 + 「自动配装」按钮）。
- 切换武器类型 / 数据源会清空已指定的武器；目标、武器类型、指定武器或装备范围变化后已有结果失效。
- 结果：`AutoBuildDrawer` 抽屉按**综合评分降序**展示前 20 套（不再强制完全符合优先），每张卡显示评分 / 防御 / 技能达成，可「详情 / 复制 / 载入配装器」；详情面板含评分分项（攻击力 / 防御力 / 技能完整度 / 技能等级）。

### 9.2 算法（`src/utils/auto-build.ts`）

- `autoBuildCandidates(data, { weaponType, weaponIndex?, rankScope?, requirements }, { limit? })`：
  1. 确定候选武器：指定了武器（`weaponIndex` 有效且类型匹配）则只搜索该武器；否则先按装备范围（武器 `rarity`）过滤目标类型内武器，再按技能匹配 + 孔位潜力排序取前 5 把；
  2. 每把武器做防具 beam search（宽度 14，每部位 6 候选），候选防具先按装备范围（`rank`）过滤，评分 = 目标技能 + 孔位潜力 + 系列/组件数进度；
  3. 每条组合补装饰品（孔位等级从高到低，只补目标技能）；
  4. 最后补护石（补剩余技能/等级）；
  5. 去重（武器+防具+护石+镶嵌签名）后计算四维综合评分并降序排列，展示前 `limit`（默认 20）套。
- **综合评分**（0–100，权重常量 `SCORE_WEIGHTS`）：攻击力 20%（武器 `attack`）+ 全套防具防御力 20% + 技能完整度 30%（满足技能数 / 目标技能数）+ 技能等级 30%（达成等级 / 目标等级）；攻击 / 防御在候选池内 min-max 归一化，技能两项本身为 0–1。
- 返回 `{ candidates, fullySatisfiedCount, totalCandidates }`；`autoBuildLoadout` 保留为返回评分最高一套的兼容接口。
- 性能：本机约 150–300ms（含抽屉打开）；装备范围会缩小候选池，通常更快。
- 备注：启发式搜索，非全局最优；评分在同技能水平下主要区分攻击 / 防御，可继续做装备多样性改进。

### 9.3 交接

「载入配装器」通过 `src/stores/loadout-draft.ts` 一次性交接 `{ selection, source }`；`BuilderView` 在数据加载后消费，数据源一致才应用，否则提示忽略。

---

## 10. 复制文本格式

- 配装器「复制配装」与抽屉内每套「复制」都包含：

```text
【自动配装 / 怪物猎人荒野配装】
武器类型：大剑
武器：斩骨大剑
头部：… 胸部：… 腕部：… 腰部：… 腿部：…
护石：无需护石
装饰品：
  武器孔 #1：攻击珠Ⅲ【3】（攻击+3）
防御力：290
技能：攻击 4/3、弱点特效 3/3
```

- 孔位文案统一由 `src/utils/mh-format.ts` 的 `formatSlotLabel()` 生成。

---

## 11. 验证与质量

- 工程检查（每次改动后必跑）：`pnpm type-check`、`pnpm build`、`pnpm format:check`。
- 最近一次全量验证：三条命令均通过；构建产物无异常（HomeView 约 23 KB、BuilderView 约 20 KB 独立分包）。
- 独立验收记录（均由独立 verifier 在只读模式下执行）：
  1. 项目初始化：7/7 PASS；
  2. 配装器：5/5 PASS；
  3. 首页自动配装：6/6 PASS；
  4. 本地/在线数据源：6/6 PASS；
  5. 首页改版（平铺技能 + 抽屉多套）：6/6 PASS。
- 追加功能验证（2026-11-18，指定武器）：
  - 算法脚本（vite `ssrLoadModule` 直跑 `autoBuildCandidates`）7 项检查 PASS：指定武器时候选全部使用该武器、notes 标注「已指定」、类型不匹配下标安全退回类型搜索、不指定 / `weaponIndex: null` 行为不变、`autoBuildLoadout` 兼容、候选武器多样性正常；
  - headless Chrome + CDP 端到端冒烟 PASS：指定武器下拉在未选类型时禁用、选项按类型过滤、底部与抽屉均显示指定武器、结果全部为该武器；
  - `pnpm type-check` / `pnpm build` / `pnpm format:check` 通过。
- 数据同步（2026-11-18，`pnpm sync:data`）：
  - 首次同步成功：版本 `2026-04-15T01:28:18+00:00`，1188 武器 / 179 技能 / 714 防具 / 361 装饰品 / 183 护石，快照约 390 KB（含武器攻击力，旧 gamecat 数据已替换）；
  - 快照校验脚本 PASS：counts 与实际数量一致、武器 `rarity` 全部合法（下位 288 / 上位 900）、防具 `rank` 全部为 low/high（132 / 582）、武器类型 14 个、技能 179 条；
  - 算法回归 PASS：新快照下大剑 / 弓 / 双剑候选搜索正常（各 20 套展示、70 套完全符合），指定武器逻辑正常；
  - headless Chrome + CDP 冒烟 PASS：本地快照下首页 179 条技能渲染、数据源显示本地数据、自动配装出结果、配装器页面正常。
- 装备范围 + 综合评分（2026-11-18）：
  - 算法脚本 PASS（19 项检查）：上位 / 下位 / 不限三种范围的武器与防具全部符合范围；候选评分降序、0–100、分项 0–1 且与加权公式一致；指定武器强制生效且防具跟随范围；无完全符合时仍返回 20 套并按评分排序；
  - headless Chrome + CDP PASS：装备范围单选（默认不限）可切换，优先上位结果防具全为 high、武器 rarity ≥5，优先下位结果防具全为 low、武器 rarity ≤4；抽屉评分按降序展示；指定武器时装备范围自动跟随并禁用；
  - `pnpm type-check` / `pnpm build` / `pnpm format:check` 通过。
- 历史验证要点：系列 2 件 Lv1 / 4 件 Lv2、组技能 3 件；装饰品类型/孔位；存档跨数据源限制；在线失败与重试；复制文本含珠子；抽屉 20/10 数量与标签；排序规则。
- 没有单元测试框架（Vitest/ESLint 均未安装）；验证方式是临时脚本 + headless Chrome/CDP + 独立验收。后续建议补 Vitest（纯函数 `loadout-calc.ts` / `auto-build.ts` 很适合单测）。

---

## 12. 已知限制 / 可继续做的事

1. **自动配装候选同质化**：评分排序下，同技能水平的候选仍可能只差防御力；可在评分或 beam 排序中加入装备多样性惩罚。
2. **系列/组阈值硬编码**（2/4 件、3 件）：在线 API 有 `setPiecesRequired` 数据，可改为从数据读取以兼容未来版本。
3. **在线数据缓存**：目前仅内存缓存；本地快照可离线使用，但需手动 `pnpm sync:data` 更新（可在 CI / 发布前加同步步骤）。
4. **数据源切换后的存档迁移**：跨数据源存档目前直接禁用读取，可按装备名称做跨源映射。
5. **Element Plus 全量引入**：主包约 1 MB JS / 369 KB CSS；可改 unplugin 按需引入。
6. **无全局错误上报 / 无 i18n / 移动端仅做了基础响应式**。
7. **快照字段有限**：`MhWildsData` 只映射配装必需字段（武器面板、耐性、防御上限等尚未接入）；复刻 wiki-db 的「按耐性/技能需求穷举套装」搜索器需要先扩展适配器与类型再重新同步。现有快照已含武器 `rarity`、防具 `rank`（上下位）。
8. **未初始化 git**；提交前建议 `git init` + 首次提交（`.gitignore` 已就绪）。
9. **本地快照不会自动更新**：`pnpm sync:data` 需手动执行；忘记同步会导致本地/在线数据版本漂移（不影响使用，切换数据源时会分别加载）。

---

## 13. 环境与常见坑（Windows / 本机）

- **pnpm 脚本**：PowerShell 执行策略禁止 `.ps1`，必须用 `pnpm.cmd`（或 `cmd /c pnpm ...`）。
- **保留变量**：PowerShell 中 `$home`、`$pid` 是只读自动变量，脚本里不要给它们赋值。
- **文件锁 EIO**：编辑文件偶发 `ReplaceFileW EIO (Win32 1175/32)`，是短暂占用，等 2–4 秒重试即可。
- **Vite 监听**：默认只监听 `localhost`（IPv6 `::1`），用 `127.0.0.1` 可能连不上；开发时访问 `http://localhost:5173`。
- **端口占用**：5173 被旧进程占用时，`pnpm dev --port 5174`；清理旧进程需按端口找 PID 后 `Stop-Process`。
- **中文乱码**：pwsh 的 `Get-Content` 可能以 ANSI 解码 UTF-8 中文导致显示乱码，文件本身没问题；判断内容用 read 工具或 node 读取。
- **在线 API**：需要外网访问 `wilds.mhdb.io`；失败时错误提示会提示切回本地数据源。
- **数据同步脚本**：`scripts/sync-mh-wilds.mjs` 用 Vite `createServer` + `ssrLoadModule` 复用 TS 适配器；`pnpm sync:data` 需要外网，同步约 5–6 秒，失败或校验不通过时不会覆盖旧文件（先写 `.tmp` 再原子替换）。
- **Headless Chrome 测试**：Element Plus 所有 `el-select` 的 popper 会预渲染，查选项必须过滤 `offsetParent !== null`；点击前先 `scrollIntoView({ block: 'center' })`；Node 24 自带 `WebSocket` 可直连 CDP。
- **项目约定**：`AGENTS.md` 要求 Vue 开发前加载 `vue-best-practices`；组件样式不要写 `@use`（变量/混入已全局注入）；改完必须过 `type-check` 与 `format:check`。

---

## 14. 新窗口开工建议

1. 读 `AGENTS.md` + 本文档，了解约定与现状。
2. `pnpm install`（通常 Already up to date）→ `pnpm type-check` → `pnpm dev` 确认可运行；需要最新数据时先 `pnpm sync:data`。
3. 从「已知限制 / 可继续做的事」挑任务；涉及规则改动只改 `src/utils/loadout-calc.ts`，涉及自动配装只改 `src/utils/auto-build.ts`。
4. 改完执行 `pnpm type-check && pnpm build && pnpm format:check`；UI 改动建议用 headless Chrome/CDP 自测关键路径。
5. 若需要独立验收，可再派 verifier 子代理（只读、指定单独端口、临时脚本写 %TEMP%）。

---

## 15. 关键数据速查

本地快照与在线数据同源（2026-11-18 同步），规模一致：

| 项目   | 本地数据（快照）                                  | 在线数据（实时）    |
| ------ | ------------------------------------------------- | ------------------- |
| 武器   | 1188（下位 288 / 上位 900）                       | 同左（随版本更新）  |
| 技能   | 179                                               | 同左                |
| 防具   | 714（头 164 / 身 140 / 腕 135 / 腰 137 / 腿 138） | 同左                |
| 装饰品 | 361（武器珠 295 / 防具珠 66）                     | 同左                |
| 护石   | 183                                               | 同左                |
| 版本   | `2026-04-15T01:28:18+00:00`                       | 同左（以 API 为准） |

> 上下位：武器看 `rarity`（≤4 下位、≥5 上位），防具看 `rank`（low / high）。本地快照需要通过 `pnpm sync:data` 才会更新。

localStorage：

- `mh-wilds:data-source` → `local` / `online`
- `mh-wilds:builds:v1` → 配装存档数组
