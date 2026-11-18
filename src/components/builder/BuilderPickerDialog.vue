<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { Search } from '@element-plus/icons-vue'

import type { PickerItem } from '@/types/build'
import { formatSkillMap, formatSlotLevels } from '@/utils/mh-format'

const visible = defineModel<boolean>({ required: true })

const props = defineProps<{
  title: string
  items: PickerItem[]
  /** 可选的类型标签（如武器类型），为空时不展示标签过滤 */
  tags?: string[]
  /** 当前技能筛选名，仅用于提示文案 */
  skillFilter?: string
}>()

const emit = defineEmits<{
  select: [index: number]
}>()

const PAGE_SIZE = 60

const keyword = shallowRef('')
const activeTag = shallowRef('')
const visibleCount = shallowRef(PAGE_SIZE)

const filteredItems = computed(() => {
  const text = keyword.value.trim().toLowerCase()
  const tag = activeTag.value

  return props.items.filter((item) => {
    if (tag && item.tag !== tag) return false
    if (!text) return true

    return item.title.toLowerCase().includes(text) || item.tag.toLowerCase().includes(text)
  })
})

const visibleItems = computed(() => filteredItems.value.slice(0, visibleCount.value))
const hasMore = computed(() => filteredItems.value.length > visibleItems.value.length)

watch([keyword, activeTag, () => props.items], () => {
  visibleCount.value = PAGE_SIZE
})

watch(visible, (open) => {
  if (!open) return
  keyword.value = ''
  activeTag.value = ''
  visibleCount.value = PAGE_SIZE
})

function choose(item: PickerItem): void {
  emit('select', item.index)
  visible.value = false
}
</script>

<template>
  <el-dialog v-model="visible" :title="title" width="760px" append-to-body destroy-on-close>
    <div class="picker">
      <div class="picker__filters">
        <el-input
          v-model="keyword"
          class="picker__search"
          :prefix-icon="Search"
          clearable
          placeholder="搜索装备名称"
        />
        <el-radio-group v-if="tags && tags.length" v-model="activeTag" size="small">
          <el-radio-button value="">全部</el-radio-button>
          <el-radio-button v-for="tag in tags" :key="tag" :value="tag">{{ tag }}</el-radio-button>
        </el-radio-group>
      </div>

      <p class="picker__summary">
        共 {{ filteredItems.length }} 件
        <template v-if="skillFilter">，已按技能「{{ skillFilter }}」筛选</template>
      </p>

      <el-scrollbar v-if="filteredItems.length" height="52vh">
        <ul class="picker__list">
          <li
            v-for="item in visibleItems"
            :key="`${item.tag}-${item.index}`"
            class="picker__item"
            @click="choose(item)"
          >
            <div class="picker__item-main">
              <span class="picker__item-title">{{ item.title }}</span>
              <el-tag v-if="item.tag" size="small" effect="plain">{{ item.tag }}</el-tag>
              <span v-if="item.defense !== null" class="picker__item-defense">
                DEF {{ item.defense }}
              </span>
            </div>
            <div class="picker__item-meta">
              <span class="picker__item-slots">{{ formatSlotLevels(item.slots) }}</span>
              <span class="picker__item-skills">{{ formatSkillMap(item.skills) }}</span>
            </div>
          </li>
        </ul>
      </el-scrollbar>
      <el-empty v-else description="没有匹配的装备" :image-size="80" />

      <div v-if="hasMore" class="picker__more">
        <el-button text @click="visibleCount += PAGE_SIZE">
          显示更多（剩余 {{ filteredItems.length - visibleItems.length }} 件）
        </el-button>
      </div>
    </div>
  </el-dialog>
</template>

<style scoped lang="scss">
.picker {
  &__filters {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
  }

  &__search {
    max-width: 320px;
  }

  &__summary {
    margin: $spacing-sm 0;
    color: $color-text-secondary;
    font-size: 12px;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__item {
    padding: $spacing-sm $spacing-md;
    border: 1px solid transparent;
    border-radius: $radius-sm;
    cursor: pointer;
    transition:
      background-color 0.15s ease,
      border-color 0.15s ease;

    &:hover {
      border-color: rgba(64, 158, 255, 0.4);
      background: rgba(64, 158, 255, 0.06);
    }
  }

  &__item-main {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
  }

  &__item-title {
    color: $color-text-primary;
    font-size: 14px;
    font-weight: 600;
  }

  &__item-defense {
    color: $color-text-secondary;
    font-size: 12px;
  }

  &__item-meta {
    display: flex;
    gap: $spacing-md;
    margin-top: 2px;
    color: $color-text-secondary;
    font-size: 12px;
  }

  &__item-slots {
    flex: none;
    color: $color-primary;
  }

  &__item-skills {
    @include text-ellipsis;
  }

  &__more {
    padding-top: $spacing-sm;
    text-align: center;
  }
}
</style>
