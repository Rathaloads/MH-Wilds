<script setup lang="ts">
import { shallowRef, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

import { useBuildsStore } from '@/stores/builds'
import type { LoadoutSelection, SavedBuild } from '@/types/build'
import type { MhWildsData } from '@/types/mh-wilds'
import { captureEquipmentSnapshot, resolveEquipmentSnapshot } from '@/utils/loadout-snapshot'
import { formatBuildTime } from '@/utils/mh-format'

const visible = defineModel<boolean>({ required: true })

const props = defineProps<{
  /** 当前配装快照，用于保存 */
  selection: LoadoutSelection
  /** 当前数据，用于生成装备名称快照 / 读取时按名称还原 */
  data: MhWildsData | null
}>()

const emit = defineEmits<{
  load: [selection: LoadoutSelection]
}>()

const buildsStore = useBuildsStore()
const name = shallowRef('')

watch(visible, (open) => {
  if (open) name.value = ''
})

function save(): void {
  const trimmed = name.value.trim()

  if (!trimmed) {
    ElMessage.warning('请先输入配装名称')
    return
  }

  const members = props.data ? captureEquipmentSnapshot(props.data, props.selection) : undefined
  buildsStore.saveBuild(trimmed, props.selection, members)
  name.value = ''
  ElMessage.success('配装已保存')
}

/**
 * 读取配装：优先按装备名称还原（数据文件更新后下标变化仍可用）；
 * 旧存档没有名称快照时按下标读取。
 */
function load(build: SavedBuild): void {
  const data = props.data

  if (!data) {
    ElMessage.warning('数据加载中，请稍后重试')
    return
  }

  const resolved = build.members ? resolveEquipmentSnapshot(data, build.members) : null
  if (build.members && !resolved) {
    ElMessage.warning('该配装中的装备在当前数据中不存在（数据可能已更新），请重新配装')
    return
  }

  emit('load', resolved ?? build.selection)
  visible.value = false
}

async function remove(build: SavedBuild): Promise<void> {
  try {
    await ElMessageBox.confirm(`确定删除配装「${build.name}」吗？`, '删除配装', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    buildsStore.removeBuild(build.id)
    ElMessage.success('已删除')
  } catch {
    // 用户取消删除
  }
}
</script>

<template>
  <el-dialog v-model="visible" title="配装存档" width="640px" append-to-body destroy-on-close>
    <div class="library">
      <div class="library__save">
        <el-input
          v-model="name"
          maxlength="24"
          show-word-limit
          placeholder="给这套配装起个名字，例如「火属性大剑」"
          @keyup.enter="save"
        />
        <el-button type="primary" @click="save">保存当前配装</el-button>
      </div>

      <el-divider content-position="left"
        >已保存（{{ buildsStore.sortedBuilds.length }}）</el-divider
      >

      <p class="library__hint">
        读取时会按装备名称自动还原，数据文件更新后仍可读取；旧存档缺少名称快照时按下标读取。
      </p>

      <ul v-if="buildsStore.sortedBuilds.length" class="library__list">
        <li v-for="build in buildsStore.sortedBuilds" :key="build.id" class="library__item">
          <div class="library__info">
            <span class="library__name">{{ build.name }}</span>
            <span class="library__time">
              {{ formatBuildTime(build.createdAt) }}
            </span>
          </div>
          <div class="library__actions">
            <el-button size="small" text type="primary" @click="load(build)">读取</el-button>
            <el-button size="small" text type="danger" @click="remove(build)">删除</el-button>
          </div>
        </li>
      </ul>
      <el-empty v-else description="还没有保存过配装" :image-size="70" />
    </div>
  </el-dialog>
</template>

<style scoped lang="scss">
.library {
  &__save {
    display: flex;
    gap: $spacing-sm;
  }

  &__hint {
    margin: 0 0 $spacing-sm;
    color: $color-text-placeholder;
    font-size: 12px;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $spacing-md;
    padding: $spacing-sm $spacing-md;
    border: 1px solid $color-border-light;
    border-radius: $radius-sm;
  }

  &__info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  &__name {
    @include text-ellipsis;
    color: $color-text-primary;
    font-size: 13px;
    font-weight: 600;
  }

  &__time {
    display: flex;
    align-items: center;
    gap: 6px;
    color: $color-text-placeholder;
    font-size: 12px;
  }

  &__actions {
    flex: none;
  }
}
</style>
