<script setup lang="ts">
import { computed } from 'vue'

import { ARMOR_PART_META, SKILL_CATEGORY_META } from '@/types/build'
import type { AutoBuildResult, SkillProgress } from '@/types/auto-build'
import type { MhWildsData } from '@/types/mh-wilds'
import { formatSkillMap, formatSlotLabel, formatSlotLevels } from '@/utils/mh-format'

const props = defineProps<{
  result: AutoBuildResult | null
  data: MhWildsData | null
}>()

interface EquipmentRow {
  label: string
  name: string
  detail: string
}

interface DecorationRow {
  slot: string
  name: string
  skills: string
}

const equipmentRows = computed<EquipmentRow[]>(() => {
  const { result, data } = props
  if (!result || !data) return []

  const rows: EquipmentRow[] = []
  const { selection } = result

  const weapon = selection.weaponIndex === null ? null : data.weapons[selection.weaponIndex]
  rows.push({
    label: '武器',
    name: weapon?.name ?? '未选择',
    detail: weapon ? `${weapon.type} · ${formatSlotLevels(weapon.slots)}` : '—',
  })

  for (const meta of ARMOR_PART_META) {
    const index = selection.armorIndices[meta.part]
    const armor = index === null ? null : data.armors[meta.part][index]
    rows.push({
      label: meta.label,
      name: armor?.name ?? '未选择',
      detail: armor ? `${formatSlotLevels(armor.slots)} · DEF ${armor.defense}` : '—',
    })
  }

  const talisman = selection.talismanIndex === null ? null : data.talismans[selection.talismanIndex]
  rows.push({
    label: '护石',
    name: talisman?.name ?? '无需护石',
    detail: talisman ? formatSkillMap(talisman.skills, 2) : '—',
  })

  return rows
})

interface ScoreRow {
  label: string
  detail: string
  /** 归一化分项（0-1），展示时换算成百分制 */
  value: number
}

/** 综合评分分项（含原始数值，便于和满分对比） */
const scoreRows = computed<ScoreRow[]>(() => {
  const { result, data } = props
  if (!result) return []

  const weaponIndex = result.selection.weaponIndex
  const weapon = data && weaponIndex !== null ? data.weapons[weaponIndex] : null

  return [
    {
      label: '攻击力',
      detail: weapon ? `攻击 ${weapon.attack}` : '—',
      value: result.scoreBreakdown.attack,
    },
    { label: '防御力', detail: `防御 ${result.defense}`, value: result.scoreBreakdown.defense },
    {
      label: '技能完整度',
      detail: `${result.satisfiedSkills}/${result.totalSkills}`,
      value: result.scoreBreakdown.skillCoverage,
    },
    {
      label: '技能等级',
      detail: `${result.achievedLevels}/${result.targetLevels}`,
      value: result.scoreBreakdown.skillLevel,
    },
  ]
})

const decorationRows = computed<DecorationRow[]>(() => {
  const { result, data } = props
  if (!result || !data) return []

  const rows: DecorationRow[] = []

  for (const [slotId, index] of Object.entries(result.selection.decorationIndices)) {
    const decoration = data.decorations[index]
    if (!decoration) continue

    rows.push({
      slot: formatSlotLabel(slotId),
      name: decoration.name,
      skills: formatSkillMap(decoration.skills, 2),
    })
  }

  return rows
})

const progressGroups = computed(() => {
  const groups = new Map<string, { label: string; order: number; skills: SkillProgress[] }>()

  for (const skill of props.result?.skills ?? []) {
    const meta = SKILL_CATEGORY_META[skill.category]
    let group = groups.get(skill.category)
    if (!group) {
      group = { label: meta.label, order: meta.order, skills: [] }
      groups.set(skill.category, group)
    }
    group.skills.push(skill)
  }

  return [...groups.values()].sort((left, right) => left.order - right.order)
})

const levelRate = computed(() => {
  const result = props.result
  if (!result || result.targetLevels === 0) return 0
  return Math.round((result.achievedLevels / result.targetLevels) * 100)
})
</script>

