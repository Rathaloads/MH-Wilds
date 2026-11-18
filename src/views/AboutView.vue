<script setup lang="ts">
const versions = [
  { name: 'Vue', version: '3.5.x', note: '组合式 API（script setup）' },
  { name: 'Vite', version: '8.3.x', note: '开发服务器 / 构建工具' },
  { name: 'TypeScript', version: '6.0.x', note: 'vue-tsc 全量类型检查' },
  { name: 'Element Plus', version: '2.14.x', note: '全量引入 + 中文语言包' },
  { name: 'UnoCSS', version: '66.13.x', note: 'presetWind3 + 变体分组' },
  { name: 'SCSS', version: '1.108.x', note: '变量 / 混入 / 嵌套' },
  { name: 'Vue Router', version: '5.5.x', note: '路由懒加载 + meta.title' },
  { name: 'Pinia', version: '4.1.x', note: 'setup store 写法' },
  { name: 'Prettier', version: '3.10.x', note: '统一代码格式' },
]

const scripts = [
  {
    name: 'dev',
    command: 'pnpm dev',
    description: '启动开发服务器（默认 http://localhost:5173）',
  },
  { name: 'build', command: 'pnpm build', description: 'vue-tsc 类型检查 + 生产构建' },
  { name: 'preview', command: 'pnpm preview', description: '本地预览构建产物' },
  { name: 'type-check', command: 'pnpm type-check', description: '仅执行类型检查' },
  { name: 'format', command: 'pnpm format', description: 'Prettier 格式化全部文件' },
  { name: 'format:check', command: 'pnpm format:check', description: '仅校验格式（适合 CI）' },
]

const structure = [
  { path: 'src/views', description: '页面级组件' },
  { path: 'src/router', description: '路由表与页面标题同步' },
  { path: 'src/stores', description: 'Pinia 状态仓库' },
  { path: 'src/styles', description: 'SCSS 变量、混入与全局样式' },
  { path: 'src/types', description: '全局类型声明（.d.ts）' },
  { path: 'vite.config.ts', description: 'Vite 插件与路径别名配置' },
  { path: 'uno.config.ts', description: 'UnoCSS 预设、快捷类与主题' },
]
</script>

<template>
  <section class="page-container py-10">
    <h1 class="page-title">关于项目</h1>
    <p class="page-desc">技术栈与常用命令一览，更多配置说明见仓库根目录 README.md。</p>

    <el-card shadow="never" class="mt-6">
      <template #header>
        <span class="font-600">依赖与版本</span>
      </template>

      <el-descriptions :column="3" border>
        <el-descriptions-item v-for="item in versions" :key="item.name" :label="item.name">
          <div class="flex flex-col">
            <span class="font-500">{{ item.version }}</span>
            <span class="text-xs text-gray-400">{{ item.note }}</span>
          </div>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card shadow="never" class="mt-6">
      <template #header>
        <span class="font-600">常用命令</span>
      </template>

      <el-table :data="scripts" border stripe>
        <el-table-column prop="name" label="名称" width="150" />
        <el-table-column prop="command" label="命令" width="210" />
        <el-table-column prop="description" label="说明" />
      </el-table>
    </el-card>

    <el-card shadow="never" class="mt-6">
      <template #header>
        <span class="font-600">目录约定</span>
      </template>

      <el-table :data="structure" border>
        <el-table-column prop="path" label="路径" width="210" />
        <el-table-column prop="description" label="说明" />
      </el-table>
    </el-card>
  </section>
</template>

<style scoped lang="scss">
.page-title {
  color: $color-text-primary;
  font-size: 26px;
  font-weight: 700;

  @include respond-to('md') {
    font-size: 22px;
  }
}

.page-desc {
  margin-top: 6px;
  color: $color-text-secondary;
  font-size: 14px;
}
</style>
