/**
 * Monster Hunter Wilds 静态数据源类型定义。
 *
 * 数据文件：`public/mh-wilds.json`（运行时通过 `/mh-wilds.json` 访问）
 * 数据来源：由 `pnpm sync:data` 从 wilds.mhdb.io 拉取生成的本地快照，
 * 使用同一适配器（`src/api/mhdb-wilds.ts`）转换（适配器仅供同步脚本使用）。
 *
 * 说明：字段取值（武器类型、技能类别等）基于当前数据版本，如数据升级后出现新值，
 * 需同步更新本文件中的字面量联合类型。
 */

/** 技能名 → 等级 的映射，例如 `{ 攻击: 3 }` */
export type SkillLevelMap = Record<string, number>

/** 孔位等级列表，例如 `[3, 2]` 表示三级孔 + 二级孔 */
export type SlotLevels = number[]

/** 武器类型（共 14 种，与 `MhWildsData.weaponTypes` 一致） */
export type WeaponType =
  | '大剑'
  | '太刀'
  | '单手剑'
  | '双剑'
  | '长枪'
  | '铳枪'
  | '大锤'
  | '狩猎笛'
  | '斩斧'
  | '盾斧'
  | '操虫棍'
  | '轻弩炮'
  | '重弩炮'
  | '弓'

/** 防具部位分组 key（对应 `armors` 对象的键） */
export type ArmorPart = 'head' | 'chest' | 'arms' | 'waist' | 'legs'

/** 防具部位中文名 */
export type ArmorSlotLabel = '头' | '身' | '腕' | '腰' | '脚'

/** 技能类别 */
export type SkillCategory = 'weapon' | 'equip' | 'series' | 'group' | 'preserver'

/**
 * 装备的上下位标记（wilds.mhdb.io 的 `Rank` 枚举）。
 * 数据源规则：稀有度 ≤ 4 为 `low`（下位），≥ 5 为 `high`（上位）。
 */
export type DataRank = 'low' | 'high'

/** 装饰品适用类别 */
export type DecorationType = 'weapon' | 'equip' | 'preserver'

/** 武器 */
export interface MhWeapon {
  /** 武器名称，如「希望大剑Ⅰ」 */
  name: string
  /** 武器类型，如「大剑」 */
  type: WeaponType
  /** 稀有度（1-8）；按数据源规则 ≤4 为下位、≥5 为上位 */
  rarity: number
  /** 攻击力（数据源 `damage.raw`，用于自动配装评分） */
  attack: number
  /** 自带技能及等级 */
  skills: SkillLevelMap
  /** 孔位等级列表，如 `[2, 1]` */
  slots: SlotLevels
  /** 所属系列（可能为空字符串） */
  series: string
}

/** 技能（含装备技能、系列技能、组技能、护石技能等） */
export interface MhSkill {
  /** 技能 id，如「LV1插槽」 */
  id: string
  /** 技能名称 */
  name: string
  /** 技能最高等级 */
  max: number
  /** 技能说明文本 */
  explain: string
  /** 技能类别 */
  category: SkillCategory
  /** 该技能对应的装饰品孔位需求（1-4） */
  deco: number
}

/** 装饰品（珠子） */
export interface MhDecoration {
  /** 装饰品名称，如「攻击珠【1】」 */
  name: string
  /** 所需孔位等级 */
  slot: number
  /** 适用装备类别 */
  type: DecorationType
  /** 提供的技能及等级 */
  skills: SkillLevelMap
}

/** 防具 */
export interface MhArmor {
  /** 防具名称 */
  name: string
  /** 部位中文名 */
  slot: ArmorSlotLabel
  /** 部位分组 */
  part: ArmorPart
  /** 防具自带技能 */
  skills: SkillLevelMap
  /** 系列技能（套装效果技能） */
  seriesSkills: SkillLevelMap
  /** 组技能（对应技能组效果） */
  groupSkills: SkillLevelMap
  /** 孔位等级列表 */
  slots: SlotLevels
  /** 防御力 */
  defense: number
  /** 上下位：`low` / `high`（数据缺失时为空字符串） */
  rank: DataRank | ''
  /** 所属系列 */
  series: string
}

/** 护石 */
export interface MhTalisman {
  /** 护石名称，如「强走护石Ⅰ」 */
  name: string
  /** 装备类型（当前均为 equip） */
  type: 'equip'
  /** 提供的技能及等级 */
  skills: SkillLevelMap
  /** 孔位等级列表（当前数据均为空数组） */
  slots: SlotLevels
}

/** 按部位分组的防具集合 */
export type MhArmorSets = Record<ArmorPart, MhArmor[]>

/** 各实体数量统计 */
export interface MhWildsCounts {
  weapons: number
  skills: number
  decorations: number
  armors: number
  talismans: number
}

/** 数据源根结构（对应 `public/mh-wilds.json`） */
export interface MhWildsData {
  /** 数据来源说明 */
  source: string
  /** 游戏标识，如 `wilds` */
  game: string
  /** 数据版本，如 `1.020.00` */
  version: string
  /** 数据生成时间（ISO 8601） */
  generatedAt: string
  /** 各实体数量统计 */
  counts: MhWildsCounts
  /** 全部武器类型（14 种） */
  weaponTypes: WeaponType[]
  /** 全部技能 */
  skills: MhSkill[]
  /** 按部位分组的防具 */
  armors: MhArmorSets
  /** 全部装饰品 */
  decorations: MhDecoration[]
  /** 全部武器 */
  weapons: MhWeapon[]
  /** 全部护石 */
  talismans: MhTalisman[]
}
