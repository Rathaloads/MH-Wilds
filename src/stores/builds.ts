import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

import { cloneSelection, createEmptySelection } from '@/composables/useLoadout'
import type { LoadoutSelection, SavedBuild } from '@/types/build'
import type { DataSource } from '@/types/data-source'

const STORAGE_KEY = 'mh-wilds:builds:v1'

function createBuildId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `build-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** 从 localStorage 读取已保存配装，容错处理损坏数据 */
function readStoredBuilds(): SavedBuild[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed.filter(isSavedBuild)
  } catch {
    return []
  }
}

function isSavedBuild(value: unknown): value is SavedBuild {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Partial<SavedBuild>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.createdAt === 'number' &&
    !!candidate.selection &&
    typeof candidate.selection === 'object'
  )
}

/**
 * 已保存配装仓库（localStorage 持久化）。
 *
 * 保存时深拷贝选择数据，避免页面后续操作影响存档。
 */
export const useBuildsStore = defineStore('builds', () => {
  const builds = ref<SavedBuild[]>(readStoredBuilds())

  const sortedBuilds = computed(() =>
    [...builds.value].sort((left, right) => right.createdAt - left.createdAt),
  )

  watch(
    builds,
    (value) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
      } catch {
        // 存储不可用（隐私模式 / 配额满）时静默失败
      }
    },
    { deep: true },
  )

  function saveBuild(
    name: string,
    selection: LoadoutSelection,
    dataSource: DataSource = 'local',
  ): SavedBuild {
    const build: SavedBuild = {
      id: createBuildId(),
      name: name.trim() || '未命名配装',
      createdAt: Date.now(),
      selection: cloneSelection(selection),
      dataSource,
    }

    builds.value = [build, ...builds.value]
    return build
  }

  function removeBuild(id: string): void {
    builds.value = builds.value.filter((build) => build.id !== id)
  }

  function getBuild(id: string): SavedBuild | undefined {
    return builds.value.find((build) => build.id === id)
  }

  return { builds, sortedBuilds, saveBuild, removeBuild, getBuild }
})

export { createEmptySelection }
