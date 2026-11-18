<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'

import AutoBuildResultPanel from '@/components/autobuild/AutoBuildResultPanel.vue'
import { ARMOR_PART_META } from '@/types/build'
import type { AutoBuildCandidate } from '@/types/auto-build'
import type { MhArmor, MhWildsData } from '@/types/mh-wilds'
import { formatSkillMap, formatSlotLabel } from '@/utils/mh-format'

const visible = defineModel<boolean>({ required: true })

const props = defineProps<{
  candidates: AutoBuildCandidate[]
  data: MhWildsData | null
  fullySatisfiedCount: number
  totalCandidates: number
  loading: boolean
}>()

const emit = defineEmits<{
  edit: [candidate: AutoBuildCandidate]
  copy: [candidate: AutoBuildCandidate]
}>()

interface DecorationLine {
  slot: string
  name: string
  skills: string
}

interface CandidateView {
  candidate: AutoBuildCandidate
  weaponName: string
  armorNames: string[]
  talismanName: string
  decorations: DecorationLine[]
}

const expanded = shallowRef<number | null>(null)

watch(visible, (open) => {
  if (!open) expanded.value = null
})

const views = computed<CandidateView[]>(() => {
  const { data } = props
  if (!data) return []

  return props.candidates.map((candidate) => {
    const { selection } = candidate
    const weapon = selection.weaponIndex === null ? null : data.weapons[selection.weaponIndex]
    const armorNames = ARMOR_PART_META.map((meta) => {
      const index = selection.armorIndices[meta.part]
      const armor: MhArmor | null = index === null ? null : data.armors[meta.part][index]
      return `${meta.label}：${armor?.name ?? '—'}`
    })
    const talisman =
      selection.talismanIndex === null ? null : data.talismans[selection.talismanIndex]
    const decorations = Object.entries(selection.decorationIndices).map(([slotId, index]) => {
      const decoration = data.decorations[index]
      return {
        slot: formatSlotLabel(slotId),
        name: decoration?.name ?? '—',
        skills: decoration ? formatSkillMap(decoration.skills, 2) : '',
      }
    })

    return {
      candidate,
      weaponName: weapon?.name ?? '未选择',
      armorNames,
      talismanName: talisman?.name ?? '无需护石',
      decorations,
    }
  })
})

function toggle(index: number): void {
  expanded.value = expanded.value === index ? null : index
}
</script>

<template>
  <el-drawer
    v-model="visible"
    size="760px"
    append-to-body
    :title="`自动配装结果（${fullySatisfiedCount} 套完全符合）`"
  >
    <div class="auto-drawer">
      <p class="auto-drawer__summary">
        共搜索到 {{ totalCandidates }} 套配装
        <template v-if="fullySatisfiedCount > 0">
          ，其中 {{ fullySatisfiedCount }} 套完全符合目标
        </template>
        <template v-else-if="!loading">，没有完全符合目标的配装</template>
        ；按综合评分从高到低排列，展示前 {{ candidates.length }} 套
      </p>

      <div v-if="loading" class="auto-drawer__loading">
        <el-skeleton :rows="8" animated />
      </div>

      <el-scrollbar v-else class="auto-drawer__scroll" height="calc(100vh - 170px)">
        <article v-for="(view, index) in views" :key="index" class="candidate">
          <header class="candidate__header">
            <span class="candidate__index">#{{ index + 1 }}</span>
            <el-tag
              size="small"
              effect="plain"
              :type="view.candidate.fullySatisfied ? 'success' : 'warning'"
            >
              {{ view.candidate.fullySatisfied ? '完全符合' : '部分满足' }}
            </el-tag>
            <span class="candidate__score">评分 {{ view.candidate.score.toFixed(1) }}</span>
            <span class="candidate__stats">防御 {{ view.candidate.defense }}</span>
            <span class="candidate__stats">
              技能 {{ view.candidate.satisfiedSkills }}/{{ view.candidate.totalSkills }} · 等级
              {{ view.candidate.achievedLevels }}/{{ view.candidate.targetLevels }}
            </span>
          </header>

          <p class="candidate__line">
            <span class="candidate__line-label">武器</span>
            <span>{{ view.weaponName }}</span>
            <span v-for="armorName in view.armorNames" :key="armorName" class="candidate__armor">
              {{ armorName }}
            </span>
            <span class="candidate__talisman">护石：{{ view.talismanName }}</span>
          </p>

          <p v-if="view.decorations.length" class="candidate__line">
            <span class="candidate__line-label">珠子</span>
            <span
              v-for="decoration in view.decorations"
              :key="decoration.slot"
              class="candidate__deco"
            >
              {{ decoration.slot }} {{ decoration.name }}（{{ decoration.skills }}）
            </span>
          </p>

          <div class="candidate__skills">
            <el-tag
              v-for="skill in view.candidate.skills"
              :key="skill.name"
              size="small"
              effect="plain"
              :type="skill.satisfied ? 'success' : 'danger'"
            >
              {{ skill.name }} Lv{{ skill.level }}/{{ skill.target }}
            </el-tag>
          </div>

          <div class="candidate__actions">
            <el-button size="small" text @click="toggle(index)">
              {{ expanded === index ? '收起详情' : '详情' }}
            </el-button>
            <el-button size="small" text @click="emit('copy', view.candidate)">复制</el-button>
            <el-button size="small" type="primary" plain @click="emit('edit', view.candidate)">
              载入配装器
            </el-button>
          </div>

          <AutoBuildResultPanel
            v-if="expanded === index && data"
            :result="view.candidate"
            :data="data"
          />
        </article>

        <el-empty v-if="!views.length" description="没有搜索到配装" :image-size="80" />
      </el-scrollbar>
    </div>
  </el-drawer>
</template>

<style scoped lang="scss">
.auto-drawer {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;

  &__summary {
    color: $color-text-secondary;
    font-size: 13px;
  }

  &__scroll {
    padding-right: 4px;
  }
}

.candidate {
  padding: $spacing-sm $spacing-md;
  border: 1px solid $color-border;
  border-radius: $radius-md;
  background: $color-bg-white;

  & + & {
    margin-top: $spacing-sm;
  }

  &__header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: $spacing-sm;
  }

  &__index {
    color: $color-text-primary;
    font-size: 14px;
    font-weight: 700;
  }

  &__stats {
    color: $color-text-secondary;
    font-size: 12px;
  }

  &__score {
    color: $color-primary;
    font-size: 13px;
    font-weight: 700;
  }

  &__line {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 12px;
    margin-top: 6px;
    color: $color-text-regular;
    font-size: 12px;
  }

  &__line-label {
    color: $color-text-placeholder;
  }

  &__armor,
  &__deco {
    color: $color-text-secondary;
  }

  &__talisman {
    color: $color-text-secondary;
  }

  &__skills {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 8px;
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: $spacing-sm;
    margin-top: 6px;
  }
}
</style>
