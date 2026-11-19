import { shallowRef } from 'vue'
import { defineStore } from 'pinia'

import { cloneSelection } from '@/composables/useLoadout'
import type { EquipmentSnapshot, LoadoutSelection } from '@/types/build'

export interface LoadoutDraft {
  selection: LoadoutSelection
  /** 装备名称快照：数据文件更新导致下标变化时按名称还原 */
  members?: EquipmentSnapshot
}

/**
 * 自动配装结果的一次性交接：首页生成配装后，配装器页面读取并继续微调。
 *
 * 记录装备名称快照，重新同步数据（数组顺序 / 内容变化）后仍能按名称还原装备。
 */
export const useLoadoutDraftStore = defineStore('loadout-draft', () => {
  const pending = shallowRef<LoadoutDraft | null>(null)

  function setPending(selection: LoadoutSelection, members?: EquipmentSnapshot): void {
    pending.value = { selection: cloneSelection(selection), members }
  }

  /** 取出并清空待接手的配装（只交接一次） */
  function consume(): LoadoutDraft | null {
    const draft = pending.value
    pending.value = null
    return draft
  }

  return { pending, setPending, consume }
})
