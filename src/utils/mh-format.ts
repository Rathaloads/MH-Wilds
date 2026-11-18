import type { SkillLevelMap } from '@/types/mh-wilds'

/** 孔位等级列表 → 展示文本，如 `[3, 2]` → `Lv3 / Lv2` */
export function formatSlotLevels(slots: readonly number[]): string {
  return slots.length ? slots.map((level) => `Lv${level}`).join(' / ') : '无孔位'
}

/** 技能等级映射 → 展示文本，如 `攻击+3、看破+1` */
export function formatSkillMap(skills: SkillLevelMap, limit = 4): string {
  const entries = Object.entries(skills)
  if (!entries.length) return '无技能'

  const shown = entries.slice(0, limit).map(([name, level]) => `${name}+${level}`)
  return entries.length > limit ? `${shown.join('、')} 等 ${entries.length} 项` : shown.join('、')
}

/** 单个孔位的展示文本，如 `Lv2 孔` */
export function formatSlotLevel(level: number): string {
  return `Lv${level} 孔`
}

const SLOT_LABEL_PREFIX: Record<string, string> = {
  weapon: '武器孔',
  head: '头部孔',
  chest: '胸部孔',
  arms: '腕部孔',
  waist: '腰部孔',
  legs: '腿部孔',
  talisman: '护石孔',
}

/** 孔位 id → 展示文本，如 `weapon:0` → `武器孔 #1`、`head:1` → `头部孔 #2` */
export function formatSlotLabel(slotId: string): string {
  const [prefix, indexText] = slotId.split(':')
  const index = Number(indexText) + 1
  return `${SLOT_LABEL_PREFIX[prefix] ?? `${prefix}孔`} #${Number.isFinite(index) ? index : 1}`
}

/** 配装保存时间格式化 */
export function formatBuildTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', { hour12: false })
}
