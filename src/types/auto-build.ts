import type { LoadoutSelection } from './build'
import type { DataRank, SkillCategory, WeaponType } from './mh-wilds'

/** 装备范围：上位 / 下位 / 不限（自动配装的武器与防具候选池） */
export type RankScope = DataRank | 'any'

/** 综合评分的分项（归一化到 0-1） */
export interface AutoBuildScoreBreakdown {
  /** 攻击力（候选池内归一化） */
  attack: number
  /** 全套防具防御力（候选池内归一化） */
  defense: number
  /** 技能完整度：完全满足的目标技能数 / 目标技能总数 */
  skillCoverage: number
  /** 技能等级：已达成等级 / 目标等级 */
  skillLevel: number
}

/** 自动配装的目标技能需求 */
export interface SkillRequirement {
  name: string
  /** 目标等级（1 到该技能上限） */
  level: number
  category: SkillCategory
}

/** 自动配装输入 */
export interface AutoBuildInput {
  /** 目标武器类型 */
  weaponType: WeaponType
  /**
   * 指定武器在 `data.weapons` 中的下标；有值时只围绕该武器搜索配装，
   * 不指定（`null` / 省略）时仍按目标技能与孔位潜力自动挑选武器。
   */
  weaponIndex?: number | null
  /**
   * 装备范围：`high` 只看上位装备、`low` 只看下位装备、`any` 不限（默认）。
   * 武器按稀有度（≤4 下位 / ≥5 上位）判断，防具按 `rank` 判断；护石 / 装饰品无上下位之分，始终参与。
   */
  rankScope?: RankScope
  requirements: readonly SkillRequirement[]
}

/** 单个目标技能的达成情况 */
export interface SkillProgress {
  name: string
  target: number
  /** 配装完成后实际等级（含系列 / 组技能加成） */
  level: number
  max: number
  category: SkillCategory
  satisfied: boolean
}

/** 自动配装输出 */
export interface AutoBuildResult {
  selection: LoadoutSelection
  skills: SkillProgress[]
  /** 完全满足的目标技能数 */
  satisfiedSkills: number
  /** 目标技能总数 */
  totalSkills: number
  /** 已达成等级总和（按目标封顶） */
  achievedLevels: number
  /** 目标等级总和 */
  targetLevels: number
  defense: number
  /** 综合评分（0-100，越高越好；维度见 `scoreBreakdown`） */
  score: number
  /** 综合评分分项（归一化 0-1） */
  scoreBreakdown: AutoBuildScoreBreakdown
  /** 算法过程说明（珠子 / 护石选择等） */
  notes: string[]
}

/** 自动配装候选（带是否符合全部目标） */
export interface AutoBuildCandidate extends AutoBuildResult {
  /** 所有目标技能与等级均满足 */
  fullySatisfied: boolean
}

/** 多套自动配装结果 */
export interface AutoBuildCandidatesResult {
  /** 展示用候选（按综合评分降序；不再强制完全符合优先） */
  candidates: AutoBuildCandidate[]
  /** 完全符合目标的配装总数（可能多于展示数量） */
  fullySatisfiedCount: number
  /** 搜索到的候选总数（去重后） */
  totalCandidates: number
}

/** 技能选择器中的一个技能选项 */
export interface AutoBuildSkillOption {
  name: string
  /** 可选的最大等级（系列 2 / 组 1 / 其他取数据上限） */
  max: number
}

/** 按类别分组的技能选项 */
export interface AutoBuildSkillGroup {
  category: SkillCategory
  label: string
  skills: AutoBuildSkillOption[]
}
