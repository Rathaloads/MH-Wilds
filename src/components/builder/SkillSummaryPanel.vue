<script setup lang="ts">
import { computed } from 'vue'

import {
  GROUP_ACTIVE_PIECES,
  SERIES_SKILL_MAX,
  SKILL_CATEGORY_META,
  type LoadoutSummary,
  type SkillSummaryItem,
} from '@/types/build'
import type { SkillCategory } from '@/types/mh-wilds'

const props = defineProps<{
  summary: LoadoutSummary
  equipmentCount: number
}>()

interface SkillGroup {
  key: SkillCategory
  label: string
  order: number
  items: SkillSummaryItem[]
}

const groupedSkills = computed<SkillGroup[]>(() => {
  const groups = new Map<SkillCategory, SkillGroup>()

  for (const item of props.summary.skills) {
    const meta = SKILL_CATEGORY_META[item.category]
    let group = groups.get(item.category)

    if (!group) {
      group = { key: item.category, label: meta.label, order: meta.order, items: [] }
      groups.set(item.category, group)
    }

    group.items.push(item)
  }

  return [...groups.values()].sort((left, right) => left.order - right.order)
})

/** 只展示已出现的系列 / 组技能，避免空列表 */
const seriesBonuses = computed(() => props.summary.series.filter((bonus) => bonus.pieces > 0))
const groupBonuses = computed(() => props.summary.groups.filter((bonus) => bonus.pieces > 0))

function levelBarWidth(item: SkillSummaryItem): string {
  if (item.max <= 0) return '0%'
  return `${Math.min(100, Math.round((item.level / item.max) * 100))}%`
}

function seriesStatusText(bonus: { active: boolean; level: number; pieces: number }): string {
  if (bonus.active) return `Lv${bonus.level}`
  return `还差 ${SERIES_SKILL_MAX - bonus.pieces} 件`
}

function groupStatusText(bonus: { active: boolean; pieces: number }): string {
  if (bonus.active) return '已激活'
  return `还差 ${GROUP_ACTIVE_PIECES - bonus.pieces} 件`
}
</script>

