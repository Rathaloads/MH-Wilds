<script setup lang="ts">
import { Delete, Edit, InfoFilled } from '@element-plus/icons-vue'

import type { EquipmentCardItem } from '@/types/build'
import { formatSkillMap, formatSlotLevels } from '@/utils/mh-format'

defineProps<{
  label: string
  item: EquipmentCardItem | null
  placeholder?: string
}>()

const emit = defineEmits<{
  detail: []
  change: []
  clear: []
}>()
</script>

<template>
  <article class="equipment" :class="{ 'equipment--empty': !item }">
    <header class="equipment__header">
      <span class="equipment__label">{{ label }}</span>
      <div class="equipment__actions">
        <el-button v-if="item" text size="small" :icon="InfoFilled" @click="emit('detail')"
          >详情</el-button
        >
        <el-button v-if="item" text size="small" :icon="Edit" @click="emit('change')"
          >更换</el-button
        >
        <el-button
          v-if="item"
          text
          size="small"
          :icon="Delete"
          aria-label="清除该装备"
          @click="emit('clear')"
        />
      </div>
    </header>

    <div v-if="item" class="equipment__body">
      <div class="equipment__title-row">
        <h3 class="equipment__name">{{ item.name }}</h3>
        <el-tag size="small" effect="plain">{{ item.tag }}</el-tag>
      </div>
      <div class="equipment__meta">
        <span class="equipment__slots">{{ formatSlotLevels(item.slots) }}</span>
        <span v-if="item.defense !== null" class="equipment__defense">DEF {{ item.defense }}</span>
      </div>
      <p class="equipment__skills">{{ formatSkillMap(item.skills) }}</p>
    </div>

    <div v-else class="equipment__empty">
      <span class="equipment__placeholder">{{ placeholder ?? '未选择装备' }}</span>
      <el-button type="primary" plain size="small" @click="emit('change')">选择</el-button>
    </div>
  </article>
</template>

<style scoped lang="scss">
.equipment {
  padding: $spacing-sm $spacing-md;
  border: 1px solid $color-border;
  border-radius: $radius-md;
  background: $color-bg-white;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: rgba(64, 158, 255, 0.45);
  }

  &--empty {
    border-style: dashed;
    background: rgba(245, 247, 250, 0.6);
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 24px;
  }

  &__label {
    color: $color-text-secondary;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.5px;
  }

  &__actions {
    display: flex;
    align-items: center;

    :deep(.el-button + .el-button) {
      margin-left: 2px;
    }
  }

  &__title-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 2px;
  }

  &__name {
    min-width: 0;
    color: $color-text-primary;
    font-size: 14px;
    font-weight: 600;

    @include text-ellipsis;
  }

  &__meta {
    display: flex;
    gap: $spacing-md;
    margin-top: 4px;
    color: $color-text-secondary;
    font-size: 12px;
  }

  &__skills {
    @include text-ellipsis(2);
    margin-top: 4px;
    color: $color-text-regular;
    font-size: 12px;
  }

  &__empty {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $spacing-sm;
    padding: $spacing-sm 0;
  }

  &__placeholder {
    color: $color-text-placeholder;
    font-size: 13px;
  }
}
</style>
