<script setup lang="ts">
import { computed, onMounted, reactive, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { MagicStick, RefreshLeft } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

import AutoBuildDrawer from '@/components/autobuild/AutoBuildDrawer.vue'
import SkillRequirementPicker from '@/components/autobuild/SkillRequirementPicker.vue'
import DataSourceSwitch from '@/components/common/DataSourceSwitch.vue'
import { useMhWildsData } from '@/composables/useMhWildsData'
import { useLoadoutDraftStore } from '@/stores/loadout-draft'
import {
  ARMOR_PART_META,
  GROUP_SKILL_MAX,
  SERIES_SKILL_MAX,
  SKILL_CATEGORY_META,
} from '@/types/build'
import type {
  AutoBuildCandidate,
  AutoBuildSkillGroup,
  RankScope,
  SkillRequirement,
} from '@/types/auto-build'
import type { SkillCategory, WeaponType } from '@/types/mh-wilds'
import { autoBuildCandidates } from '@/utils/auto-build'
import { formatSkillMap, formatSlotLabel } from '@/utils/mh-format'

const router = useRouter()
const draftStore = useLoadoutDraftStore()
const { data, error, loading, load, source } = useMhWildsData()

/** 目标技能：技能名 → 目标等级 */
const requirements = reactive<Record<string, number>>({})
const weaponType = shallowRef<WeaponType | ''>('')
/** 指定武器下标（可选）；有值时只围绕该武器配装 */
const specifiedWeaponIndex = shallowRef<number | null>(null)
/** 装备范围：上位 / 下位 / 不限（自动挑选武器与防具的候选池） */
const rankScope = shallowRef<RankScope>('any')

const candidates = shallowRef<AutoBuildCandidate[]>([])
const fullySatisfiedCount = shallowRef(0)
const totalCandidates = shallowRef(0)
const building = shallowRef(false)
const drawerVisible = shallowRef(false)

/** 防止「计算中修改目标」导致旧结果覆盖新状态 */
let buildToken = 0

const weaponTypes = computed(() => data.value?.weaponTypes ?? [])

/** 当前武器类型下的武器（用于「指定武器」下拉） */
const weaponOptions = computed(() => {
  const type = weaponType.value
  if (!type) return []

  const options: { index: number; name: string }[] = []
  const weapons = data.value?.weapons ?? []
  for (const [index, weapon] of weapons.entries()) {
    if (weapon.type === type) options.push({ index, name: weapon.name })
  }

  return options
})

/** 选中的指定武器（下标失效或类型不匹配时为 null） */
const specifiedWeapon = computed(() => {
  const index = specifiedWeaponIndex.value
  if (typeof index !== 'number') return null

  const weapon = data.value?.weapons[index]
  return weapon && weapon.type === weaponType.value ? weapon : null
})

function setSpecifiedWeapon(value: number | null): void {
  specifiedWeaponIndex.value = typeof value === 'number' ? value : null
}

/** 实际生效的装备范围：指定武器时跟随该武器的上下位（与算法口径一致） */
const effectiveRankScope = computed<RankScope>(() => {
  const weapon = specifiedWeapon.value
  if (!weapon) return rankScope.value
  return weapon.rarity <= 4 ? 'low' : 'high'
})

const skillByName = computed(() => {
  const map = new Map<string, { category: SkillCategory }>()
  for (const skill of data.value?.skills ?? []) map.set(skill.name, { category: skill.category })
  return map
})

/** 按类别分组的全部可选技能（排除数据占位用的 preserver 技能） */
const skillGroups = computed<AutoBuildSkillGroup[]>(() => {
  const groups = new Map<SkillCategory, AutoBuildSkillGroup>()

  for (const skill of data.value?.skills ?? []) {
    if (skill.category === 'preserver') continue

    let group = groups.get(skill.category)
    if (!group) {
      group = {
        category: skill.category,
        label: SKILL_CATEGORY_META[skill.category].label,
        skills: [],
      }
      groups.set(skill.category, group)
    }

    const max =
      skill.category === 'series'
        ? SERIES_SKILL_MAX
        : skill.category === 'group'
          ? GROUP_SKILL_MAX
          : skill.max

    group.skills.push({ name: skill.name, max })
  }

  return [...groups.values()]
    .sort(
      (left, right) =>
        SKILL_CATEGORY_META[left.category].order - SKILL_CATEGORY_META[right.category].order,
    )
    .map((group) => ({
      ...group,
      skills: [...group.skills].sort((left, right) =>
        left.name.localeCompare(right.name, 'zh-Hans-CN'),
      ),
    }))
})

const selectedSkills = computed<SkillRequirement[]>(() => {
  const list: SkillRequirement[] = []

  for (const [name, level] of Object.entries(requirements)) {
    if (level <= 0) continue
    const skill = skillByName.value.get(name)
    if (!skill) continue
    list.push({ name, level, category: skill.category })
  }

  return list.sort((left, right) => {
    const orderDiff =
      SKILL_CATEGORY_META[left.category].order - SKILL_CATEGORY_META[right.category].order
    return orderDiff !== 0 ? orderDiff : left.name.localeCompare(right.name, 'zh-Hans-CN')
  })
})

const totalSelected = computed(() => selectedSkills.value.length)

/** 目标或武器类型变化后，已有结果失效 */
function invalidateResults(): void {
  buildToken += 1
  candidates.value = []
  fullySatisfiedCount.value = 0
  totalCandidates.value = 0
  drawerVisible.value = false
}

function setSkillLevel(name: string, level: number): void {
  if (level <= 0) delete requirements[name]
  else requirements[name] = level

  if (candidates.value.length || drawerVisible.value) invalidateResults()
}

function clearRequirements(): void {
  for (const name of Object.keys(requirements)) delete requirements[name]
  invalidateResults()
}

watch(weaponType, () => {
  // 武器类型变化后，之前指定的武器不再适用
  specifiedWeaponIndex.value = null
  if (candidates.value.length || drawerVisible.value) invalidateResults()
})

// 指定武器变化后，已有结果失效；指定武器时装备范围跟随该武器
watch(specifiedWeaponIndex, () => {
  const weapon = specifiedWeapon.value
  if (weapon) rankScope.value = weapon.rarity <= 4 ? 'low' : 'high'
  if (candidates.value.length || drawerVisible.value) invalidateResults()
})

// 装备范围变化后，已有结果失效
watch(rankScope, () => {
  if (candidates.value.length || drawerVisible.value) invalidateResults()
})

// 切换数据源后清空目标与结果（两套数据的技能名 / 装备下标不通用）
watch(source, () => {
  specifiedWeaponIndex.value = null
  for (const name of Object.keys(requirements)) delete requirements[name]
  invalidateResults()
})

async function runAutoBuild(): Promise<void> {
  const currentData = data.value
  const type = weaponType.value

  if (!currentData || !type || selectedSkills.value.length === 0) {
    ElMessage.warning('请先选择武器类型与至少一个目标技能')
    return
  }

  const token = ++buildToken
  building.value = true
  drawerVisible.value = true
  candidates.value = []
  fullySatisfiedCount.value = 0
  totalCandidates.value = 0

  // 让抽屉的 loading 状态先渲染，再执行组合搜索
  await new Promise((resolve) => setTimeout(resolve, 30))

  try {
    const result = autoBuildCandidates(currentData, {
      weaponType: type,
      weaponIndex: specifiedWeapon.value ? specifiedWeaponIndex.value : null,
      rankScope: effectiveRankScope.value,
      requirements: selectedSkills.value,
    })

    if (token !== buildToken) return

    candidates.value = result.candidates
    fullySatisfiedCount.value = result.fullySatisfiedCount
    totalCandidates.value = result.totalCandidates

    if (!result.candidates.length) ElMessage.warning('没有搜索到符合条件的配装')
  } finally {
    if (token === buildToken) building.value = false
  }
}

function editCandidate(candidate: AutoBuildCandidate): void {
  draftStore.setPending(candidate.selection, source.value)
  drawerVisible.value = false
  void router.push({ name: 'builder' })
}

/** 生成单套配装的复制文本 */
function buildCandidateText(candidate: AutoBuildCandidate): string {
  const currentData = data.value
  if (!currentData) return ''

  const { selection } = candidate
  const lines = ['【自动配装】']
  if (weaponType.value) lines.push(`武器类型：${weaponType.value}`)

  const weapon = selection.weaponIndex === null ? null : currentData.weapons[selection.weaponIndex]
  lines.push(`武器：${weapon?.name ?? '未选择'}`)

  for (const meta of ARMOR_PART_META) {
    const index = selection.armorIndices[meta.part]
    const armor = index === null ? null : currentData.armors[meta.part][index]
    lines.push(`${meta.label}：${armor?.name ?? '未选择'}`)
  }

  const talisman =
    selection.talismanIndex === null ? null : currentData.talismans[selection.talismanIndex]
  lines.push(`护石：${talisman?.name ?? '无需护石'}`)

  const decorationLines = Object.entries(selection.decorationIndices)
    .map(([slotId, index]) => {
      const decoration = currentData.decorations[index]
      return decoration
        ? `${formatSlotLabel(slotId)}：${decoration.name}（${formatSkillMap(decoration.skills, 2)}）`
        : ''
    })
    .filter(Boolean)
  if (decorationLines.length) {
    lines.push('装饰品：', ...decorationLines.map((line) => `  ${line}`))
  }

  lines.push(`防御力：${candidate.defense}`)
  lines.push(
    `技能：${candidate.skills.map((skill) => `${skill.name} ${skill.level}/${skill.target}`).join('、')}`,
  )

  return lines.join('\n')
}

async function copyCandidate(candidate: AutoBuildCandidate): Promise<void> {
  try {
    await navigator.clipboard.writeText(buildCandidateText(candidate))
    ElMessage.success('配装文本已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败，请检查浏览器剪贴板权限')
  }
}

onMounted(() => {
  void load()
})
</script>

<template>
  <div class="auto-build">
    <header class="auto-build__header">
      <div class="auto-build__heading">
        <h1 class="auto-build__title">自动配装</h1>
        <p class="auto-build__desc">
          顶部选择武器类型（可进一步指定具体武器），中间为全部目标技能（按类别归集），底部点击「自动配装」查看所有符合的配装
        </p>
      </div>
      <DataSourceSwitch />
    </header>

    <el-alert
      v-if="error"
      type="error"
      show-icon
      :closable="false"
      :title="`数据加载失败：${error}`"
    >
      <el-button size="small" type="primary" @click="load()">重试</el-button>
    </el-alert>

    <div v-else-if="!data" class="auto-build__loading">
      <p class="auto-build__loading-text">
        {{
          loading
            ? `正在加载${source === 'online' ? '在线数据（首次约数秒）' : '本地数据'}…`
            : '正在准备数据…'
        }}
      </p>
      <el-skeleton :rows="8" animated />
    </div>

    <template v-else>
      <section class="auto-build__weapon">
        <span class="auto-build__weapon-label">武器类型</span>
        <el-select
          v-model="weaponType"
          class="auto-build__weapon-select"
          placeholder="选择武器类型"
        >
          <el-option v-for="type in weaponTypes" :key="type" :value="type" :label="type" />
        </el-select>

        <span class="auto-build__weapon-label">指定武器</span>
        <el-select
          class="auto-build__weapon-select auto-build__weapon-select--specific"
          :model-value="specifiedWeaponIndex"
          :disabled="!weaponType"
          clearable
          filterable
          placeholder="不限，自动挑选"
          no-data-text="该类型下没有可选武器"
          @update:model-value="setSpecifiedWeapon"
        >
          <el-option
            v-for="option in weaponOptions"
            :key="option.index"
            :value="option.index"
            :label="option.name"
          />
        </el-select>

        <span class="auto-build__weapon-label">装备范围</span>
        <el-radio-group
          v-model="rankScope"
          class="auto-build__rank-scope"
          size="small"
          :disabled="Boolean(specifiedWeapon)"
        >
          <el-radio-button value="any">不限</el-radio-button>
          <el-radio-button value="high">优先上位</el-radio-button>
          <el-radio-button value="low">优先下位</el-radio-button>
        </el-radio-group>

        <span class="auto-build__weapon-hint">
          武器与防具都会按装备范围筛选；指定武器时范围跟随该武器
        </span>
      </section>

      <div class="auto-build__scroll">
        <section class="auto-build__skills">
          <header class="auto-build__skills-header">
            <div class="auto-build__skills-title">
              <h2>目标技能</h2>
              <span class="auto-build__skills-count">已选 {{ totalSelected }} 个技能</span>
            </div>
            <el-button
              v-if="totalSelected"
              text
              size="small"
              :icon="RefreshLeft"
              @click="clearRequirements"
            >
              清空
            </el-button>
          </header>

          <div v-if="selectedSkills.length" class="auto-build__selected">
            <el-tag
              v-for="skill in selectedSkills"
              :key="skill.name"
              type="primary"
              effect="light"
              closable
              @close="setSkillLevel(skill.name, 0)"
            >
              {{ skill.name }} Lv{{ skill.level }}
            </el-tag>
          </div>

          <SkillRequirementPicker
            :groups="skillGroups"
            :selected="requirements"
            @update:level="setSkillLevel"
          />
        </section>
      </div>

      <footer class="auto-build__footer">
        <span class="auto-build__footer-hint">
          已选 {{ totalSelected }} 个技能 · 武器
          {{ weaponType || '未选择' }}
          <template v-if="specifiedWeapon"> · 指定 {{ specifiedWeapon.name }}</template>
          · 装备范围
          {{
            effectiveRankScope === 'high' ? '上位' : effectiveRankScope === 'low' ? '下位' : '不限'
          }}
        </span>
        <el-button
          type="primary"
          size="large"
          :icon="MagicStick"
          :loading="building"
          :disabled="!weaponType || totalSelected === 0"
          @click="runAutoBuild"
        >
          自动配装
        </el-button>
      </footer>
    </template>

    <AutoBuildDrawer
      v-model="drawerVisible"
      :candidates="candidates"
      :data="data"
      :fully-satisfied-count="fullySatisfiedCount"
      :total-candidates="totalCandidates"
      :loading="building"
      @edit="editCandidate"
      @copy="copyCandidate"
    />
  </div>
</template>

<style scoped lang="scss">
.auto-build {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
  height: 100%;
  padding: $spacing-md;
  overflow: hidden;

  &__header {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: $spacing-md;
  }

  &__heading {
    min-width: 0;
  }

  &__title {
    color: $color-text-primary;
    font-size: 22px;
    font-weight: 700;
  }

  &__desc {
    max-width: 720px;
    margin-top: 2px;
    color: $color-text-secondary;
    font-size: 13px;
    line-height: 1.6;
  }

  &__loading {
    padding: $spacing-md;
    border-radius: $radius-md;
    background: $color-bg-white;
  }

  &__loading-text {
    margin-bottom: $spacing-sm;
    color: $color-text-secondary;
    font-size: 13px;
  }

  &__weapon {
    display: flex;
    flex: none;
    flex-wrap: wrap;
    align-items: center;
    gap: $spacing-sm;
    padding: $spacing-sm $spacing-md;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    background: $color-bg-white;
  }

  &__weapon-label {
    color: $color-text-primary;
    font-size: 14px;
    font-weight: 600;
  }

  &__weapon-select {
    width: 180px;

    &--specific {
      width: 240px;
    }
  }

  &__weapon-hint {
    color: $color-text-placeholder;
    font-size: 12px;
  }

  &__rank-scope {
    flex: none;
  }

  &__scroll {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    overflow-y: auto;
    padding-right: 4px;
  }

  &__skills {
    display: flex;
    flex-direction: column;
    gap: $spacing-md;
    padding: $spacing-md;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    background: $color-bg-white;
  }

  &__skills-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: $spacing-sm;
  }

  &__skills-title {
    display: flex;
    align-items: baseline;
    gap: $spacing-sm;

    h2 {
      color: $color-text-primary;
      font-size: 15px;
      font-weight: 600;
    }
  }

  &__skills-count {
    color: $color-text-placeholder;
    font-size: 12px;
  }

  &__selected {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: $spacing-sm;
    border-radius: $radius-sm;
    background: rgba(64, 158, 255, 0.06);
  }

  &__footer {
    display: flex;
    flex: none;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: $spacing-md;
    padding: $spacing-sm $spacing-md;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    background: $color-bg-white;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.04);
  }

  &__footer-hint {
    color: $color-text-secondary;
    font-size: 13px;
  }

  @include respond-to('md') {
    &__weapon-select {
      flex: 1;
    }

    &__footer {
      justify-content: stretch;

      .el-button {
        width: 100%;
      }
    }
  }
}
</style>