<template>
  <div class="summary">
    <div class="summary__stats">
      <div class="summary__stat">
        <span class="summary__stat-value">{{ summary.weaponAttack }}</span>
        <span class="summary__stat-label">武器攻击力</span>
      </div>
      <div class="summary__stat">
        <span class="summary__stat-value">{{ summary.defense }}</span>
        <span class="summary__stat-label">防御力</span>
      </div>
      <div class="summary__stat">
        <span class="summary__stat-value">{{ summary.usedSlots }}/{{ summary.totalSlots }}</span>
        <span class="summary__stat-label">已用孔位</span>
      </div>
      <div class="summary__stat">
        <span class="summary__stat-value">{{ summary.skills.length }}</span>
        <span class="summary__stat-label">技能数</span>
      </div>
    </div>

    <section class="summary__block">
      <header class="summary__block-header">
        <span class="summary__block-title">装备数值</span>
        <span class="summary__block-hint">武器攻击力 / 防具防御力</span>
      </header>
      <ul class="summary__equip-list">
        <li class="summary__equip">
          <span class="summary__equip-label">武器</span>
          <span class="summary__equip-name">{{ summary.weaponName || '未选择' }}</span>
          <span class="summary__equip-value">
            {{ summary.weaponName ? `攻击 ${summary.weaponAttack}` : '—' }}
          </span>
        </li>
        <li v-for="row in summary.defenseBreakdown" :key="row.part" class="summary__equip">
          <span class="summary__equip-label">{{ row.label }}</span>
          <span class="summary__equip-name">{{ row.name || '未选择' }}</span>
          <span class="summary__equip-value">
            {{ row.defense !== null ? `DEF ${row.defense}` : '—' }}
          </span>
        </li>
      </ul>
    </section>

    <section class="summary__block">
      <header class="summary__block-header">
        <span class="summary__block-title">技能合计</span>
        <span class="summary__block-hint">{{ equipmentCount }} 件装备</span>
      </header>

      <template v-if="summary.skills.length">
        <div v-for="group in groupedSkills" :key="group.key" class="summary__group">
          <h3 class="summary__group-title">{{ group.label }}</h3>
          <ul class="summary__skills">
            <li v-for="item in group.items" :key="item.name" class="summary__skill">
              <span class="summary__skill-name">{{ item.name }}</span>
              <span
                class="summary__skill-level"
                :class="{
                  'summary__skill-level--max': item.maxed && item.overflow === 0,
                  'summary__skill-level--over': item.overflow > 0,
                }"
              >
                Lv{{ item.level }}
                <span class="summary__skill-max">/ {{ item.max }}</span>
              </span>
              <span class="summary__skill-bar">
                <i
                  class="summary__skill-fill"
                  :class="{ 'summary__skill-fill--over': item.overflow > 0 }"
                  :style="{ width: levelBarWidth(item) }"
                />
              </span>
            </li>
          </ul>
        </div>
      </template>
      <p v-else class="summary__empty">选择装备后显示技能合计</p>
    </section>

    <section class="summary__block">
      <header class="summary__block-header">
        <span class="summary__block-title">系列技能</span>
        <span class="summary__block-hint">2 件 Lv1 · 4 件 Lv2</span>
      </header>

      <ul v-if="seriesBonuses.length" class="summary__bonus-list">
        <li v-for="bonus in seriesBonuses" :key="bonus.name" class="summary__bonus">
          <span class="summary__bonus-name">{{ bonus.name }}</span>
          <span class="summary__bonus-pieces">{{ bonus.pieces }} 件</span>
          <el-tag size="small" :type="bonus.active ? 'success' : 'info'" effect="plain">
            {{ seriesStatusText(bonus) }}
          </el-tag>
        </li>
      </ul>
      <p v-else class="summary__empty">未选择同系列防具</p>
    </section>

    <section class="summary__block">
      <header class="summary__block-header">
        <span class="summary__block-title">组技能</span>
        <span class="summary__block-hint">3 件激活</span>
      </header>

      <ul v-if="groupBonuses.length" class="summary__bonus-list">
        <li v-for="bonus in groupBonuses" :key="bonus.name" class="summary__bonus">
          <span class="summary__bonus-name">{{ bonus.name }}</span>
          <span class="summary__bonus-pieces">{{ bonus.pieces }} 件</span>
          <el-tag size="small" :type="bonus.active ? 'success' : 'info'" effect="plain">
            {{ groupStatusText(bonus) }}
          </el-tag>
        </li>
      </ul>
      <p v-else class="summary__empty">未选择同组防具</p>
    </section>
  </div>
</template>

<style scoped lang="scss">
.summary {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;

  &__stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
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

  &__equip-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__equip {
    display: grid;
    grid-template-columns: 36px minmax(0, 1fr) auto;
    align-items: baseline;
    gap: $spacing-sm;
  }

  &__equip-label {
    color: $color-text-secondary;
    font-size: 12px;
  }

  &__equip-name {
    @include text-ellipsis;
    color: $color-text-regular;
    font-size: 13px;
  }

  &__equip-value {
    color: $color-primary;
    font-size: 12px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
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

  &__group + &__group {
    margin-top: $spacing-md;
  }

  &__group-title {
    margin-bottom: 4px;
    color: $color-text-secondary;
    font-size: 12px;
    font-weight: 600;
  }

  &__skills {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__skill {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto 88px;
    align-items: center;
    gap: $spacing-sm;
  }

  &__skill-name {
    @include text-ellipsis;
    color: $color-text-regular;
    font-size: 13px;
  }

  &__skill-level {
    color: $color-text-primary;
    font-size: 12px;
    font-variant-numeric: tabular-nums;

    &--max {
      color: $color-success;
      font-weight: 600;
    }

    &--over {
      color: $color-danger;
      font-weight: 600;
    }
  }

  &__skill-max {
    color: $color-text-placeholder;
    font-weight: 400;
  }

  &__skill-bar {
    height: 4px;
    overflow: hidden;
    border-radius: 2px;
    background: $color-border-light;
  }

  &__skill-fill {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: $color-primary;
    transition: width 0.2s ease;

    &--over {
      background: $color-danger;
    }
  }

  &__bonus-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__bonus {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: center;
    gap: $spacing-sm;
  }

  &__bonus-name {
    @include text-ellipsis;
    color: $color-text-regular;
    font-size: 13px;
  }

  &__bonus-pieces {
    color: $color-text-secondary;
    font-size: 12px;
  }

  &__empty {
    color: $color-text-placeholder;
    font-size: 12px;
  }
}
</style>
