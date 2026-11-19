import { ARMOR_PART_META, type EquipmentSnapshot, type LoadoutSelection } from '@/types/build'
import type { ArmorPart, MhWildsData } from '@/types/mh-wilds'

/**
 * 从当前配装选择生成装备名称快照。
 *
 * 用于数据重新同步（数组顺序 / 内容变化）后按名称还原配装：存档使用下标存储
 * （避免同名歧义），而不同数据快照的数组顺序可能不同，因此再额外保存一份名称快照。
 */
export function captureEquipmentSnapshot(
  data: MhWildsData,
  selection: LoadoutSelection,
): EquipmentSnapshot {
  const weapon =
    selection.weaponIndex === null ? null : (data.weapons[selection.weaponIndex]?.name ?? null)

  const armors = {} as Record<ArmorPart, string | null>
  for (const meta of ARMOR_PART_META) {
    const index = selection.armorIndices[meta.part]
    armors[meta.part] = index === null ? null : (data.armors[meta.part][index]?.name ?? null)
  }

  const talisman =
    selection.talismanIndex === null
      ? null
      : (data.talismans[selection.talismanIndex]?.name ?? null)

  const decorations: Record<string, string> = {}
  for (const [slotId, index] of Object.entries(selection.decorationIndices)) {
    const name = data.decorations[index]?.name
    if (name) decorations[slotId] = name
  }

  return { weapon, armors, talisman, decorations }
}

/** 按名称在当前数据中还原配装；任一装备找不到时返回 null（避免静默错配） */
export function resolveEquipmentSnapshot(
  data: MhWildsData,
  snapshot: EquipmentSnapshot,
): LoadoutSelection | null {
  const weaponIndex =
    snapshot.weapon === null
      ? null
      : data.weapons.findIndex((weapon) => weapon.name === snapshot.weapon)
  if (weaponIndex === -1) return null

  const armorIndices = {} as Record<ArmorPart, number | null>
  for (const meta of ARMOR_PART_META) {
    const name = snapshot.armors[meta.part] ?? null
    if (name === null) {
      armorIndices[meta.part] = null
      continue
    }

    const index = data.armors[meta.part].findIndex((armor) => armor.name === name)
    if (index === -1) return null
    armorIndices[meta.part] = index
  }

  const talismanIndex =
    snapshot.talisman === null
      ? null
      : data.talismans.findIndex((talisman) => talisman.name === snapshot.talisman)
  if (talismanIndex === -1) return null

  // 装饰品按名称还原；槽位在新装备上不存在时由 useLoadout 的自动清理逻辑去掉
  const decorationIndices: Record<string, number> = {}
  for (const [slotId, name] of Object.entries(snapshot.decorations)) {
    const index = data.decorations.findIndex((decoration) => decoration.name === name)
    if (index !== -1) decorationIndices[slotId] = index
  }

  return { weaponIndex, armorIndices, talismanIndex, decorationIndices }
}
