<script setup lang="ts">
import { computed, shallowRef } from 'vue'

import type { AutoBuildSkillGroup } from '@/types/auto-build'

const props = defineProps<{
  groups: AutoBuildSkillGroup[]
  selected: Readonly<Record<string, number>>
}>()

const emit = defineEmits<{
  'update:level': [name: string, level: number]
}>()

const keyword = shallowRef('')

/** 搜索只在需要时过滤，默认展示全部技能 */
const filteredGroups = computed<AutoBuildSkillGroup[]>(() => {
  const text = keyword.value.trim().toLowerCase()
  if (!text) return props.groups

  return props.groups
    .map((group) => ({
      ...group,
      skills: group.skills.filter((skill) => skill.name.toLowerCase().includes(text)),
    }))
    .filter((group) => group.skills.length > 0)
})

function countSelected(group: AutoBuildSkillGroup): number {
  return group.skills.filter((skill) => (props.selected[skill.name] ?? 0) > 0).length
}

function levelOptions(max: number): number[] {
  return Array.from({ length: max + 1 }, (_, index) => index)
}

function handleLevelChange(name: string, value: unknown): void {
  emit('update:level', name, typeof value === 'number' ? value : 0)
}
</script>

<template>
  <div class="skill-picker">
    <el-input
      v-model="keyword"
      class="skill-picker__search"
      size="small"
      clearable
      placeholder="搜索技能名称（可选）"
    />

    <section v-for="group in filteredGroups" :key="group.category" class="skill-picker__group">
      <header class="skill-picker__group-header">
        <h3 class="skill-picker__group-title">{{ group.label }}</h3>
        <span class="skill-picker__group-count">
          {{ group.skills.length }} 个技能 · 已选 {{ countSelected(group) }}
        </span>
      </header>

      <ul class="skill-picker__list">
        <li
          v-for="skill in group.skills"
          :key="skill.name"
          class="skill-picker__row"
          :class="{ 'skill-picker__row--selected': (selected[skill.name] ?? 0) > 0 }"
        >
          <div class="skill-picker__info">
            <span class="skill-picker__name">{{ skill.name }}</span>
            <span class="skill-picker__max">Lv{{ skill.max }}</span>
          </div>
          <el-select
            :model-value="selected[skill.name] ?? 0"
            class="skill-picker__select"
            size="small"
            @update:model-value="handleLevelChange(skill.name, $event)"
          >
            <el-option
              v-for="level in levelOptions(skill.max)"
              :key="level"
              :value="level"
              :label="level === 0 ? '未选' : `Lv${level}`"
            />
          </el-select>
        </li>
      </ul>
    </section>

    <el-empty v-if="!filteredGroups.length" description="没有匹配的技能" :image-size="60" />
  </div>
</template>

<style scoped lang="scss">
.skill-picker {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;

  &__search {
    max-width: 320px;
  }

  &__group {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
  }

  &__group-header {
    display: flex;
    align-items: baseline;
    gap: $spacing-sm;
    padding-bottom: 4px;
    border-bottom: 1px solid $color-border-light;
  }

  &__group-title {
    color: $color-text-primary;
    font-size: 14px;
    font-weight: 600;
  }

  &__group-count {
    color: $color-text-placeholder;
    font-size: 12px;
  }

  &__list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 2px 16px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $spacing-sm;
    min-height: 32px;
    padding: 2px 8px;
    border-radius: $radius-sm;

    &:hover {
      background: rgba(64, 158, 255, 0.05);
    }

    &--selected {
      background: rgba(64, 158, 255, 0.08);
    }
  }

  &__info {
    display: flex;
    align-items: baseline;
    gap: 6px;
    min-width: 0;
  }

  &__name {
    @include text-ellipsis;
    color: $color-text-primary;
    font-size: 13px;
  }

  &__max {
    flex: none;
    color: $color-text-placeholder;
    font-size: 11px;
  }

  &__select {
    width: 84px;
    flex: none;
  }
}
</style>