<template>
  <div class="result">
    <el-empty
      v-if="!result"
      description="选择目标技能与武器类型后，点击「自动配装」"
      :image-size="90"
    />

    <template v-else>
      <div class="result__stats">
        <div class="result__stat">
          <span class="result__stat-value"
            >{{ result.satisfiedSkills }}/{{ result.totalSkills }}</span
          >
          <span class="result__stat-label">目标技能满足</span>
        </div>
        <div class="result__stat">
          <span class="result__stat-value">{{ levelRate }}%</span>
          <span class="result__stat-label">等级达成率</span>
        </div>
        <div class="result__stat">
          <span class="result__stat-value">{{ result.defense }}</span>
          <span class="result__stat-label">防御力</span>
        </div>
      </div>

      <section class="result__block">
        <header class="result__block-header">
          <span class="result__block-title">综合评分</span>
          <span class="result__score-total">{{ result.score.toFixed(1) }}</span>
        </header>
        <ul class="result__scores">
          <li v-for="row in scoreRows" :key="row.label" class="result__score-row">
            <span class="result__score-label">{{ row.label }}</span>
            <span class="result__score-detail">{{ row.detail }}</span>
            <span class="result__score-value">{{ Math.round(row.value * 100) }}</span>
          </li>
        </ul>
      </section>

      <section class="result__block">
        <header class="result__block-header">
          <span class="result__block-title">装备</span>
        </header>
        <ul class="result__equipment">
          <li v-for="row in equipmentRows" :key="row.label" class="result__equipment-row">
            <span class="result__equipment-label">{{ row.label }}</span>
            <span class="result__equipment-name">{{ row.name }}</span>
            <span class="result__equipment-detail">{{ row.detail }}</span>
          </li>
        </ul>
      </section>

      <section class="result__block">
        <header class="result__block-header">
          <span class="result__block-title">装饰品</span>
          <span class="result__block-hint">{{ decorationRows.length }} 颗</span>
        </header>
        <ul v-if="decorationRows.length" class="result__decorations">
          <li v-for="row in decorationRows" :key="row.slot" class="result__decoration-row">
            <span class="result__decoration-slot">{{ row.slot }}</span>
            <span class="result__decoration-name">{{ row.name }}</span>
            <span class="result__decoration-skills">{{ row.skills }}</span>
          </li>
        </ul>
        <p v-else class="result__empty-text">未镶嵌装饰品</p>
      </section>

      <section class="result__block">
        <header class="result__block-header">
          <span class="result__block-title">技能达成</span>
          <span class="result__block-hint">
            {{ result.achievedLevels }} / {{ result.targetLevels }} 级
          </span>
        </header>
        <div v-for="group in progressGroups" :key="group.label" class="result__skills">
          <h4 class="result__skills-title">{{ group.label }}</h4>
          <ul class="result__skill-list">
            <li
              v-for="skill in group.skills"
              :key="skill.name"
              class="result__skill"
              :class="{ 'result__skill--miss': !skill.satisfied }"
            >
              <span class="result__skill-name">{{ skill.name }}</span>
              <span class="result__skill-level">
                Lv{{ skill.level }}
                <span class="result__skill-target"> / 目标 {{ skill.target }}</span>
              </span>
              <el-tag size="small" :type="skill.satisfied ? 'success' : 'danger'" effect="plain">
                {{ skill.satisfied ? '达成' : `差 ${skill.target - skill.level} 级` }}
              </el-tag>
            </li>
          </ul>
        </div>
      </section>

      <section v-if="result.notes.length" class="result__block">
        <header class="result__block-header">
          <span class="result__block-title">配装说明</span>
        </header>
        <ul class="result__notes">
          <li v-for="note in result.notes" :key="note" class="result__note">{{ note }}</li>
        </ul>
      </section>
    </template>
  </div>
</template>

<style scoped lang="scss">
.result {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;

  &__stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: $spacing-sm;
    padding: $spacing-md;
    border-radius: $radius-md;
    background: linear-gradient(135deg, rgba(64, 158, 255, 0.12), rgba(103, 194, 58, 0.08));
  }

  &__stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }

  &__stat-value {
    color: $color-text-primary;
    font-size: 20px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  &__stat-label {
    color: $color-text-secondary;
    font-size: 12px;
  }

  &__block {
    padding: $spacing-md;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    background: $color-bg-white;
  }

  &__block-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: $spacing-sm;
  }

  &__block-title {
    color: $color-text-primary;
    font-size: 14px;
    font-weight: 600;
  }

  &__block-hint {
    color: $color-text-placeholder;
    font-size: 12px;
  }

  &__score-total {
    color: $color-primary;
    font-size: 20px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  &__scores {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__score-row {
    display: grid;
    grid-template-columns: 80px minmax(0, 1fr) auto;
    align-items: baseline;
    gap: $spacing-sm;
  }

  &__score-label {
    color: $color-text-secondary;
    font-size: 12px;
  }

  &__score-detail {
    color: $color-text-regular;
    font-size: 12px;
  }

  &__score-value {
    color: $color-text-primary;
    font-size: 13px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  &__equipment {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__equipment-row {
    display: grid;
    grid-template-columns: 40px minmax(0, 1fr) auto;
    align-items: baseline;
    gap: $spacing-sm;
  }

  &__equipment-label {
    color: $color-text-secondary;
    font-size: 12px;
  }

  &__equipment-name {
    @include text-ellipsis;
    color: $color-text-primary;
    font-size: 13px;
    font-weight: 600;
  }

  &__equipment-detail {
    color: $color-text-placeholder;
    font-size: 12px;
  }

  &__decorations {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__decoration-row {
    display: grid;
    grid-template-columns: 80px minmax(0, 1fr) auto;
    align-items: baseline;
    gap: $spacing-sm;
  }

  &__decoration-slot {
    color: $color-text-secondary;
    font-size: 12px;
  }

  &__decoration-name {
    @include text-ellipsis;
    color: $color-text-primary;
    font-size: 13px;
  }

  &__decoration-skills {
    color: $color-text-placeholder;
    font-size: 12px;
  }

  &__skills + &__skills {
    margin-top: $spacing-md;
  }

  &__skills-title {
    margin-bottom: 4px;
    color: $color-text-secondary;
    font-size: 12px;
    font-weight: 600;
  }

  &__skill-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__skill {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: center;
    gap: $spacing-sm;

    &--miss .result__skill-name {
      color: $color-text-regular;
    }
  }

  &__skill-name {
    @include text-ellipsis;
    color: $color-text-primary;
    font-size: 13px;
  }

  &__skill-level {
    color: $color-text-secondary;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }

  &__skill-target {
    color: $color-text-placeholder;
  }

  &__notes {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__note {
    color: $color-text-secondary;
    font-size: 12px;
    line-height: 1.6;
  }

  &__empty-text {
    color: $color-text-placeholder;
    font-size: 12px;
  }
}
</style>
