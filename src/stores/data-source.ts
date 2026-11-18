import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

import { isDataSource, type DataSource } from '@/types/data-source'

const STORAGE_KEY = 'mh-wilds:data-source'

function readStoredSource(): DataSource {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return isDataSource(raw) ? raw : 'local'
  } catch {
    return 'local'
  }
}

/**
 * 数据源偏好（本地 JSON / 在线 API），持久化到 localStorage。
 */
export const useDataSourceStore = defineStore('data-source', () => {
  const source = ref<DataSource>(readStoredSource())

  watch(source, (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      // 存储不可用时静默失败
    }
  })

  function setSource(value: DataSource): void {
    source.value = value
  }

  return { source, setSource }
})
