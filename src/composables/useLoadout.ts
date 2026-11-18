import { computed, reactive, readonly, watch } from 'vue'
import type { Ref } from 'vue'

import {
  ARMOR_PART_META,
  type DecorationOption,
  type LoadoutSelection,
  type LoadoutSummary,
  type SkillSummaryItem,
  type SlotDescriptor,
} from '@/types/build'
import type {
  ArmorPart,
  MhArmor,
  MhDecoration,
  MhSkill,
  MhTalisman,
  MhWeapon,
  MhWildsData,
} from '@/types/mh-wilds'
import {
  buildSkillSummaries,
  calcGroupBonuses,
  calcSeriesBonuses,
  collectEquipmentSkillLevels,
  decorationDomainForSlot,
  decorationFitsSlot,
} from '@/utils/loadout-calc'

/** 新建空配装 */
export function createEmptySelection(): LoadoutSelection {
  return {
    weaponIndex: null,
    armorIndices: { head: null, chest: null, arms: null, waist: null, legs: null },
    talismanIndex: null,
    decorationIndices: {},
  }
}

/** 深拷贝配装选择，隔离外部修改 */
export function cloneSelection(selection: LoadoutSelection): LoadoutSelection {
  return {
    weaponIndex: selection.weaponIndex,
    armorIndices: { ...selection.armorIndices },
    talismanIndex: selection.talismanIndex,
    decorationIndices: { ...selection.decorationIndices },
  }
}

/** 按下标取数组元素，越界 / 空下标返回 null */
function pick<T>(list: readonly T[] | undefined, index: number | null): T | null {
  if (!list || index === null) return null
  return list[index] ?? null
}

/**
 * 配装计算核心：维护选择状态，派生出孔位、技能合计、系列 / 组技能与防御力。
 *
 * 所有状态修改都通过返回的 action，`selection` 只读暴露给视图。
 */
