<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import { CopyDocument, FolderOpened, Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

import BuilderPickerDialog from '@/components/builder/BuilderPickerDialog.vue'
import BuildLibraryDialog from '@/components/builder/BuildLibraryDialog.vue'
import EquipmentCard from '@/components/builder/EquipmentCard.vue'
import EquipmentDetailDialog from '@/components/builder/EquipmentDetailDialog.vue'
import SkillSummaryPanel from '@/components/builder/SkillSummaryPanel.vue'
import SlotBoard from '@/components/builder/SlotBoard.vue'
import { useLoadout } from '@/composables/useLoadout'
import { useMhWildsData } from '@/composables/useMhWildsData'
import { useLoadoutDraftStore } from '@/stores/loadout-draft'
import {
  ARMOR_PART_META,
  type EquipmentCardItem,
  type EquipmentDetail,
  type LoadoutSelection,
  type PickerItem,
  type SlotGroup,
} from '@/types/build'
import type { ArmorPart } from '@/types/mh-wilds'
import { formatSkillMap, formatSlotLabel } from '@/utils/mh-format'
import { rankForRarity } from '@/utils/loadout-calc'
import { resolveEquipmentSnapshot } from '@/utils/loadout-snapshot'

const { data, error, loading, load } = useMhWildsData()
const loadoutDraft = useLoadoutDraftStore()
const {
  weapon,
  armorPieces,
  talisman,
  slots,
  decorationIndexBySlot,
  decorationOptionsBySlot,
  decorationBySlot,
  summary,
  selectWeapon,
  selectArmor,
  selectTalisman,
  setDecoration,
  reset,
  applySelection,
  getSelection,
} = useLoadout(data)

type PickerTarget = { type: 'weapon' } | { type: 'armor'; part: ArmorPart } | { type: 'talisman' }

const skillFilter = shallowRef('')
const pickerVisible = shallowRef(false)
const pickerTarget = shallowRef<PickerTarget>({ type: 'weapon' })
const libraryVisible = shallowRef(false)
/** 装备详情弹窗 */
const detailVisible = shallowRef(false)
const detail = shallowRef<EquipmentDetail | null>(null)

const skillOptions = computed(() => (data.value?.skills ?? []).map((skill) => skill.name))

// ---------- 候选装备（选择弹窗列表） ----------
const weaponPickerItems = computed<PickerItem[]>(() =>
  (data.value?.weapons ?? []).map((item, index) => ({
    index,
    title: item.name,
    tag: item.type,
    skills: item.skills,
    slots: item.slots,
    defense: null,
  })),
)

const talismanPickerItems = computed<PickerItem[]>(() =>
  (data.value?.talismans ?? []).map((item, index) => ({
    index,
    title: item.name,
    tag: '护石',
    skills: item.skills,
    slots: item.slots,
    defense: null,
  })),
)

const armorPickerItems = computed<Record<ArmorPart, PickerItem[]>>(() => {
  const result = {} as Record<ArmorPart, PickerItem[]>

  for (const meta of ARMOR_PART_META) {
    result[meta.part] = (data.value?.armors[meta.part] ?? []).map((item, index) => ({
      index,
      title: item.name,
      tag: meta.label,
      skills: item.skills,
      slots: item.slots,
      defense: item.defense,
    }))
  }

  return result
})

function filterBySkill(items: PickerItem[]): PickerItem[] {
  const name = skillFilter.value
  return name ? items.filter((item) => name in item.skills) : items
}

const pickerItems = computed<PickerItem[]>(() => {
  const target = pickerTarget.value
  if (target.type === 'weapon') return filterBySkill(weaponPickerItems.value)
  if (target.type === 'talisman') return filterBySkill(talismanPickerItems.value)
  return filterBySkill(armorPickerItems.value[target.part])
})

const pickerTags = computed<string[] | undefined>(() =>
  pickerTarget.value.type === 'weapon' ? data.value?.weaponTypes : undefined,
)

const pickerTitle = computed(() => {
  const target = pickerTarget.value
  if (target.type === 'weapon') return '选择武器'
  if (target.type === 'talisman') return '选择护石'

  const meta = ARMOR_PART_META.find((item) => item.part === target.part)
  return `选择${meta?.label ?? '防具'}`
})

// ---------- 装备卡片 ----------
const weaponCard = computed<EquipmentCardItem | null>(() => {
  const item = weapon.value
  if (!item) return null
  return { name: item.name, tag: item.type, skills: item.skills, slots: item.slots, defense: null }
})

const armorCards = computed(() =>
  ARMOR_PART_META.map((meta) => {
    const item = armorPieces.value[meta.part]
    return {
      meta,
      card: item
        ? {
            name: item.name,
            tag: meta.label,
            skills: item.skills,
            slots: item.slots,
            defense: item.defense,
          }
        : null,
    }
  }),
)

const talismanCard = computed<EquipmentCardItem | null>(() => {
  const item = talisman.value
  if (!item) return null
  return { name: item.name, tag: '护石', skills: item.skills, slots: item.slots, defense: null }
})

const equipmentCount = computed(
  () =>
    (weapon.value ? 1 : 0) +
    (talisman.value ? 1 : 0) +
    Object.values(armorPieces.value).filter((armor) => armor !== null).length,
)

const slotGroups = computed<SlotGroup[]>(() => {
  const groups: SlotGroup[] = []

  const weaponSlots = slots.value.filter((slot) => slot.owner === 'weapon')
  if (weaponSlots.length) groups.push({ key: 'weapon', label: '武器孔位', slots: weaponSlots })

  for (const meta of ARMOR_PART_META) {
    const partSlots = slots.value.filter((slot) => slot.part === meta.part)
    if (partSlots.length)
      groups.push({ key: meta.part, label: `${meta.label}孔位`, slots: partSlots })
  }

  const talismanSlots = slots.value.filter((slot) => slot.owner === 'talisman')
  if (talismanSlots.length)
    groups.push({ key: 'talisman', label: '护石孔位', slots: talismanSlots })

  return groups
})

const currentSelection = computed<LoadoutSelection>(() => getSelection())

// ---------- 交互 ----------
function openPicker(target: PickerTarget): void {
  pickerTarget.value = target
  pickerVisible.value = true
}

function handlePick(index: number): void {
  const target = pickerTarget.value
  if (target.type === 'weapon') {
    selectWeapon(index)
    return
  }
  if (target.type === 'talisman') {
    selectTalisman(index)
    return
  }
  selectArmor(target.part, index)
}

/** 打开当前武器详情 */
function showWeaponDetail(): void {
  const item = weapon.value
  if (!item) return

  detail.value = {
    kind: 'weapon',
    label: '武器',
    name: item.name,
    tag: item.type,
    rank: rankForRarity(item.rarity),
    rarity: item.rarity,
    attack: item.attack,
    defense: null,
    series: item.series,
    slots: item.slots,
    skills: item.skills,
    seriesSkills: {},
    groupSkills: {},
  }
  detailVisible.value = true
}

/** 打开指定部位防具详情 */
function showArmorDetail(part: ArmorPart): void {
  const item = armorPieces.value[part]
  if (!item) return

  const meta = ARMOR_PART_META.find((entry) => entry.part === part)

  detail.value = {
    kind: 'armor',
    label: meta?.label ?? '防具',
    name: item.name,
    tag: item.slot,
    rank: item.rank,
    rarity: null,
    attack: null,
    defense: item.defense,
    series: item.series,
    slots: item.slots,
    skills: item.skills,
    seriesSkills: item.seriesSkills,
    groupSkills: item.groupSkills,
  }
  detailVisible.value = true
}

/** 打开护石详情 */
function showTalismanDetail(): void {
  const item = talisman.value
  if (!item) return

  detail.value = {
    kind: 'talisman',
    label: '护石',
    name: item.name,
    tag: '护石',
    rank: '',
    rarity: null,
    attack: null,
    defense: null,
    series: '',
    slots: item.slots,
    skills: item.skills,
    seriesSkills: {},
    groupSkills: {},
  }
  detailVisible.value = true
}

function clearWeapon(): void {
  selectWeapon(null)
}

function clearArmor(part: ArmorPart): void {
  selectArmor(part, null)
}

function clearTalisman(): void {
  selectTalisman(null)
}

function handleDecorationChange(slotId: string, decorationIndex: number | null): void {
  setDecoration(slotId, decorationIndex)
}

function handleReset(): void {
  reset()
  ElMessage.success('已清空配装')
}

function handleLoad(selection: LoadoutSelection): void {
  applySelection(selection)
  ElMessage.success('已读取配装')
}

/** 生成可分享的配装文本 */
function buildShareText(): string {
  const lines = ['【怪物猎人荒野配装】']

  lines.push(`武器：${weapon.value?.name ?? '未选择'}`)
  for (const meta of ARMOR_PART_META) {
    lines.push(`${meta.label}：${armorPieces.value[meta.part]?.name ?? '未选择'}`)
  }
  lines.push(`护石：${talisman.value?.name ?? '未选择'}`)

  // 已镶嵌的珠子（含孔位与提供技能）
  const decorationLines = [...decorationBySlot.value.entries()].map(
    ([slotId, decoration]) =>
      `${formatSlotLabel(slotId)}：${decoration.name}（${formatSkillMap(decoration.skills, 2)}）`,
  )
  if (decorationLines.length) {
    lines.push('装饰品：', ...decorationLines.map((line) => `  ${line}`))
  }

  lines.push(`防御力：${summary.value.defense}`)

  const activeSkills = summary.value.skills.map((skill) => `${skill.name} Lv${skill.level}`)
  if (activeSkills.length) lines.push(`技能：${activeSkills.join('、')}`)

  const activeSeries = summary.value.series.filter((bonus) => bonus.active)
  if (activeSeries.length) {
    lines.push(
      `系列技能：${activeSeries.map((bonus) => `${bonus.name} Lv${bonus.level}`).join('、')}`,
    )
  }

  const activeGroups = summary.value.groups.filter((bonus) => bonus.active)
  if (activeGroups.length)
    lines.push(`组技能：${activeGroups.map((bonus) => bonus.name).join('、')}`)

  return lines.join('\n')
}

async function copyLoadout(): Promise<void> {
  try {
    await navigator.clipboard.writeText(buildShareText())
    ElMessage.success('配装文本已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败，请检查浏览器剪贴板权限')
  }
}

onMounted(async () => {
  await load()
  if (!data.value) return

  // 接收首页「自动配装」生成的结果，继续微调
  const draft = loadoutDraft.consume()
  if (!draft) return

  // 优先按装备名称还原（数据文件更新后下标可能变化），名称缺失时按下标
  const resolved = draft.members ? resolveEquipmentSnapshot(data.value, draft.members) : null
  if (draft.members && !resolved) {
    ElMessage.warning('自动配装结果中的装备在当前数据中不存在（数据可能已更新），已忽略')
    return
  }

  applySelection(resolved ?? draft.selection)
  ElMessage.success('已载入自动配装结果，可继续微调')
})
</script>

<template>
  <div class="builder">
    <header class="builder__toolbar">
      <div class="builder__toolbar-title">
        <h1 class="builder__title">配装器</h1>
        <p class="builder__desc">
          选择武器、防具、护石与装饰品，实时计算技能合计、系列技能与组技能
        </p>
      </div>

      <div class="builder__toolbar-actions">
        <el-select
          v-model="skillFilter"
          class="builder__skill-filter"
          clearable
          filterable
          placeholder="按技能筛选候选装备"
        >
          <el-option v-for="name in skillOptions" :key="name" :value="name" :label="name" />
        </el-select>
        <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        <el-button :icon="FolderOpened" @click="libraryVisible = true">配装存档</el-button>
        <el-button type="primary" :icon="CopyDocument" @click="copyLoadout">复制配装</el-button>
      </div>
    </header>

    <el-alert
      v-if="error"
      class="builder__alert"
      type="error"
      show-icon
      :closable="false"
      :title="`数据加载失败：${error}`"
    >
      <el-button size="small" type="primary" @click="load()">重试</el-button>
    </el-alert>

    <div v-else-if="!data" class="builder__loading">
      <p class="builder__loading-text">
        {{ loading ? '正在加载配装数据…' : '正在准备数据…' }}
      </p>
      <el-skeleton :rows="8" animated />
    </div>

    <div v-else class="builder__body">
      <section class="builder__column builder__equipment">
        <h2 class="builder__section-title">装备</h2>
        <EquipmentCard
          label="武器"
          :item="weaponCard"
          placeholder="选择武器"
          @detail="showWeaponDetail"
          @change="openPicker({ type: 'weapon' })"
          @clear="clearWeapon"
        />
        <EquipmentCard
          v-for="entry in armorCards"
          :key="entry.meta.part"
          :label="entry.meta.label"
          :item="entry.card"
          placeholder="选择防具"
          @detail="showArmorDetail(entry.meta.part)"
          @change="openPicker({ type: 'armor', part: entry.meta.part })"
          @clear="clearArmor(entry.meta.part)"
        />
        <EquipmentCard
          label="护石"
          :item="talismanCard"
          placeholder="选择护石"
          @detail="showTalismanDetail"
          @change="openPicker({ type: 'talisman' })"
          @clear="clearTalisman"
        />
      </section>

      <section class="builder__column builder__slots">
        <h2 class="builder__section-title">孔位与装饰品</h2>
        <SlotBoard
          v-if="slotGroups.length"
          :groups="slotGroups"
          :options="decorationOptionsBySlot"
          :selected="decorationIndexBySlot"
          @change="handleDecorationChange"
        />
        <el-empty v-else description="选择带孔位的装备后可镶嵌装饰品" :image-size="70" />
      </section>

      <aside class="builder__column builder__summary">
        <h2 class="builder__section-title">配装合计</h2>
        <SkillSummaryPanel :summary="summary" :equipment-count="equipmentCount" />
      </aside>
    </div>

    <BuilderPickerDialog
      v-model="pickerVisible"
      :title="pickerTitle"
      :items="pickerItems"
      :tags="pickerTags"
      :skill-filter="skillFilter"
      @select="handlePick"
    />

    <BuildLibraryDialog
      v-model="libraryVisible"
      :selection="currentSelection"
      :data="data"
      @load="handleLoad"
    />

    <EquipmentDetailDialog v-model="detailVisible" :detail="detail" />
  </div>
</template>

<style scoped lang="scss">
.builder {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
  height: 100%;
  padding: $spacing-md;
  overflow-y: auto;

  &__toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: $spacing-md;
  }

  &__title {
    color: $color-text-primary;
    font-size: 22px;
    font-weight: 700;
  }

  &__desc {
    margin-top: 2px;
    color: $color-text-secondary;
    font-size: 13px;
  }

  &__toolbar-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: $spacing-sm;
  }

  &__skill-filter {
    width: 210px;
  }

  &__alert {
    align-items: center;
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

  &__body {
    display: grid;
    grid-template-columns: 320px minmax(0, 1fr) 380px;
    align-items: start;
    gap: $spacing-md;
  }

  &__column {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
    min-width: 0;
  }

  &__section-title {
    color: $color-text-primary;
    font-size: 14px;
    font-weight: 600;
    padding-left: 2px;
  }

  &__equipment {
    gap: $spacing-sm;
  }

  @include respond-to('xl') {
    &__body {
      grid-template-columns: 300px minmax(0, 1fr);
    }

    &__summary {
      grid-column: 1 / -1;
    }
  }

  @include respond-to('lg') {
    &__body {
      grid-template-columns: 1fr;
    }

    &__skill-filter {
      width: 100%;
    }
  }
}
</style>
