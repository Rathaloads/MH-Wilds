import { loadMhdbWildsData } from './mhdb-wilds'
import type { DataSource } from '@/types/data-source'
import type { MhWildsData } from '@/types/mh-wilds'

/**
 * 本地数据文件地址（`public/mh-wilds.json`），随 `base` 配置适配子路径部署。
 */
export const MH_WILDS_DATA_URL = `${import.meta.env.BASE_URL}mh-wilds.json`

let localDataPromise: Promise<MhWildsData> | null = null

/**
 * 按数据源加载配装数据：
 * - `local`：项目内置 JSON（带内存缓存）
 * - `online`：wilds.mhdb.io API 实时数据（由适配器转换为相同模型）
 */
export function loadMhWildsData(source: DataSource = 'local'): Promise<MhWildsData> {
  if (source === 'online') return loadMhdbWildsData()

  if (!localDataPromise) {
    localDataPromise = fetchLocalData().catch((error: unknown) => {
      localDataPromise = null
      throw error
    })
  }

  return localDataPromise
}

/** 清空本地数据缓存（在线数据由 useMhWildsData 的按数据源缓存管理） */
export function clearMhWildsDataCache(): void {
  localDataPromise = null
}

async function fetchLocalData(): Promise<MhWildsData> {
  const response = await fetch(MH_WILDS_DATA_URL)

  if (!response.ok) {
    throw new Error(`加载 mh-wilds.json 失败：HTTP ${response.status} ${response.statusText}`)
  }

  return (await response.json()) as MhWildsData
}
