import {
  ARMOR_PART_META,
  GROUP_ACTIVE_PIECES,
  SKILL_CATEGORY_META,
  type LoadoutSelection,
} from '@/types/build'
import type {
  AutoBuildCandidate,
  AutoBuildCandidatesResult,
  AutoBuildInput,
  AutoBuildResult,
  AutoBuildScoreBreakdown,
  RankScope,
  SkillProgress,
} from '@/types/auto-build'
import type {
  MhArmor,
  MhDecoration,
  MhSkill,
  MhTalisman,
  MhWeapon,
  MhWildsData,
} from '@/types/mh-wilds'
import {
  addSkillLevels,
  buildSkillSummaries,
  calcGroupBonuses,
  calcSeriesBonuses,
  collectEquipmentSkillLevels,
  decorationDomainForSlot,
  decorationFitsSlot,
  rankForRarity,
  resolveSkillMax,
  type DecorationDomain,
} from './loadout-calc'

/** 每点目标技能等级的权重 */
const SKILL_LEVEL_WEIGHT = 10
/** 首次覆盖某个目标技能的额外权重（优先满足「包含技能」） */
const COVERAGE_BONUS = 6
/** 每个孔位潜在贡献的权重 */
const SLOT_LEVEL_WEIGHT = 3
/** 系列 / 组技能每推进一档的总权重（2 件或 4 件 / 3 件） */
const BONUS_PROGRESS_WEIGHT = 40

/** 防具搜索的 beam 宽度 */
const BEAM_WIDTH = 14
/** 每个部位进入 beam 的候选数量 */
const ARMOR_CANDIDATES_PER_PART = 6
/** 参与搜索的武器数量 */
const WEAPON_CANDIDATES = 5
/** 默认展示的配装数量 */
const DEFAULT_CANDIDATE_LIMIT = 20

/**
 * 综合评分权重：攻击力 / 防御力 / 技能完整度 / 技能等级。
 * 技能相关的两项权重更高（自动配装的目标是满足技能需求），攻击与防御用来区分同技能水平的配装。
 */
const SCORE_WEIGHTS = {
  attack: 0.2,
  defense: 0.2,
  skillCoverage: 0.3,
  skillLevel: 0.3,
} as const

/** 武器是否属于指定装备范围 */
function weaponInScope(weapon: MhWeapon, rankScope: RankScope): boolean {
  return rankScope === 'any' || rankForRarity(weapon.rarity) === rankScope
}

/** 防具是否属于指定装备范围（数据缺失 rank 的防具仅在「不限」时参与） */
function armorInScope(armor: MhArmor, rankScope: RankScope): boolean {
  return rankScope === 'any' || armor.rank === rankScope
}

interface DecorationCandidate {
  index: number
  decoration: MhDecoration
}

interface BuildContext {
  data: MhWildsData
  /** 目标技能名 → 目标等级 */
  target: Map<string, number>
  /** 当前已获得技能名 → 等级 */
  current: Map<string, number>
  skillByName: Map<string, MhSkill>
  decorations: Record<DecorationDomain, DecorationCandidate[]>
}

interface SlotRef {
  id: string
  owner: 'weapon' | 'armor'
  level: number
}

interface ArmorState {
  armors: MhArmor[]
  score: number
}

/** 当前还需要多少级目标技能 */
function needOf(context: BuildContext, name: string): number {
  return Math.max(0, (context.target.get(name) ?? 0) - (context.current.get(name) ?? 0))
}

/** 评估一组技能能带来的分数（等级 + 首次覆盖奖励） */
function scoreSkills(
  context: BuildContext,
  skills: Readonly<Record<string, number>> | undefined,
): number {
  if (!skills) return 0

  let score = 0

  for (const [name, level] of Object.entries(skills)) {
    const need = needOf(context, name)
    if (need <= 0) continue

    const gained = Math.min(level, need)
    score += gained * SKILL_LEVEL_WEIGHT
    if ((context.current.get(name) ?? 0) === 0) score += COVERAGE_BONUS
  }

  return score
}

