import { shallowRef } from 'vue'
import { defineStore } from 'pinia'

import { cloneSelection } from '@/composables/useLoadout'
import type { LoadoutSelection } from '@/types/build'
import type { DataSource } from '@/types/data-source'

export interface LoadoutDraft {
  selection: LoadoutSelection
  /** 生成该配装时使用的数据源 */
  source: DataSource
}

/**
 * 自动配装结果的一次性交接：首页生成配装后，配装器页面读取并继续微调。
 *
 * 不同数据源的装备下标不通用，因此同时记录来源，配装器只在数据源一致时应用。
 */
export const useLoadoutDraftStore = defineStore('loadout-draft', () => {
  const pending = shallowRef<LoadoutDraft | null>(null)

  function setPending(selection: LoadoutSelection, source: DataSource): void {
    pending.value = { selection: cloneSelection(selection), source }
  }

  /** 取出并清空待接手的配装（只交接一次） */
  function consume(): LoadoutDraft | null {
    const draft = pending.value
    pending.value = null
    return draft
  }

  return { pending, setPending, consume }
})
