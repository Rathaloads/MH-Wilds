import { shallowRef } from 'vue'

import { loadMhWildsData } from '@/api/mh-wilds'
import type { MhWildsData } from '@/types/mh-wilds'

const data = shallowRef<MhWildsData | null>(null)
const loading = shallowRef(false)
const error = shallowRef<string | null>(null)

let latestRequest = 0

/**
 * 配装数据加载：统一读取本地快照 JSON（`public/mh-wilds.json`，由 `pnpm sync:data`
 * 从 wilds.mhdb.io 同步生成），运行时不再区分在线 / 本地数据源。
 *
 * 数据在模块级共享，页面间切换不会重复请求；`load()` 可重试。
 */
export function useMhWildsData() {
  async function load(): Promise<MhWildsData | null> {
    if (data.value) return data.value

    const token = ++latestRequest
    loading.value = true
    error.value = null

    try {
      const result = await loadMhWildsData()
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

  return { data, loading, error, load }
}