/**
 * 孔位潜力：按孔位等级从高到低，估算每个孔位能提供的最大目标技能等级数。
 * 只做粗略上界（同一技能跨孔位不共享），用于比较装备的孔位价值。
 */
function scoreSlots(
  context: BuildContext,
  slots: readonly number[],
  domain: DecorationDomain,
): number {
  if (!slots.length) return 0

  const localNeed = new Map<string, number>()
  for (const [name, target] of context.target) {
    localNeed.set(name, Math.max(0, target - (context.current.get(name) ?? 0)))
  }

  let total = 0

  for (const level of [...slots].sort((left, right) => right - left)) {
    let best = 0

    for (const candidate of context.decorations[domain]) {
      if (candidate.decoration.slot > level) continue

      let gained = 0
      for (const [name, value] of Object.entries(candidate.decoration.skills)) {
        gained += Math.min(value, localNeed.get(name) ?? 0)
      }

      if (gained > best) best = gained
    }

    total += best
  }

  return total
}

/** 系列技能推进分数：先保证件数进度，达到目标后退化为 0 */
function scoreSeriesProgress(
  context: BuildContext,
  armor: MhArmor,
  seriesCounts: ReadonlyMap<string, number>,
): number {
  let score = 0

  for (const name of Object.keys(armor.seriesSkills)) {
    const target = context.target.get(name) ?? 0
    if (target <= 0) continue

    const neededPieces = target >= 2 ? 4 : 2
    const before = Math.min(seriesCounts.get(name) ?? 0, neededPieces)
    const after = Math.min((seriesCounts.get(name) ?? 0) + 1, neededPieces)
    score += ((after - before) / neededPieces) * BONUS_PROGRESS_WEIGHT
  }

  return score
}

function scoreGroupProgress(
  context: BuildContext,
  armor: MhArmor,
  groupCounts: ReadonlyMap<string, number>,
): number {
  let score = 0

  for (const name of Object.keys(armor.groupSkills)) {
    const target = context.target.get(name) ?? 0
    if (target <= 0) continue

    const before = Math.min(groupCounts.get(name) ?? 0, GROUP_ACTIVE_PIECES)
    const after = Math.min((groupCounts.get(name) ?? 0) + 1, GROUP_ACTIVE_PIECES)
    score += ((after - before) / GROUP_ACTIVE_PIECES) * BONUS_PROGRESS_WEIGHT
  }

  return score
}

function countSeries(armors: readonly MhArmor[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const armor of armors) {
    for (const name of Object.keys(armor.seriesSkills)) {
      counts.set(name, (counts.get(name) ?? 0) + 1)
    }
  }
  return counts
}

function countGroups(armors: readonly MhArmor[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const armor of armors) {
    for (const name of Object.keys(armor.groupSkills)) {
      counts.set(name, (counts.get(name) ?? 0) + 1)
    }
  }
  return counts
}

/** 按类别上限归一化目标等级，过滤无效需求 */
function normalizeRequirements(data: MhWildsData, input: AutoBuildInput): Map<string, number> {
  const skillByName = new Map(data.skills.map((skill) => [skill.name, skill]))
  const target = new Map<string, number>()

  for (const requirement of input.requirements) {
    const skill = skillByName.get(requirement.name)
    if (!skill) continue

    const max = resolveSkillMax(skill, requirement.level)
    const level = Math.min(Math.max(0, Math.trunc(requirement.level)), max)
    if (level > 0) target.set(requirement.name, level)
  }

  return target
}

function createSelection(): LoadoutSelection {
  return {
    weaponIndex: null,
    armorIndices: { head: null, chest: null, arms: null, waist: null, legs: null },
    talismanIndex: null,
    decorationIndices: {},
  }
}

function createContext(data: MhWildsData, target: Map<string, number>): BuildContext {
  const decorationEntries = data.decorations.map((decoration, index) => ({ index, decoration }))

  return {
    data,
    target,
    current: new Map(),
    skillByName: new Map(data.skills.map((skill) => [skill.name, skill])),
    decorations: {
      weapon: decorationEntries.filter((entry) => entry.decoration.type === 'weapon'),
      equip: decorationEntries.filter((entry) => entry.decoration.type === 'equip'),
    },
  }
}

