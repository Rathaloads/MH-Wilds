#!/usr/bin/env node
/**
 * 将在线数据同步为本地快照：从 wilds.mhdb.io 拉取数据并覆盖 `public/mh-wilds.json`。
 *
 * 用法：pnpm sync:data
 *
 * 说明：
 * - 复用 `src/api/mhdb-wilds.ts` 的在线适配器（唯一映射实现），保证本地快照与在线数据源
 *   字段完全一致（含武器 rarity、防具 rank 等上下位信息）；
 * - 生成的文件即本地数据源（`DataSource = 'local'`）运行时读取的静态 JSON，
 *   构建时会原样复制到 `dist/mh-wilds.json`；
 * - 需要能访问 https://wilds.mhdb.io 。
 */
import { mkdir, rename, stat, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createServer } from 'vite'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = resolve(root, 'public/mh-wilds.json')
const tempPath = `${outputPath}.tmp`

function fail(message) {
  console.error(`\n✖ ${message}`)
  process.exitCode = 1
}

function collectArmors(data) {
  return Object.values(data.armors ?? {}).flatMap((list) => (Array.isArray(list) ? list : []))
}

function countBy(list, getKey) {
  const counts = new Map()
  for (const item of list) {
    const key = getKey(item)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

function formatCounts(counts) {
  return [...counts.entries()].map(([key, value]) => `${key}:${value}`).join(' ')
}

/** 生成前校验：数据必须完整且包含上下位所需字段，避免用坏数据覆盖本地快照 */
function validate(data) {
  const problems = []
  const armors = collectArmors(data)

  if (!data || typeof data !== 'object') return ['返回数据不是对象']
  if (!Array.isArray(data.weapons) || !data.weapons.length) problems.push('武器数据为空')
  if (!Array.isArray(data.skills) || !data.skills.length) problems.push('技能数据为空')
  if (!Array.isArray(data.decorations) || !data.decorations.length) problems.push('装饰品数据为空')
  if (!Array.isArray(data.talismans) || !data.talismans.length) problems.push('护石数据为空')
  if (!armors.length) problems.push('防具数据为空')
  if (!Array.isArray(data.weaponTypes) || data.weaponTypes.length !== 14) {
    problems.push(`武器类型数量异常：${data.weaponTypes?.length ?? 0}（期望 14）`)
  }
  if (!data.version) problems.push('缺少数据版本（/version 响应异常）')

  const countPairs = [
    ['weapons', data.weapons?.length],
    ['skills', data.skills?.length],
    ['decorations', data.decorations?.length],
    ['armors', armors.length],
    ['talismans', data.talismans?.length],
  ]
  for (const [key, actual] of countPairs) {
    if (data.counts?.[key] !== actual) {
      problems.push(`counts.${key} 与实际数量不一致：${data.counts?.[key]} / ${actual}`)
    }
  }

  const invalidWeapons = (data.weapons ?? []).filter(
    (weapon) =>
      !Number.isInteger(weapon.rarity) ||
      weapon.rarity < 1 ||
      weapon.rarity > 8 ||
      !Number.isFinite(weapon.attack) ||
      weapon.attack <= 0,
  )
  if (invalidWeapons.length) {
    const names = invalidWeapons
      .slice(0, 3)
      .map((weapon) => weapon.name)
      .join('、')
    problems.push(`${invalidWeapons.length} 把武器缺少合法 rarity（1-8）或攻击力，例如：${names}`)
  }

  const invalidArmors = armors.filter((armor) => armor.rank !== 'low' && armor.rank !== 'high')
  if (invalidArmors.length) {
    const names = invalidArmors
      .slice(0, 3)
      .map((armor) => armor.name)
      .join('、')
    problems.push(`${invalidArmors.length} 件防具缺少上下位标记（low / high），例如：${names}`)
  }

  if ((data.weapons ?? []).length < 1000) {
    console.warn(`⚠ 武器数量偏少（${data.weapons.length}），请确认在线数据是否完整`)
  }

  return problems
}

async function loadOnlineData() {
  // 通过 Vite 的 SSR 模块加载器直接运行 TS 适配器，复用唯一映射实现
  const server = await createServer({
    root,
    logLevel: 'error',
    appType: 'custom',
    server: { middlewareMode: true },
  })

  try {
    const { loadMhdbWildsData } = await server.ssrLoadModule('/src/api/mhdb-wilds.ts')
    return await loadMhdbWildsData()
  } finally {
    await server.close()
  }
}

async function main() {
  const startedAt = Date.now()
  console.log('▶ 正在从 https://wilds.mhdb.io/zh-Hans 拉取在线数据…')

  let data
  try {
    data = await loadOnlineData()
  } catch (cause) {
    fail(
      `拉取在线数据失败：${cause instanceof Error ? cause.message : String(cause)}\n  请检查网络后重试（需要能访问 wilds.mhdb.io）`,
    )
    return
  }

  const problems = validate(data)
  if (problems.length) {
    fail(`在线数据校验未通过，已保留旧文件：\n  - ${problems.join('\n  - ')}`)
    return
  }

  // 快照元信息：version 保留在线数据版本，generatedAt 记录本次同步时间
  data.source = 'https://wilds.mhdb.io/zh-Hans（本地快照，pnpm sync:data 生成）'
  data.generatedAt = new Date().toISOString()

  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(tempPath, `${JSON.stringify(data)}\n`, 'utf8')
  await rename(tempPath, outputPath)

  const armors = collectArmors(data)
  const weaponsLow = data.weapons.filter((weapon) => weapon.rarity <= 4).length
  const weaponsHigh = data.weapons.length - weaponsLow
  const armorRankCounts = countBy(armors, (armor) => armor.rank)
  const fileStat = await stat(outputPath)

  console.log(`✔ 已写入 ${outputPath}`)
  console.log(
    `  数据版本 ${data.version} · 同步时间 ${data.generatedAt} · 用时 ${Date.now() - startedAt}ms`,
  )
  console.log(
    `  规模：武器 ${data.weapons.length} / 技能 ${data.skills.length} / 防具 ${armors.length} / 装饰品 ${data.decorations.length} / 护石 ${data.talismans.length}`,
  )
  console.log(`  武器上下位：下位 rarity≤4 ${weaponsLow} 把，上位 rarity≥5 ${weaponsHigh} 把`)
  console.log(
    `  武器攻击力：${Math.min(...data.weapons.map((weapon) => weapon.attack))}–${Math.max(...data.weapons.map((weapon) => weapon.attack))}`,
  )
  console.log(`  防具上下位：${formatCounts(armorRankCounts)}`)
  console.log(`  文件大小：${(fileStat.size / 1024).toFixed(1)} KB`)
}

await main()
