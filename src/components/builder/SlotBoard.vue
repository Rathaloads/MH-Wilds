<script setup lang="ts">
import type { DecorationOption, SlotGroup } from '@/types/build'
import { formatSkillMap, formatSlotLevel } from '@/utils/mh-format'

defineProps<{
  groups: SlotGroup[]
  options: Record<string, DecorationOption[]>
  selected: Record<string, number>
}>()

const emit = defineEmits<{
  change: [slotId: string, decorationIndex: number | null]
}>()

/** el-select 的 model-value 可能是 number / undefined / ''，统一转成下标或 null */
function toDecorationIndex(value: unknown): number | null {
  return typeof value === 'number' ? value : null
}

function handleChange(slotId: string, value: unknown): void {
  emit('change', slotId, toDecorationIndex(value))
}

function slotTagType(level: number): 'danger' | 'warning' | 'info' {
  if (level >= 3) return 'danger'
  if (level === 2) return 'warning'
  return 'info'
}
</script>

<template>
  <div class="slot-board">
    <section v-for="group in groups" :key="group.key" class="slot-board__group">
      <header class="slot-board__header">
        <span class="slot-board__label">{{ group.label }}</span>
        <span class="slot-board__count">{{ group.slots.length }} 个孔位</span>
      </header>

      <div class="slot-board__rows">
        <div v-for="(slot, index) in group.slots" :key="slot.id" class="slot-board__row">
          <span class="slot-board__index">#{{ index + 1 }}</span>
          <el-tag size="small" effect="light" :type="slotTagType(slot.level)">
            {{ formatSlotLevel(slot.level) }}
          </el-tag>
          <el-select
            :model-value="selected[slot.id] ?? null"
            class="slot-board__select"
            size="small"
            filterable
            clearable
            placeholder="空孔位（点击镶嵌装饰品）"
            @update:model-value="handleChange(slot.id, $event)"
          >
            <el-option
              v-for="option in options[slot.id] ?? []"
              :key="option.index"
              :value="option.index"
              :label="option.name"
            >
              <div class="slot-board__option">
                <span class="slot-board__option-name">{{ option.name }}</span>
                <span class="slot-board__option-skill">{{ formatSkillMap(option.skills) }}</span>
              </div>
            </el-option>
          </el-select>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.slot-board {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;

  &__group {
    padding: $spacing-sm $spacing-md $spacing-md;
    border: 1px solid $color-border;
    border-radius: $radius-md;
    background: $color-bg-white;
  }

  &__header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: $spacing-sm;
  }

  &__label {
    color: $color-text-primary;
    font-size: 13px;
    font-weight: 600;
  }

  &__count {
    color: $color-text-secondary;
    font-size: 12px;
  }

  &__rows {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
  }

  &__row {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
  }

  &__index {
    flex: none;
    width: 22px;
    color: $color-text-placeholder;
    font-size: 12px;
  }

  &__select {
    flex: 1;
    min-width: 0;
  }

  &__option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $spacing-md;
  }

  &__option-name {
    color: $color-text-primary;
    font-size: 13px;
  }

  &__option-skill {
    color: $color-text-secondary;
    font-size: 12px;
  }
}
</style>