function applyEquipmentSkills(
  context: BuildContext,
  weapon: MhWeapon | null,
  armors: readonly MhArmor[],
): void {
  addSkillLevels(context.current, weapon?.skills)
  for (const armor of armors) addSkillLevels(context.current, armor.skills)
}

function buildSlots(weapon: MhWeapon | null, armors: readonly (MhArmor | null)[]): SlotRef[] {
  const slots: SlotRef[] = []

  weapon?.slots.forEach((level, index) => {
    slots.push({ id: `weapon:${index}`, owner: 'weapon', level })
  })

  ARMOR_PART_META.forEach((meta, partIndex) => {
    armors[partIndex]?.slots.forEach((level, index) => {
      slots.push({ id: `${meta.part}:${index}`, owner: 'armor', level })
    })
  })

  return slots
}

function fillDecorations(
  context: BuildContext,
  selection: LoadoutSelection,
  weapon: MhWeapon | null,
  armors: readonly (MhArmor | null)[],
): number {
  const slots = buildSlots(weapon, armors).sort((left, right) => right.level - left.level)
  let filled = 0

  for (const slot of slots) {
    const domain = decorationDomainForSlot(slot.owner)

    let best: DecorationCandidate | null = null
    let bestGained = 0
    let bestMatch = -1

    for (const candidate of context.decorations[domain]) {
      const { decoration } = candidate
      if (!decorationFitsSlot(decoration, slot)) continue

      let gained = 0
      for (const [name, level] of Object.entries(decoration.skills)) {
        gained += Math.min(level, needOf(context, name))
      }
      if (gained <= 0) continue

      const match = decoration.slot === slot.level ? 1 : 0
      if (gained > bestGained || (gained === bestGained && match > bestMatch)) {
        best = candidate
        bestGained = gained
        bestMatch = match
      }
    }

    if (!best) continue

    selection.decorationIndices[slot.id] = best.index
    addSkillLevels(context.current, best.decoration.skills)
    filled += 1
  }

  return filled
}

function pickTalisman(context: BuildContext): MhTalisman | null {
  let best: MhTalisman | null = null
  let bestScore = 0

  for (const talisman of context.data.talismans) {
    const score = scoreSkills(context, talisman.skills)
    if (score > bestScore) {
      best = talisman
      bestScore = score
    }
  }

  return best
}

/** 武器候选：按目标技能匹配 + 孔位潜力排序，取前若干个参与组合搜索 */
function rankWeapons(
  data: MhWildsData,
  target: Map<string, number>,
  weaponType: string,
  rankScope: RankScope,
): MhWeapon[] {
  const context = createContext(data, target)

  return data.weapons
    .filter((weapon) => weapon.type === weaponType && weaponInScope(weapon, rankScope))
    .map((weapon) => ({
      weapon,
      score:
        scoreSkills(context, weapon.skills) +
        scoreSlots(context, weapon.slots, 'weapon') * SLOT_LEVEL_WEIGHT,
    }))
    .sort(
      (left, right) =>
        right.score - left.score || right.weapon.slots.length - left.weapon.slots.length,
    )
    .slice(0, WEAPON_CANDIDATES)
    .map((entry) => entry.weapon)
}

/**
 * 参与搜索的武器列表：
 * - 指定了武器（`input.weaponIndex`）且下标有效、类型匹配时，只搜索该武器
 *   （指定武器以用户选择为准，不再受装备范围限制）；
 * - 否则按装备范围过滤后，按目标技能与孔位潜力排序，取前若干把参与组合搜索。
 */
function resolveWeapons(
  data: MhWildsData,
  target: Map<string, number>,
  input: AutoBuildInput,
): MhWeapon[] {
  const forcedIndex = input.weaponIndex

  if (typeof forcedIndex === 'number') {
    const forcedWeapon = data.weapons[forcedIndex]
    if (forcedWeapon && forcedWeapon.type === input.weaponType) return [forcedWeapon]
  }

  return rankWeapons(data, target, input.weaponType, input.rankScope ?? 'any')
}

/**
 * 防具组合的 beam search：逐部位扩展候选组合，保留分数最高的若干条路径。
 * 返回按部位顺序排列的防具组合（每个组合 5 件）。
 */
