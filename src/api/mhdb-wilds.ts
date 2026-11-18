import type { ArmorSlotLabel, MhArmor, MhWildsData, SkillCategory } from '@/types/mh-wilds'

/**
 * 在线数据源适配器：把 https://wilds.mhdb.io 的 API 响应映射为项目内部的
 * `MhWildsData` 模型，使配装器与自动配装无需感知数据来源差异。
 *
 * 使用的端点（locale = zh-Hans，均通过 `p` 参数做字段投影以减小体积）：
 * - /skills
 * - /weapons（1188 条，按 limit=1000 分页）
 * - /armor
 * - /decorations
 * - /charms
 * - /version（仅取数据版本）
 */

const MHDB_ORIGIN = 'https://wilds.mhdb.io'
const MHDB_LOCALE = 'zh-Hans'
const MHDB_BASE = `${MHDB_ORIGIN}/${MHDB_LOCALE}`
const PAGE_SIZE = 1000
const MAX_PAGES = 20

/** 武器类型枚举（API 不本地化） → 中文名称，顺序与本地数据保持一致 */
const WEAPON_KIND_LABELS: Record<string, string> = {
  'great-sword': '大剑',
  'long-sword': '太刀',
  'sword-shield': '单手剑',
  'dual-blades': '双剑',
  lance: '长枪',
  gunlance: '铳枪',
  hammer: '大锤',
  'hunting-horn': '狩猎笛',
  'switch-axe': '斩斧',
  'charge-blade': '盾斧',
  'insect-glaive': '操虫棍',
  'light-bowgun': '轻弩炮',
  'heavy-bowgun': '重弩炮',
  bow: '弓',
}

const WEAPON_TYPE_ORDER = [
  '大剑',
  '太刀',
  '单手剑',
  '双剑',
  '长枪',
  '铳枪',
  '大锤',
  '狩猎笛',
  '斩斧',
  '盾斧',
  '操虫棍',
  '轻弩炮',
  '重弩炮',
  '弓',
] as const

/** 防具部位 → 中文名（与本地数据的 slot 字段一致） */
const ARMOR_PART_LABELS: Record<'head' | 'chest' | 'arms' | 'waist' | 'legs', ArmorSlotLabel> = {
  head: '头',
  chest: '身',
  arms: '腕',
  waist: '腰',
  legs: '脚',
}

interface MhdbSkillRef {
  name?: string | null
  kind?: string | null
}

interface MhdbSkillRank {
  skill?: MhdbSkillRef | null
  level?: number | null
}

interface MhdbSkill {
  name: string
  kind: string
  description?: string | null
  ranks?: Array<{ level?: number | null }>
}

interface MhdbWeapon {
  name: string
  kind: string
  rarity?: number | null
  damage?: { raw?: number | null } | null
  slots?: number[]
  skills?: MhdbSkillRank[]
  series?: { name?: string | null } | null
}

interface MhdbArmor {
  id: number
  name: string
  kind: string
  rank?: string | null
  defense?: { base?: number | null; max?: number | null } | null
  slots?: number[]
  skills?: MhdbSkillRank[]
  armorSet?: { name?: string | null } | null
}

interface MhdbDecoration {
  name: string
  slot: number
  kind: string
  skills?: MhdbSkillRank[]
}

interface MhdbCharm {
  ranks?: Array<{
    name?: string | null
    level?: number | null
    skills?: MhdbSkillRank[]
  }>
}

const SKILL_KIND_CATEGORY: Record<string, SkillCategory> = {
  weapon: 'weapon',
  armor: 'equip',
  group: 'group',
  set: 'series',
}

