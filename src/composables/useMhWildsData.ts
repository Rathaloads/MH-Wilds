import { computed, shallowRef, watch } from 'vue'

import { loadMhWildsData } from '@/api/mh-wilds'
import { useDataSourceStore } from '@/stores/data-source'
import type { DataSource } from '@/types/data-source'
import type { MhWildsData } from '@/types/mh-wilds'

/** 按数据源缓存已加载的数据（本地 / 在线各一份，进程内有效） */
const cache = new Map<DataSource, MhWildsData>()
const data = shallowRef<MhWildsData | null>(null)
const loading = shallowRef(false)
const error = shallowRef<string | null>(null)

let latestRequest = 0

/**
 * 配装数据加载（支持本地 / 在线数据源）。
 *
 * - 首次加载后按数据源内存缓存；切换数据源时优先使用缓存并后台刷新缺失数据；
 * - 通过请求令牌避免快速切换数据源时旧响应覆盖新数据；
 * - `load()` 可强制重试。
 */
export function useMhWildsData() {
  const dataSource = useDataSourceStore()
  const source = computed(() => dataSource.source)

  async function load(
    target: DataSource = source.value,
    force = false,
  ): Promise<MhWildsData | null> {
    const cached = cache.get(target)

    if (cached && !force) {
      data.value = cached
      error.value = null
      return cached
    }

    const token = ++latestRequest
    loading.value = true
    error.value = null

    try {
      const result = await loadMhWildsData(target)
      cache.set(target, result)

      if (token === latestRequest) data.value = result
      return result
    } catch (cause) {
      if (token === latestRequest) {
        error.value = cause instanceof Error ? cause.message : String(cause)
        data.value = null
      }
      return null
    } finally {
      if (token === latestRequest) loading.value = false
    }
  }

  // 数据源变化：立即清空旧数据，并加载目标数据源
  watch(source, (next) => {
    data.value = cache.get(next) ?? null
    void load(next)
  })

  return {
    data,
    loading,
    error,
    source,
    load: () => load(source.value),
    selectSource: dataSource.setSource,
  }
}