function buildArmorVariants(
  data: MhWildsData,
  target: Map<string, number>,
  weapon: MhWeapon,
  rankScope: RankScope,
): MhArmor[][] {
  let beam: ArmorState[] = [{ armors: [], score: 0 }]

  for (const meta of ARMOR_PART_META) {
    const expanded: ArmorState[] = []

    // 按装备范围过滤防具；数据异常导致该部位无可用防具时退回全部（避免搜索直接失败）
    const scopedArmors = data.armors[meta.part].filter((armor) => armorInScope(armor, rankScope))
    const armorPool = scopedArmors.length ? scopedArmors : data.armors[meta.part]

    for (const state of beam) {
      const context = createContext(data, target)
      applyEquipmentSkills(context, weapon, state.armors)

      const seriesCounts = countSeries(state.armors)
      const groupCounts = countGroups(state.armors)

      const scored = armorPool
        .map((armor) => ({
          armor,
          score:
            scoreSkills(context, armor.skills) +
            scoreSlots(context, armor.slots, 'equip') * SLOT_LEVEL_WEIGHT +
            scoreSeriesProgress(context, armor, seriesCounts) +
            scoreGroupProgress(context, armor, groupCounts),
        }))
        .sort((left, right) => right.score - left.score)
        .slice(0, ARMOR_CANDIDATES_PER_PART)

      for (const entry of scored) {
        expanded.push({
          armors: [...state.armors, entry.armor],
          score: state.score + entry.score,
        })
      }
    }

    expanded.sort((left, right) => right.score - left.score)
    beam = expanded.slice(0, BEAM_WIDTH)
  }

  return beam.map((state) => state.armors)
}

/** 配装选择的唯一签名，用于去重 */
function selectionSignature(selection: LoadoutSelection): string {
  const armorPart = ARMOR_PART_META.map((meta) => selection.armorIndices[meta.part] ?? '-').join(
    ',',
  )
  const decorations = Object.entries(selection.decorationIndices)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([slotId, index]) => `${slotId}:${index}`)
    .join('|')
  return `${selection.weaponIndex ?? '-'}/${armorPart}/${selection.talismanIndex ?? '-'}/${decorations}`
}

/** 候选池内 min-max 归一化到 0-1；池内取值完全相同时视为同等优秀（1） */
function normalizeInPool(value: number, min: number, max: number): number {
  if (max <= min) return 1
  return Math.min(1, Math.max(0, (value - min) / (max - min)))
}

/** 技能完整度：完全满足的目标技能数 / 目标技能总数（0-1） */
function skillCoverageOf(result: AutoBuildResult): number {
  return result.totalSkills > 0 ? result.satisfiedSkills / result.totalSkills : 1
}

/** 技能等级达成率：已达成等级 / 目标等级（0-1） */
function skillLevelOf(result: AutoBuildResult): number {
  return result.targetLevels > 0 ? result.achievedLevels / result.targetLevels : 1
}

/**
 * 计算综合评分（0-100）并写回候选。
 *
 * 四个维度：武器攻击力、全套防具防御力、目标技能完整度、目标技能等级；
 * 攻击 / 防御在候选池内做 min-max 归一化，技能两项本身即 0-1，权重见 `SCORE_WEIGHTS`。
 */
function applyScores(data: MhWildsData, candidates: AutoBuildCandidate[]): void {
  if (!candidates.length) return

  const attacks = candidates.map((candidate) => {
    const weaponIndex = candidate.selection.weaponIndex
    return weaponIndex === null ? 0 : (data.weapons[weaponIndex]?.attack ?? 0)
  })
  const minAttack = Math.min(...attacks)
  const maxAttack = Math.max(...attacks)
  const minDefense = Math.min(...candidates.map((candidate) => candidate.defense))
  const maxDefense = Math.max(...candidates.map((candidate) => candidate.defense))

  candidates.forEach((candidate, index) => {
    const breakdown: AutoBuildScoreBreakdown = {
      attack: normalizeInPool(attacks[index], minAttack, maxAttack),
      defense: normalizeInPool(candidate.defense, minDefense, maxDefense),
      skillCoverage: skillCoverageOf(candidate),
      skillLevel: skillLevelOf(candidate),
    }
    const weighted =
      breakdown.attack * SCORE_WEIGHTS.attack +
      breakdown.defense * SCORE_WEIGHTS.defense +
      breakdown.skillCoverage * SCORE_WEIGHTS.skillCoverage +
      breakdown.skillLevel * SCORE_WEIGHTS.skillLevel
    candidate.scoreBreakdown = breakdown
    candidate.score = Math.round(weighted * 1000) / 10
  })
}

