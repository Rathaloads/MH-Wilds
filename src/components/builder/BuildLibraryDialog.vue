<script setup lang="ts">
import { shallowRef, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

import { useBuildsStore } from '@/stores/builds'
import type { LoadoutSelection, SavedBuild } from '@/types/build'
import { DATA_SOURCE_META, type DataSource } from '@/types/data-source'
import { formatBuildTime } from '@/utils/mh-format'

const visible = defineModel<boolean>({ required: true })

const props = defineProps<{
  /** 当前配装快照，用于保存 */
  selection: LoadoutSelection
  /** 当前数据源，用于标记 / 校验存档 */
  source: DataSource
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

  buildsStore.saveBuild(trimmed, props.selection, props.source)
  name.value = ''
  ElMessage.success('配装已保存')
}

/** 旧存档没有记录数据源，按本地数据源处理 */
function buildSourceOf(build: SavedBuild): DataSource {
  return build.dataSource ?? 'local'
}

function load(build: SavedBuild): void {
  emit('load', build.selection)
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

      <ul v-if="buildsStore.sortedBuilds.length" class="library__list">
        <li v-for="build in buildsStore.sortedBuilds" :key="build.id" class="library__item">
          <div class="library__info">
            <span class="library__name">{{ build.name }}</span>
            <span class="library__time">
              <el-tag
                size="small"
                effect="plain"
                :type="buildSourceOf(build) === source ? 'success' : 'info'"
              >
                {{ DATA_SOURCE_META[buildSourceOf(build)].label }}
              </el-tag>
              {{ formatBuildTime(build.createdAt) }}
            </span>
          </div>
          <div class="library__actions">
            <el-button
              size="small"
              text
              type="primary"
              :disabled="buildSourceOf(build) !== source"
              :title="
                buildSourceOf(build) !== source ? '该配装保存于另一种数据源，请先切换数据源' : ''
              "
              @click="load(build)"
            >
              读取
            </el-button>
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