/** 带 `p` 投影与分页的列表请求 */
async function fetchCollection<T>(path: string, projection: Record<string, unknown>): Promise<T[]> {
  const items: T[] = []
  const projectionValue = encodeURIComponent(JSON.stringify(projection))

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const offset = page * PAGE_SIZE
    const url = `${MHDB_BASE}/${path}?limit=${PAGE_SIZE}&offset=${offset}&p=${projectionValue}`

    let response: Response
    try {
      response = await fetch(url)
    } catch {
      throw new Error(
        `在线数据请求失败（${path}）：无法连接 wilds.mhdb.io，请检查网络后重试，或切换到本地数据源`,
      )
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(
        `在线数据请求失败（${path}，HTTP ${response.status}）${detail ? `：${detail.slice(0, 160)}` : ''}`,
      )
    }

    const payload: unknown = await response.json()
    if (!Array.isArray(payload)) {
      throw new Error(`在线数据格式异常（${path}）：期望数组响应`)
    }

    items.push(...(payload as T[]))
    if (payload.length < PAGE_SIZE) break
  }

  return items
}

/** 读取在线数据版本时间戳（失败时返回空字符串，不影响主流程） */
async function fetchVersion(): Promise<string> {
  try {
    const response = await fetch(`${MHDB_ORIGIN}/version`)
    if (!response.ok) return ''
    const payload: unknown = await response.json()
    const version = (payload as { version?: unknown } | null)?.version
    return typeof version === 'string' ? version : ''
  } catch {
    return ''
  }
}

/** 技能等级列表 → `技能名: 等级` 映射 */
function ranksToSkillLevels(ranks: MhdbSkillRank[] | undefined): Record<string, number> {
  const levels: Record<string, number> = {}

  for (const rank of ranks ?? []) {
    const name = rank.skill?.name
    const level = rank.level ?? 0
    if (!name || level <= 0) continue
    levels[name] = (levels[name] ?? 0) + level
  }

  return levels
}

/** 指定 kind 的技能等级条目 → `技能名: 1` 的归属映射（系列 / 组技能） */
function ranksToMembership(
  ranks: MhdbSkillRank[] | undefined,
  kind: 'set' | 'group',
): Record<string, number> {
  const membership: Record<string, number> = {}

  for (const rank of ranks ?? []) {
    if (rank.skill?.kind !== kind) continue
    const name = rank.skill.name
    if (name) membership[name] = 1
  }

  return membership
}

/**
 * 加载在线数据并转换为内部模型。
 *
 * 说明：
 * - 系列 / 组技能归属直接从防具的 `skills` 条目（kind=set / group）推导，
 *   比通过 `/armor/sets` 反推更贴合游戏内实际部件归属；
 * - 武器保留 `rarity`（数据源规则：≤4 为下位、≥5 为上位），防具保留 `rank`（low / high）；
 * - 防具防御力取 `defense.base`；
 * - 护石按 `ranks` 展开（无技能的随机护石会被跳过）。
 */