/** 按综合评分降序排列；同分时依次比较完全符合、技能满足数、等级达成、防御力 */
function compareCandidates(left: AutoBuildCandidate, right: AutoBuildCandidate): number {
  return (
    right.score - left.score ||
    Number(right.fullySatisfied) - Number(left.fullySatisfied) ||
    right.satisfiedSkills - left.satisfiedSkills ||
    right.achievedLevels - left.achievedLevels ||
    right.defense - left.defense
  )
}

/**
 * 根据配装选择汇总结果（技能达成、防御、说明）。
 * 供单套贪心结果与多套候选结果共用。
 */
function buildResult(
  data: MhWildsData,
  input: AutoBuildInput,
  selection: LoadoutSelection,
): AutoBuildResult {
  const weapon =
    selection.weaponIndex === null ? null : (data.weapons[selection.weaponIndex] ?? null)
  const armors = ARMOR_PART_META.map((meta) => {
    const index = selection.armorIndices[meta.part]
    return index === null ? null : (data.armors[meta.part][index] ?? null)
  })
  const talisman =
    selection.talismanIndex === null ? null : (data.talismans[selection.talismanIndex] ?? null)
  const decorations = Object.entries(selection.decorationIndices)
    .map(([, index]) => data.decorations[index])
    .filter((decoration): decoration is MhDecoration => Boolean(decoration))

  const skillByName = new Map(data.skills.map((skill) => [skill.name, skill]))
  const series = calcSeriesBonuses(armors)
  const groups = calcGroupBonuses(armors)
  const summaries = buildSkillSummaries(
    collectEquipmentSkillLevels({ weapon, armors, talisman, decorations }),
    series,
    groups,
    skillByName,
  )
  const levelByName = new Map(summaries.map((summary) => [summary.name, summary.level]))

  const requirements = [...input.requirements].sort((left, right) => {
    const leftOrder = SKILL_CATEGORY_META[left.category]?.order ?? 9
    const rightOrder = SKILL_CATEGORY_META[right.category]?.order ?? 9
    return leftOrder !== rightOrder
      ? leftOrder - rightOrder
      : left.name.localeCompare(right.name, 'zh-Hans-CN')
  })

  const skills: SkillProgress[] = requirements.map((requirement) => {
    const skill = skillByName.get(requirement.name)
    const targetLevel = Math.min(requirement.level, resolveSkillMax(skill, requirement.level))
    const rawLevel = levelByName.get(requirement.name) ?? 0
    const max = resolveSkillMax(skill, rawLevel)
    // 超过技能上限的等级在游戏内不生效，按实际上限计算
    const level = Math.min(rawLevel, max)

    return {
      name: requirement.name,
      target: targetLevel,
      level,
      max,
      category: skill?.category ?? requirement.category,
      satisfied: level >= targetLevel,
    }
  })

  const satisfiedSkills = skills.filter((skill) => skill.satisfied).length
  const achievedLevels = skills.reduce(
    (total, skill) => total + Math.min(skill.level, skill.target),
    0,
  )
  const targetLevels = skills.reduce((total, skill) => total + skill.target, 0)
  const defense = armors.reduce((total, armor) => total + (armor?.defense ?? 0), 0)

  const notes: string[] = []
  const rankScope = input.rankScope ?? 'any'
  const rankLabel = rankScope === 'any' ? '不限' : rankScope === 'high' ? '上位' : '下位'
  notes.push(`装备范围：${rankLabel}${rankScope === 'any' ? '' : '（武器与防具）'}`)
  const forcedWeapon =
    typeof input.weaponIndex === 'number' && input.weaponIndex === selection.weaponIndex
  if (weapon) {
    notes.push(
      `武器：${weapon.name}（${weapon.type}，${weapon.slots.length} 孔位${forcedWeapon ? '，已指定' : ''}）`,
    )
  } else {
    notes.push(`未找到类型为「${input.weaponType}」的武器`)
  }
  notes.push(`防具：${armors.filter((armor) => armor !== null).length} 件（优先目标技能与孔位）`)
  notes.push(`装饰品：镶嵌 ${decorations.length} 颗（优先补足目标技能等级）`)

  const unsatisfied = skills.filter((skill) => !skill.satisfied).map((skill) => skill.name)
  if (talisman) {
    notes.push(`护石：${talisman.name}（用于补足剩余技能）`)
  } else if (unsatisfied.length === 0) {
    notes.push('护石：无需护石即可达成全部目标')
  } else {
    notes.push(`护石：没有可补足剩余目标（${unsatisfied.join('、')}）的护石`)
  }

  return {
    selection,
    skills,
    satisfiedSkills,
    totalSkills: skills.length,
    achievedLevels,
    targetLevels,
    defense,
    score: 0,
    scoreBreakdown: { attack: 0, defense: 0, skillCoverage: 0, skillLevel: 0 },
    notes,
  }
}

