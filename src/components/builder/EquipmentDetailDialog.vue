<script setup lang="ts">
import { computed } from 'vue'

import type { EquipmentDetail } from '@/types/build'
import type { SkillLevelMap } from '@/types/mh-wilds'
import { formatSlotLevels } from '@/utils/mh-format'

const visible = defineModel<boolean>({ required: true })

const props = defineProps<{
  detail: EquipmentDetail | null
}>()

const rankLabel = computed(() => {
  if (props.detail?.rank === 'high') return '上位'
  if (props.detail?.rank === 'low') return '下位'
  return ''
})

interface SkillRow {
  name: string
  level: number
}

function toSkillRows(skills: SkillLevelMap | undefined): SkillRow[] {
  return Object.entries(skills ?? {})
    .map(([name, level]) => ({ name, level }))
    .sort((left, right) => left.name.localeCompare(right.name, 'zh-Hans-CN'))
}

const skillRows = computed(() => toSkillRows(props.detail?.skills))
const seriesSkillRows = computed(() => toSkillRows(props.detail?.seriesSkills))
const groupSkillRows = computed(() => toSkillRows(props.detail?.groupSkills))

/** 基础数值行：按装备类型展示对应字段 */
const statRows = computed(() => {
  const detail = props.detail
  if (!detail) return [] as Array<{ label: string; value: string }>

  const rows: Array<{ label: string; value: string }> = []
  if (detail.rarity !== null) rows.push({ label: '稀有度', value: `RARE ${detail.rarity}` })
  if (detail.attack !== null) rows.push({ label: '攻击力', value: String(detail.attack) })
  if (detail.defense !== null) rows.push({ label: '防御力', value: String(detail.defense) })
  rows.push({ label: '孔位', value: formatSlotLevels(detail.slots) })
  rows.push({ label: '所属系列', value: detail.series || '—' })

  return rows
})
</script>

<template>
  <el-dialog v-model="visible" title="装备详情" width="560px" append-to-body destroy-on-close>
    <div v-if="detail" class="detail">
      <header class="detail__header">
        <span class="detail__label">{{ detail.label }}</span>
        <h3 class="detail__name">{{ detail.name }}</h3>
        <el-tag size="small" effect="plain">{{ detail.tag }}</el-tag>
        <el-tag
          v-if="rankLabel"
          size="small"
          :type="detail.rank === 'high' ? 'warning' : 'info'"
          effect="plain"
        >
          {{ rankLabel }}
        </el-tag>
      </header>

      <section class="detail__block">
        <h4 class="detail__block-title">基础数值</h4>
        <dl class="detail__stats">
          <div v-for="row in statRows" :key="row.label" class="detail__stat">
            <dt class="detail__stat-label">{{ row.label }}</dt>
            <dd class="detail__stat-value">{{ row.value }}</dd>
          </div>
        </dl>
      </section>

      <section class="detail__block">
        <h4 class="detail__block-title">自带技能</h4>
        <ul v-if="skillRows.length" class="detail__skills">
          <li v-for="row in skillRows" :key="row.name" class="detail__skill">
            <span class="detail__skill-name">{{ row.name }}</span>
            <span class="detail__skill-level">Lv{{ row.level }}</span>
          </li>
        </ul>
        <p v-else class="detail__empty">无</p>
      </section>

      <template v-if="detail.kind === 'armor'">
        <section class="detail__block">
          <h4 class="detail__block-title">系列技能归属</h4>
          <ul v-if="seriesSkillRows.length" class="detail__skills">
            <li v-for="row in seriesSkillRows" :key="row.name" class="detail__skill">
              <span class="detail__skill-name">{{ row.name }}</span>
              <span class="detail__skill-level">Lv{{ row.level }}</span>
            </li>
          </ul>
          <p v-else class="detail__empty">无</p>
        </section>

        <section class="detail__block">
          <h4 class="detail__block-title">组技能归属</h4>
          <ul v-if="groupSkillRows.length" class="detail__skills">
            <li v-for="row in groupSkillRows" :key="row.name" class="detail__skill">
              <span class="detail__skill-name">{{ row.name }}</span>
              <span class="detail__skill-level">Lv{{ row.level }}</span>
            </li>
          </ul>
          <p v-else class="detail__empty">无</p>
        </section>
      </template>
    </div>
  </el-dialog>
</template>

<style scoped lang="scss">
.detail {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;

  &__header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: $spacing-sm;
  }

  &__label {
    color: $color-text-secondary;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.5px;
  }

  &__name {
    min-width: 0;
    color: $color-text-primary;
    font-size: 16px;
    font-weight: 600;
  }

  &__block {
    padding: $spacing-md;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    background: $color-bg-white;
  }

  &__block-title {
    margin-bottom: $spacing-sm;
    color: $color-text-primary;
    font-size: 14px;
    font-weight: 600;
  }

  &__stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: $spacing-sm;
    margin: 0;
  }

  &__stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__stat-label {
    color: $color-text-placeholder;
    font-size: 12px;
  }

  &__stat-value {
    margin: 0;
    color: $color-text-primary;
    font-size: 14px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
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
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $spacing-sm;
  }

  &__skill-name {
    @include text-ellipsis;
    color: $color-text-regular;
    font-size: 13px;
  }

  &__skill-level {
    flex: none;
    color: $color-primary;
    font-size: 12px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  &__empty {
    color: $color-text-placeholder;
    font-size: 12px;
  }
}
</style>
