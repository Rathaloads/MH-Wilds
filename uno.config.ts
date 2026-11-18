import {
  defineConfig,
  presetAttributify,
  presetWind3,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'

export default defineConfig({
  presets: [
    // Tailwind / Windi 兼容的工具类预设
    presetWind3(),
    // 支持 <div flex items-center /> 属性化写法
    presetAttributify(),
  ],

  transformers: [
    // 允许在 <style> 中使用 @apply / @screen
    transformerDirectives(),
    // 支持 hover:(bg-primary text-white) 变体分组
    transformerVariantGroup(),
  ],

  theme: {
    colors: {
      primary: '#409eff',
      success: '#67c23a',
      warning: '#e6a23c',
      danger: '#f56c6c',
      info: '#909399',
    },
  },

  shortcuts: {
    'flex-center': 'flex items-center justify-center',
    'flex-between': 'flex items-center justify-between',
    'page-container': 'mx-auto w-full max-w-[1200px] px-4',
    'card-panel': 'rounded-lg bg-white p-5 shadow-sm',
  },

  // 动态拼接的类名需要在此登记，避免被摇树优化掉
  safelist: [],
})
