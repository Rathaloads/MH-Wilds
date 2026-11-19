import type { ArmorPart, DataRank, SkillCategory, SkillLevelMap } from './mh-wilds'

/** 孔位所属装备类型 */
export type SlotOwner = 'weapon' | 'armor' | 'talisman'

/** 一个可镶嵌的孔位 */
export interface SlotDescriptor {
  /** 槽位 id，形如 `weapon:0` / `head:1` / `talisman:0` */
  id: string
  owner: SlotOwner
  /** 防具部位（仅 owner 为 armor 时有值） */
  part: ArmorPart | null
  /** 孔位等级（1-3） */
  level: number
}

/** 配装选择：使用数据数组下标保存，避免同名装备歧义 */
export interface LoadoutSelection {
  weaponIndex: number | null
  armorIndices: Record<ArmorPart, number | null>
  talismanIndex: number | null
  /** 槽位 id → 装饰品在 `data.decorations` 中的下标 */
  decorationIndices: Record<string, number>
}

/** 技能合计中的一行 */
export interface SkillSummaryItem {
  name: string
  level: number
  max: number
  category: SkillCategory
  /** 是否达到上限 */
  maxed: boolean
  /** 超出上限的等级数（多余等级不会生效） */
  overflow: number
}

/** 系列技能（套装技能）：2 件生效 Lv1，4 件生效 Lv2 */
export interface SeriesBonus {
  name: string
  pieces: number
  level: number
  max: number
  active: boolean
}

/** 组技能：3 件同组装备生效 */
export interface GroupBonus {
  name: string
  pieces: number
  active: boolean
}

/** 配装合计中的防御力明细行（每个防具部位一行） */
export interface DefenseBreakdownItem {
  part: ArmorPart
  /** 展示用部位名，如「头部」 */
  label: string
  /** 防具名称（未选择时为空字符串） */
  name: string
  /** 防御力（未选择时为 null） */
  defense: number | null
}

/** 配装合计结果 */
export interface LoadoutSummary {
  /** 武器名称（未选择时为空字符串） */
  weaponName: string
  /** 武器攻击力（未选择武器时为 0） */
  weaponAttack: number
  /** 各防具部位防御力明细 */
  defenseBreakdown: DefenseBreakdownItem[]
  skills: SkillSummaryItem[]
  series: SeriesBonus[]
  groups: GroupBonus[]
  defense: number
  totalSlots: number
  usedSlots: number
}

/** 装备详情（配装器装备卡片「详情」弹窗） */
export interface EquipmentDetail {
  kind: 'weapon' | 'armor' | 'talisman'
  /** 展示用部位名：武器 / 头部 / 护石 */
  label: string
  name: string
  /** 武器类型 / 部位 / 护石 */
  tag: string
  /** 上下位（武器 / 防具才有） */
  rank: DataRank | ''
  /** 稀有度（武器 / 防具才有） */
  rarity: number | null
  /** 攻击力（仅武器） */
  attack: number | null
  /** 防御力（仅防具） */
  defense: number | null
  /** 所属系列（可能为空） */
  series: string
  slots: number[]
  skills: SkillLevelMap
  /** 系列技能归属（仅防具） */
  seriesSkills: SkillLevelMap
  /** 组技能归属（仅防具） */
  groupSkills: SkillLevelMap
}

/** 选择弹窗中的一行候选装备 */
export interface PickerItem {
  index: number
  title: string
  /** 装备类型（武器类型 / 部位），用于标签过滤 */
  tag: string
  skills: SkillLevelMap
  slots: number[]
  defense: number | null
}

/** 装饰品候选 */
export interface DecorationOption {
  index: number
  name: string
  /** 所需孔位等级 */
  slot: number
  skills: SkillLevelMap
}

/** 装备名称快照：用于数据重新同步（数组顺序 / 内容变化）后按名称还原配装 */
export interface EquipmentSnapshot {
  weapon: string | null
  armors: Record<ArmorPart, string | null>
  talisman: string | null
  /** 槽位 id → 装饰品名称 */
  decorations: Record<string, string>
}

/** 已保存的配装 */
export interface SavedBuild {
  id: string
  name: string
  createdAt: number
  selection: LoadoutSelection
  /** 保存时的装备名称快照（用于数据更新后按名称还原） */
  members?: EquipmentSnapshot
}

/** 装备卡片展示数据 */
export interface EquipmentCardItem {
  name: string
  tag: string
  skills: SkillLevelMap
  slots: number[]
  defense: number | null
}

/** 孔位分组（武器 / 防具部位 / 护石） */
export interface SlotGroup {
  key: string
  label: string
  slots: SlotDescriptor[]
}

/** 防具部位元信息 */
export interface ArmorPartMeta {
  part: ArmorPart
  /** 展示用部位名 */
  label: string
  /** 数据中的 slot 字段值，如「头」 */
  slotLabel: string
}

/** 防具五部位 */
export const ARMOR_PART_META: ArmorPartMeta[] = [
  { part: 'head', label: '头部', slotLabel: '头' },
  { part: 'chest', label: '胸部', slotLabel: '身' },
  { part: 'arms', label: '腕部', slotLabel: '腕' },
  { part: 'waist', label: '腰部', slotLabel: '腰' },
  { part: 'legs', label: '腿部', slotLabel: '脚' },
]

/** 技能类别展示顺序与名称 */
export const SKILL_CATEGORY_META: Record<SkillCategory, { label: string; order: number }> = {
  weapon: { label: '武器技能', order: 0 },
  equip: { label: '防具技能', order: 1 },
  series: { label: '系列技能', order: 2 },
  group: { label: '组技能', order: 3 },
  preserver: { label: '其他技能', order: 4 },
}

/** 系列技能等级上限（2 件 Lv1、4 件 Lv2） */
export const SERIES_SKILL_MAX = 2

/** 组技能等级上限（3 件生效 Lv1） */
export const GROUP_SKILL_MAX = 1

/** 系列技能激活所需件数：2 件 Lv1、4 件 Lv2 */
export const SERIES_LEVEL_PIECES: Record<number, number> = { 1: 2, 2: 4 }

/** 组技能激活所需件数 */
export const GROUP_ACTIVE_PIECES = 3