/**
 * 生成多套候选配装。
 *
 * 搜索过程：确定候选武器（指定武器时只搜该武器，否则按装备范围与类型筛选并排序取前若干把）→
 * 每把武器在装备范围内的防具上做 beam search → 每条组合补齐装饰品与护石 →
 * 汇总后按四维综合评分（攻击力 / 防御力 / 技能完整度 / 技能等级）降序排列。
 * 展示数量固定为 `limit`（默认 20），不再强制「完全符合优先」；
 * `fullySatisfiedCount` 仍返回完全符合目标的配装总数供界面提示。
 */
export function autoBuildCandidates(
  data: MhWildsData,
  input: AutoBuildInput,
  options: { limit?: number } = {},
): AutoBuildCandidatesResult {
  const limit = Math.max(1, options.limit ?? DEFAULT_CANDIDATE_LIMIT)
  const rankScope = input.rankScope ?? 'any'
  const target = normalizeRequirements(data, input)
  const candidates: AutoBuildCandidate[] = []
  const seen = new Set<string>()

  for (const weapon of resolveWeapons(data, target, input)) {
    const weaponIndex = data.weapons.indexOf(weapon)

    for (const armors of buildArmorVariants(data, target, weapon, rankScope)) {
      const selection = createSelection()
      selection.weaponIndex = weaponIndex

      ARMOR_PART_META.forEach((meta, index) => {
        selection.armorIndices[meta.part] = data.armors[meta.part].indexOf(armors[index])
      })

      const context = createContext(data, target)
      applyEquipmentSkills(context, weapon, armors)
      fillDecorations(context, selection, weapon, armors)

      const talisman = pickTalisman(context)
      if (talisman) {
        selection.talismanIndex = data.talismans.indexOf(talisman)
        addSkillLevels(context.current, talisman.skills)
      }

      const signature = selectionSignature(selection)
      if (seen.has(signature)) continue
      seen.add(signature)

      const result = buildResult(data, input, selection)
      candidates.push({
        ...result,
        fullySatisfied: result.totalSkills > 0 && result.satisfiedSkills === result.totalSkills,
      })
    }
  }

  applyScores(data, candidates)
  candidates.sort(compareCandidates)

  const fullySatisfiedCount = candidates.filter((candidate) => candidate.fullySatisfied).length

  return {
    candidates: candidates.slice(0, limit),
    fullySatisfiedCount,
    totalCandidates: candidates.length,
  }
}

/**
 * 单套自动配装（保留原有接口）：返回多套候选中的最优一套。
 */
export function autoBuildLoadout(data: MhWildsData, input: AutoBuildInput): AutoBuildResult {
  const { candidates } = autoBuildCandidates(data, input, { limit: 1 })
  return candidates[0] ?? buildResult(data, input, createSelection())
}