export async function loadMhdbWildsData(): Promise<MhWildsData> {
  const [rawSkills, rawWeapons, rawArmor, rawDecorations, rawCharms, version] = await Promise.all([
    fetchCollection<MhdbSkill>('skills', {
      name: true,
      kind: true,
      description: true,
      'ranks.level': true,
    }),
    fetchCollection<MhdbWeapon>('weapons', {
      name: true,
      kind: true,
      rarity: true,
      'damage.raw': true,
      slots: true,
      'skills.skill.name': true,
      'skills.skill.kind': true,
      'skills.level': true,
      'series.name': true,
    }),
    fetchCollection<MhdbArmor>('armor', {
      name: true,
      kind: true,
      'defense.base': true,
      'defense.max': true,
      rank: true,
      slots: true,
      'skills.skill.name': true,
      'skills.skill.kind': true,
      'skills.level': true,
      'armorSet.name': true,
      id: true,
    }),
    fetchCollection<MhdbDecoration>('decorations', {
      name: true,
      slot: true,
      kind: true,
      'skills.skill.name': true,
      'skills.level': true,
    }),
    fetchCollection<MhdbCharm>('charms', {
      'ranks.name': true,
      'ranks.level': true,
      'ranks.skills.skill.name': true,
      'ranks.skills.level': true,
    }),
    fetchVersion(),
  ])

  const skills = rawSkills.map((skill) => ({
    id: skill.name,
    name: skill.name,
    max: Math.max(1, skill.ranks?.length ?? 1),
    explain: skill.description ?? '',
    category: SKILL_KIND_CATEGORY[skill.kind] ?? 'equip',
    deco: 0,
  }))

  const weapons = rawWeapons.map((weapon) => ({
    name: weapon.name,
    type: (WEAPON_KIND_LABELS[weapon.kind] ??
      weapon.kind) as MhWildsData['weapons'][number]['type'],
    rarity: weapon.rarity ?? 0,
    attack: weapon.damage?.raw ?? 0,
    skills: ranksToSkillLevels(weapon.skills),
    slots: weapon.slots ?? [],
    series: weapon.series?.name ?? '',
  }))

  const armorByPart: MhWildsData['armors'] = {
    head: rawArmor.filter((armor) => armor.kind === 'head').map((armor) => toArmor(armor, 'head')),
    chest: rawArmor
      .filter((armor) => armor.kind === 'chest')
      .map((armor) => toArmor(armor, 'chest')),
    arms: rawArmor.filter((armor) => armor.kind === 'arms').map((armor) => toArmor(armor, 'arms')),
    waist: rawArmor
      .filter((armor) => armor.kind === 'waist')
      .map((armor) => toArmor(armor, 'waist')),
    legs: rawArmor.filter((armor) => armor.kind === 'legs').map((armor) => toArmor(armor, 'legs')),
  }

  const decorations = rawDecorations.map((decoration) => ({
    name: decoration.name,
    slot: decoration.slot,
    type: (decoration.kind === 'armor'
      ? 'equip'
      : 'weapon') as MhWildsData['decorations'][number]['type'],
    skills: ranksToSkillLevels(decoration.skills),
  }))

  const talismans: MhWildsData['talismans'] = []
  for (const charm of rawCharms) {
    for (const rank of charm.ranks ?? []) {
      const skillsOfRank = ranksToSkillLevels(rank.skills)
      if (!Object.keys(skillsOfRank).length) continue
      talismans.push({
        name: rank.name ?? `护石 Lv${rank.level ?? 1}`,
        type: 'equip',
        skills: skillsOfRank,
        slots: [],
      })
    }
  }

  const presentTypes = new Set(weapons.map((weapon) => weapon.type))
  const weaponTypes = WEAPON_TYPE_ORDER.filter((type) =>
    presentTypes.has(type),
  ) as MhWildsData['weaponTypes']

  return {
    source: MHDB_BASE,
    game: 'wilds',
    version: version || 'online',
    generatedAt: version || new Date().toISOString(),
    counts: {
      weapons: weapons.length,
      skills: skills.length,
      decorations: decorations.length,
      armors: rawArmor.length,
      talismans: talismans.length,
    },
    weaponTypes,
    skills,
    armors: armorByPart,
    decorations,
    weapons,
    talismans,
  }
}

function toArmor(armor: MhdbArmor, part: 'head' | 'chest' | 'arms' | 'waist' | 'legs'): MhArmor {
  return {
    name: armor.name,
    slot: ARMOR_PART_LABELS[part],
    part,
    skills: ranksToSkillLevels((armor.skills ?? []).filter((rank) => rank.skill?.kind === 'armor')),
    seriesSkills: ranksToMembership(armor.skills, 'set'),
    groupSkills: ranksToMembership(armor.skills, 'group'),
    slots: armor.slots ?? [],
    defense: armor.defense?.base ?? armor.defense?.max ?? 0,
    rank: armor.rank === 'low' || armor.rank === 'high' ? armor.rank : '',
    series: armor.armorSet?.name ?? '',
  }
}