export function useLoadout(data: Ref<MhWildsData | null>) {
  const selection = reactive<LoadoutSelection>(createEmptySelection())

  const skillByName = computed(() => {
    const map = new Map<string, MhSkill>()
    for (const skill of data.value?.skills ?? []) map.set(skill.name, skill)
    return map
  })

  const decorationList = computed(() => data.value?.decorations ?? [])

  // ---------- 当前装备 ----------
  const weapon = computed<MhWeapon | null>(() =>
    pick<MhWeapon>(data.value?.weapons, selection.weaponIndex),
  )

  const armorPieces = computed<Record<ArmorPart, MhArmor | null>>(() => {
    const result = {} as Record<ArmorPart, MhArmor | null>
    for (const meta of ARMOR_PART_META) {
      result[meta.part] = pick<MhArmor>(
        data.value?.armors[meta.part],
        selection.armorIndices[meta.part],
      )
    }
    return result
  })

  const talisman = computed<MhTalisman | null>(() =>
    pick<MhTalisman>(data.value?.talismans, selection.talismanIndex),
  )

  // ---------- 孔位 ----------
  const slots = computed<SlotDescriptor[]>(() => {
    const result: SlotDescriptor[] = []

    weapon.value?.slots.forEach((level, index) => {
      result.push({ id: `weapon:${index}`, owner: 'weapon', part: null, level })
    })

    for (const meta of ARMOR_PART_META) {
      armorPieces.value[meta.part]?.slots.forEach((level, index) => {
        result.push({ id: `${meta.part}:${index}`, owner: 'armor', part: meta.part, level })
      })
    }

    talisman.value?.slots.forEach((level, index) => {
      result.push({ id: `talisman:${index}`, owner: 'talisman', part: null, level })
    })

    return result
  })

  /** 有效镶嵌：槽位 id → 装饰品下标 */
  const decorationIndexBySlot = computed<Record<string, number>>(() => {
    const slotById = new Map(slots.value.map((slot) => [slot.id, slot]))
    const result: Record<string, number> = {}

    for (const [slotId, decorationIndex] of Object.entries(selection.decorationIndices)) {
      const slot = slotById.get(slotId)
      const decoration = pick(decorationList.value, decorationIndex)
      if (slot && decoration && decorationFitsSlot(decoration, slot)) {
        result[slotId] = decorationIndex
      }
    }

    return result
  })

  /** 有效镶嵌：槽位 id → 装饰品 */
  const decorationBySlot = computed<Map<string, MhDecoration>>(() => {
    const result = new Map<string, MhDecoration>()

    for (const [slotId, decorationIndex] of Object.entries(decorationIndexBySlot.value)) {
      const decoration = pick(decorationList.value, decorationIndex)
      if (decoration) result.set(slotId, decoration)
    }

    return result
  })

  /** 每个孔位可选的装饰品 */
  const decorationOptionsBySlot = computed<Record<string, DecorationOption[]>>(() => {
    const result: Record<string, DecorationOption[]> = {}

    for (const slot of slots.value) {
      const domain = decorationDomainForSlot(slot.owner)
      const options: DecorationOption[] = []

      decorationList.value.forEach((decoration, index) => {
        if (decoration.type === domain && decoration.slot <= slot.level) {
          options.push({
            index,
            name: decoration.name,
            slot: decoration.slot,
            skills: decoration.skills,
          })
        }
      })

      result[slot.id] = options
    }

    return result
  })

  // 装备变化后清理不再匹配的镶嵌
  watch(slots, () => {
    for (const [slotId, decorationIndex] of Object.entries(selection.decorationIndices)) {
      const slot = slots.value.find((item) => item.id === slotId)
      const decoration = pick(decorationList.value, decorationIndex)
      if (!slot || !decoration || !decorationFitsSlot(decoration, slot)) {
        delete selection.decorationIndices[slotId]
      }
    }
  })

  // ---------- 技能合计 ----------
  const armorList = computed(() => ARMOR_PART_META.map((meta) => armorPieces.value[meta.part]))

  const seriesBonuses = computed(() => calcSeriesBonuses(armorList.value))
  const groupBonuses = computed(() => calcGroupBonuses(armorList.value))

  const equipmentSkillLevels = computed(() =>
    collectEquipmentSkillLevels({
      weapon: weapon.value,
      armors: armorList.value,
      talisman: talisman.value,
      decorations: [...decorationBySlot.value.values()],
    }),
  )

  const summarySkills = computed<SkillSummaryItem[]>(() =>
    buildSkillSummaries(
      equipmentSkillLevels.value,
      seriesBonuses.value,
      groupBonuses.value,
      skillByName.value,
    ),
  )

  const defense = computed(() =>
    ARMOR_PART_META.reduce(
      (total, meta) => total + (armorPieces.value[meta.part]?.defense ?? 0),
      0,
    ),
  )

  const summary = computed<LoadoutSummary>(() => ({
    weaponName: weapon.value?.name ?? '',
    weaponAttack: weapon.value?.attack ?? 0,
    defenseBreakdown: ARMOR_PART_META.map((meta) => {
      const armor = armorPieces.value[meta.part]
      return {
        part: meta.part,
        label: meta.label,
        name: armor?.name ?? '',
        defense: armor?.defense ?? null,
      }
    }),
    skills: summarySkills.value,
    series: seriesBonuses.value,
    groups: groupBonuses.value,
    defense: defense.value,
    totalSlots: slots.value.length,
    usedSlots: decorationBySlot.value.size,
  }))

  // ---------- actions ----------
  function selectWeapon(index: number | null): void {
    selection.weaponIndex = index
  }

  function selectArmor(part: ArmorPart, index: number | null): void {
    selection.armorIndices[part] = index
  }

  function selectTalisman(index: number | null): void {
    selection.talismanIndex = index
  }

  function setDecoration(slotId: string, decorationIndex: number | null): void {
    if (decorationIndex === null) {
      delete selection.decorationIndices[slotId]
      return
    }
    selection.decorationIndices[slotId] = decorationIndex
  }

  function reset(): void {
    selection.weaponIndex = null
    selection.talismanIndex = null
    for (const meta of ARMOR_PART_META) selection.armorIndices[meta.part] = null
    for (const slotId of Object.keys(selection.decorationIndices))
      delete selection.decorationIndices[slotId]
  }

  function applySelection(next: LoadoutSelection): void {
    const copy = cloneSelection(next)
    selection.weaponIndex = copy.weaponIndex
    selection.talismanIndex = copy.talismanIndex
    for (const meta of ARMOR_PART_META)
      selection.armorIndices[meta.part] = copy.armorIndices[meta.part] ?? null
    for (const slotId of Object.keys(selection.decorationIndices))
      delete selection.decorationIndices[slotId]
    Object.assign(selection.decorationIndices, copy.decorationIndices)
  }

  function getSelection(): LoadoutSelection {
    return cloneSelection(selection)
  }

  return {
    selection: readonly(selection),
    weapon,
    armorPieces,
    talisman,
    slots,
    decorationIndexBySlot,
    decorationBySlot,
    decorationOptionsBySlot,
    summary,
    selectWeapon,
    selectArmor,
    selectTalisman,
    setDecoration,
    reset,
    applySelection,
    getSelection,
  }
}
