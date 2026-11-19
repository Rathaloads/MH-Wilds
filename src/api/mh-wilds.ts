import type { MhWildsData } from '@/types/mh-wilds'

/**
 * 本地数据文件地址（`public/mh-wilds.json`），随 `base` 配置适配子路径部署。
 *
 * 数据统一从该 JSON 读取：由 `pnpm sync:data` 从 wilds.mhdb.io 拉取全部数据后生成，
 * 项目运行时不直接访问线上 API（只在同步脚本中通过适配器拉取）。
 */
export const MH_WILDS_DATA_URL = `${import.meta.env.BASE_URL}mh-wilds.json`

let dataPromise: Promise<MhWildsData> | null = null

/** 加载本地数据（带内存缓存：并发调用只请求一次，失败自动清空缓存） */
export function loadMhWildsData(): Promise<MhWildsData> {
  if (!dataPromise) {
    dataPromise = fetchLocalData().catch((error: unknown) => {
      dataPromise = null
      throw error
    })
  }

  return dataPromise
}

/** 清空数据缓存（用于强制重新读取 JSON） */
export function clearMhWildsDataCache(): void {
  dataPromise = null
}

async function fetchLocalData(): Promise<MhWildsData> {
  const response = await fetch(MH_WILDS_DATA_URL)

  if (!response.ok) {
    throw new Error(`加载 mh-wilds.json 失败：HTTP ${response.status} ${response.statusText}`)
  }

  return (await response.json()) as MhWildsData
}
