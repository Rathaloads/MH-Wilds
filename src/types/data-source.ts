/** 配装数据来源 */
export type DataSource = 'local' | 'online'

/** 数据源展示信息 */
export const DATA_SOURCE_META: Record<DataSource, { label: string; description: string }> = {
  local: {
    label: '本地数据',
    description: '使用项目内置的 public/mh-wilds.json（v1.020.00）',
  },
  online: {
    label: '在线数据',
    description: '通过 wilds.mhdb.io API 实时获取（首次加载需要数秒）',
  },
}

/** 校验数据源取值 */
export function isDataSource(value: unknown): value is DataSource {
  return value === 'local' || value === 'online'
}
