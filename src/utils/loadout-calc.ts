import {
  GROUP_ACTIVE_PIECES,
  GROUP_SKILL_MAX,
  SERIES_SKILL_MAX,
  SKILL_CATEGORY_META,
  type GroupBonus,
  type SeriesBonus,
  type SkillSummaryItem,
  type SlotOwner,
} from '@/types/build'
import type {
  DataRank,
  MhArmor,
  MhDecoration,
  MhSkill,
  MhTalisman,
  MhWeapon,
  SkillLevelMap,
} from '@/types/mh-wilds'

/** 装饰品域：武器孔只接受 weapon 珠，防具 / 护石孔只接受 equip 珠 */
export type DecorationDomain = 'weapon' | 'equip'

/** 武器上下位：稀有度 ≤4 为下位、≥5 为上位（与数据源规则一致） */
export function rankForRarity(rarity: number): DataRank {
  return rarity <= 4 ? 'low' : 'high'
}

const DECORATION_DOMAIN: Record<SlotOwner, DecorationDomain> = {
  weapon: 'weapon',
  armor: 'equip',
  talisman: 'equip',
}

/** 孔位归属对应的装饰品域 */
export function decorationDomainForSlot(owner: SlotOwner): DecorationDomain {
  return DECORATION_DOMAIN[owner]
}

/** 装饰品能否放入该孔位：域一致且孔位等级足够 */
export function decorationFitsSlot(
  decoration: MhDecoration,
  slot: { owner: SlotOwner; level: number },
): boolean {
  return decoration.type === decorationDomainForSlot(slot.owner) && decoration.slot <= slot.level
}

/** 累加技能等级到 map */
export function addSkillLevels(
  target: Map<string, number>,
  skills: SkillLevelMap | undefined,
): void {
  if (!skills) return

  for (const [name, level] of Object.entries(skills)) {
    target.set(name, (target.get(name) ?? 0) + level)
  }
}

/** 装备（武器 + 防具 + 护石 + 装饰品）提供的技能等级，不含系列 / 组加成 */
export function collectEquipmentSkillLevels(parts: {
  weapon: MhWeapon | null
  armors: readonly (MhArmor | null)[]
  talisman: MhTalisman | null
  decorations: readonly MhDecoration[]
}): Map<string, number> {
  const levels = new Map<string, number>()

  addSkillLevels(levels, parts.weapon?.skills)
  for (const armor of parts.armors) addSkillLevels(levels, armor?.skills)
  addSkillLevels(levels, parts.talisman?.skills)
  for (const decoration of parts.decorations) addSkillLevels(levels, decoration.skills)

  return levels
}

/** 按件数计算系列技能等级：2 件 Lv1、4 件 Lv2 */
export function seriesLevelForPieces(pieces: number): number {
  if (pieces >= 4) return 2
  if (pieces >= 2) return 1
  return 0
}

/** 系列技能激活程度 */
export function calcSeriesBonuses(armors: readonly (MhArmor | null)[]): SeriesBonus[] {
  const pieces = new Map<string, number>()

  for (const armor of armors) {
    if (!armor) continue
    for (const name of Object.keys(armor.seriesSkills)) {
      pieces.set(name, (pieces.get(name) ?? 0) + 1)
    }
  }

  return [...pieces.entries()]
    .map(([name, count]) => {
      const level = seriesLevelForPieces(count)
      return { name, pieces: count, level, max: SERIES_SKILL_MAX, active: level > 0 }
    })
    .sort(
      (left, right) =>
        right.pieces - left.pieces || left.name.localeCompare(right.name, 'zh-Hans-CN'),
    )
}

/** 组技能激活程度（3 件生效） */
export function calcGroupBonuses(armors: readonly (MhArmor | null)[]): GroupBonus[] {
  const pieces = new Map<string, number>()

  for (const armor of armors) {
    if (!armor) continue
    for (const name of Object.keys(armor.groupSkills)) {
      pieces.set(name, (pieces.get(name) ?? 0) + 1)
    }
  }

  return [...pieces.entries()]
    .map(([name, count]) => ({ name, pieces: count, active: count >= GROUP_ACTIVE_PIECES }))
    .sort(
      (left, right) =>
        right.pieces - left.pieces || left.name.localeCompare(right.name, 'zh-Hans-CN'),
    )
}

/** 技能等级上限：系列 / 组技能按激活规则计算，其余取数据中的 max */
export function resolveSkillMax(skill: MhSkill | undefined, level: number): number {
  if (!skill) return level
  if (skill.category === 'series') return SERIES_SKILL_MAX
  if (skill.category === 'group') return GROUP_SKILL_MAX
  return skill.max
}

/**
 * 生成展示用技能合计：装备技能 + 已激活的系列 / 组技能。
 */
export function buildSkillSummaries(
  equipmentLevels: ReadonlyMap<string, number>,
  series: readonly SeriesBonus[],
  groups: readonly GroupBonus[],
  skillByName: ReadonlyMap<string, MhSkill>,
): SkillSummaryItem[] {
  const totals = new Map(equipmentLevels)

  for (const bonus of series) {
    if (bonus.level > 0) totals.set(bonus.name, (totals.get(bonus.name) ?? 0) + bonus.level)
  }
  for (const bonus of groups) {
    if (bonus.active) totals.set(bonus.name, (totals.get(bonus.name) ?? 0) + 1)
  }

  const items: SkillSummaryItem[] = []

  for (const [name, level] of totals) {
    const skill = skillByName.get(name)
    const category = skill?.category ?? 'equip'
    const max = resolveSkillMax(skill, level)

    items.push({
      name,
      level,
      max,
      category,
      maxed: level >= max,
      overflow: Math.max(0, level - max),
    })
  }

  return items.sort((left, right) => {
    const orderDiff =
      (SKILL_CATEGORY_META[left.category]?.order ?? 9) -
      (SKILL_CATEGORY_META[right.category]?.order ?? 9)
    return orderDiff !== 0 ? orderDiff : left.name.localeCompare(right.name, 'zh-Hans-CN')
  })
}
